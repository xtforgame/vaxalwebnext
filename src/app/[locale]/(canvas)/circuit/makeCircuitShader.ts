/**
 * Unified fragment shader generator for circuit visualizations.
 * Supports two timing modes:
 *   - 'cyclic': looping animation with random delays (CircuitShader)
 *   - 'radial': one-shot radial expansion from center (CircuitRadialShader)
 */

export const circuitVertexShader = /* glsl */ `
void main() {
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export type CircuitMode = 'cyclic' | 'radial';

export interface CircuitShaderOptions {
  numSegments: number;
  numEndpoints: number;
  mode: CircuitMode;
  /** radial mode only */
  maxRadius?: number;
  /** radial mode only: [x, y] pattern centroid */
  center?: [number, number];
}

export function makeFragmentShader(opts: CircuitShaderOptions): string {
  const { numSegments, numEndpoints, mode } = opts;
  const isRadial = mode === 'radial';

  const modeDefines = isRadial
    ? `
// ── radial mode ──

// 放射展開速度 (normalized units / 秒)
// 調大：擴散更快 | 調小：擴散更慢
#define EXPANSION_SPEED 0.25

// 動畫完成後 smoothstep body 的亮度增量 (疊加在 IDLE_DIM 之上)
// 最終亮度 = IDLE_DIM + POST_DIM
// 範圍 0.3–2.0 | 調大：通電後更亮 | 調小：更接近 idle
#define POST_DIM       0.7

// trail 畫完後 drain 的持續時間 (秒)
// 範圍 0.5–3.0 | 調大：drain 更慢 | 調小：drain 更快
#define DRAIN_TIME     1.5

// 放射脈衝的最大半徑
#define MAX_RADIUS     ${opts.maxRadius!.toFixed(4)}

// 圖案重心 (放射原點)
#define CENTER         vec2(${opts.center![0].toFixed(4)}, ${opts.center![1].toFixed(4)})
`
    : `
// ── cyclic mode ──

// 拖尾畫完後到下一輪開始的等待時間 (秒)
// 範圍 0.5–5.0 | 調大：停頓更久 | 調小：循環更快
#define PAUSE        2.0

// drain 動畫佔 PAUSE 時間的比例
// 範圍 0.3–0.9 | 調大：drain 更慢（佔更多 PAUSE）| 調小：drain 更快，留更多空白
#define DRAIN_FRAC   0.65

// 起點端點在拖尾出發前的充能時間 (秒)
// 範圍 0.5–3.0 | 調大：起點充能更久才出發 | 調小：幾乎立刻出發
#define PRE_CHARGE   1.5
`;

  return /* glsl */ `
precision highp float;

uniform vec2 iResolution;
uniform float iTime;
uniform sampler2D uSegments;
uniform sampler2D uEndpoints;
${isRadial ? 'uniform float uShowPulse;' : ''}

#define NUM_SEGMENTS ${numSegments}
#define NUM_ENDPOINTS ${numEndpoints}

// ── common tuning ──

// 拖尾頭移動速度 (arc-length / 秒)
// 範圍 0.05–1.0 | 調大：動畫加快 | 調小：動畫放慢
#define SPEED          0.16

// 拖尾亮頭後方的指數衰減率
// 範圍 3.0–30.0 | 調大：尾巴更短更銳利 | 調小：尾巴更長更柔
#define TRAIL_DECAY    10.0

// 線段被點亮後的基礎亮度 (拖尾通過後的持續發光)
// 範圍 0.05–0.5 | 調大：點亮後更亮 | 調小：點亮後更暗
#define BASE_DIM       0.15

// 線段活動時的光暈寬度 (1/d 衰減)
// 範圍 0.001–0.01 | 調大：活動光暈更粗更亮 | 調小：更細更暗
#define GLOW_W         0.0025

// 端點圓環活動時的光暈寬度 (1/d 衰減)
// 範圍 0.001–0.01 | 調大：端點活動光暈更粗更亮 | 調小：更細更暗
#define EP_GLOW_W      0.003

// 終點端點開始充能的距離 (arc-length)
// 範圍 0.005–0.05 | 調大：拖尾離更遠就開始亮 | 調小：要非常接近才亮
#define EP_CHARGE_END  0.012

// 像素距離裁切閾值 (超過此距離直接跳過，優化效能)
// 範圍 0.05–0.3 | 調大：計算範圍更廣（更精確但更慢）| 調小：更快但光暈可能被截斷
#define DIST_CUTOFF    0.12

// 線段待機光暈的寬度 (smoothstep 柔邊，與亮度解耦)
// 範圍 0.001–0.01 | 調大：待機線條更粗 | 調小：更細
#define IDLE_W         0.004

// 線段和端點待機光暈的亮度
// 範圍 0.02–0.5 | 調大：待機更亮 | 調小：待機更暗
#define IDLE_DIM       0.3

// 端點圓環待機光暈的寬度 (smoothstep 柔邊)
// 範圍 0.002–0.015 | 調大：待機圓環更粗 | 調小：更細
#define EP_IDLE_W      0.004
${modeDefines}

vec2 sdSeg(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return vec2(length(pa - ba * h), h);
}

float sdRing(vec2 p, vec2 c, float r) {
  return abs(length(p - c) - r);
}

void main() {
  vec2 uv = (gl_FragCoord.xy * 2.0 - iResolution) / iResolution.y;

  float baseTotal = 0.0;
  float headTotal = 0.0;
  float invSeg = 1.0 / float(NUM_SEGMENTS);

  // ── segments ──
  for (int i = 0; i < NUM_SEGMENTS; i++) {
    float tu = (float(i) + 0.5) * invSeg;

    vec4 geo  = texture2D(uSegments, vec2(tu, 0.25));
    vec4 anim = texture2D(uSegments, vec2(tu, 0.75));

    vec2 dp = sdSeg(uv, geo.xy, geo.zw);
    float d = dp.x;
    if (d > DIST_CUTOFF) continue;

    float arcAt    = mix(anim.x, anim.y, dp.y);
    float totalArc = anim.z;
    float drawTime = totalArc / SPEED;

    // ── timing ──
${isRadial ? `\
    float dist = anim.w;
    float activationTime = dist / EXPANSION_SPEED;
    float ct = iTime - activationTime;
    float activated = smoothstep(-0.1, 0.1, ct);
    float headPos = max(ct, 0.0) * SPEED;
` : `\
    float delay = anim.w;
    float cycleTime = PRE_CHARGE + drawTime + PAUSE;
    float ct = mod(iTime + delay, cycleTime);
    float activated = 1.0;
    float headPos = (ct - PRE_CHARGE) * SPEED;
`}

    float arcDist = headPos - arcAt;
    float reached = smoothstep(-0.02, 0.002, arcDist) * activated;

    // ── drain: energy sweeps start→end ──
${isRadial ? `\
    float afterDraw = max(max(ct, 0.0) - drawTime, 0.0);
    float drainSpeed = totalArc / DRAIN_TIME;
` : `\
    float afterDraw = max(ct - (PRE_CHARGE + drawTime), 0.0);
    float drainSpeed = totalArc / (PAUSE * DRAIN_FRAC);
`}
    float drainPos = afterDraw * drainSpeed;
    float fade = 1.0 - smoothstep(-0.04, 0.04, drainPos - arcAt);
    float drained = smoothstep(-0.04, 0.04, drainPos - arcAt);

    // ── bright moving head (only during draw phase) ──
    float headGlow = exp(-arcDist * arcDist * TRAIL_DECAY * TRAIL_DECAY * 4.0) * reached;
${isRadial ? `\
    headGlow *= step(max(ct, 0.0), drawTime + 0.01);
` : `\
    headGlow *= step(ct, PRE_CHARGE + drawTime + 0.01);
`}

    // ── trailing glow behind head — fades with drain, not hard cutoff ──
    float trailBehind = exp(-max(arcDist, 0.0) * TRAIL_DECAY) * step(0.0, arcDist) * activated * fade;
    float trail = max(headGlow, trailBehind);

    // ── base brightness ──
    // base 控制通電後的亮度提升，使用 smoothstep body 保持與 idle 一致的寬度。
    // 1/d glow 只用於 trail head（移動亮頭），不用於 base，避免視覺變細。
    float base = reached * BASE_DIM * fade;
${isRadial ? `\
    // radial: drain 完成後永久提升到 POST_DIM
    base = mix(base, POST_DIM, drained * activated);
` : ''}

    float g = GLOW_W / max(d, 0.0004);
    float gBody = (IDLE_DIM + base) * (1.0 - smoothstep(0.0, IDLE_W, d));
    headTotal = max(headTotal, g * trail);
    baseTotal = max(baseTotal, gBody);
  }

  // ── endpoints (synced to path timing) ──
  float epGlow = 0.0;
  float epHeadGlow = 0.0;
  float invEp = 1.0 / float(NUM_ENDPOINTS);

  for (int i = 0; i < NUM_ENDPOINTS; i++) {
    float tu = (float(i) + 0.5) * invEp;
    vec4 ep0 = texture2D(uEndpoints, vec2(tu, 0.25)); // cx, cy, r, arcPos
    vec4 ep1 = texture2D(uEndpoints, vec2(tu, 0.75)); // totalArc, delay|centerDist, isStart, 0

    float d = sdRing(uv, ep0.xy, ep0.z);
    if (d > 0.06) continue;

    float arcPos   = ep0.w;
    float totalArc = ep1.x;
    float isStart  = ep1.z;
    float drawTime = totalArc / SPEED;

    // ── timing ──
${isRadial ? `\
    float dist = ep1.y;
    float activationTime = dist / EXPANSION_SPEED;
    float ct = iTime - activationTime;
    float activated = smoothstep(-0.1, 0.1, ct);
    float headPos = max(ct, 0.0) * SPEED;
` : `\
    float delay = ep1.y;
    float cycleTime = PRE_CHARGE + drawTime + PAUSE;
    float ct = mod(iTime + delay, cycleTime);
    float activated = 1.0;
    float headPos = (ct - PRE_CHARGE) * SPEED;
`}

    float distToHead = headPos - arcPos;

    // ── drain: positional fade synced with segment drain ──
${isRadial ? `\
    float afterDraw = max(max(ct, 0.0) - drawTime, 0.0);
    float drainSpeed = totalArc / DRAIN_TIME;
` : `\
    float afterDraw = max(ct - (PRE_CHARGE + drawTime), 0.0);
    float drainSpeed = totalArc / (PAUSE * DRAIN_FRAC);
`}
    float drainPos = afterDraw * drainSpeed;
    float fade = 1.0 - smoothstep(-0.04, 0.04, drainPos - arcPos);
    float drained = smoothstep(-0.04, 0.04, drainPos - arcPos);

    // ── charge-up: start endpoints charge during pre-phase, end endpoints charge as trail approaches ──
${isRadial ? `\
    float chargeRange = isStart > 0.5 ? EXPANSION_SPEED * 0.3 : EP_CHARGE_END;
` : `\
    float chargeRange = isStart > 0.5 ? PRE_CHARGE * SPEED : EP_CHARGE_END;
`}
    float charge = smoothstep(-chargeRange, 0.0, distToHead) * activated;

    // bright flash when trail arrives
    float flash = exp(-distToHead * distToHead * 300.0) * charge * fade;

    // dim base after trail passes
    float dimAfter = step(0.0, distToHead) * BASE_DIM * charge * fade;
${isRadial ? `\
    // radial: drain 完成後永久提升到 POST_DIM
    float base = mix(dimAfter, POST_DIM, drained) * activated;
` : `\
    float base = dimAfter;
`}

    float g = EP_GLOW_W / max(d, 0.0004);
    float gBody = (IDLE_DIM + base) * (1.0 - smoothstep(0.0, EP_IDLE_W, d));
    epHeadGlow = max(epHeadGlow, g * flash);
    epGlow = max(epGlow, gBody);
  }

${isRadial ? `\
  // ── radial pulse ring ──
  float pulseR = iTime * EXPANSION_SPEED;
  float ringDist = abs(length(uv - CENTER) - pulseR);
  float ringGlow = 0.008 / max(ringDist, 0.001);
  ringGlow *= smoothstep(0.15, 0.0, ringDist);
  ringGlow *= 1.0 - smoothstep(MAX_RADIUS, MAX_RADIUS + 0.2, pulseR);
` : ''}

  // ── compose ──
  vec3 bg       = vec3(0.025, 0.01, 0.12);
  vec3 baseCol  = vec3(0.0, 0.75, 0.6);
  vec3 headCol  = vec3(0.55, 1.0, 0.9);

  vec3 col = bg;
  col += baseCol * max(baseTotal, epGlow);
  col += headCol * max(headTotal, epHeadGlow);
${isRadial ? `\
  vec3 pulseCol = vec3(0.2, 0.7, 0.9);
  col += pulseCol * ringGlow * 0.12 * uShowPulse;
` : ''}

  // vignette
  vec2 vc = gl_FragCoord.xy / iResolution - 0.5;
  col *= 1.0 - dot(vc, vc) * 1.3;

  gl_FragColor = vec4(col, 1.0);
}
`;
}
