'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import circuitData from './circuitData.json';

/* ── vertex ── */
const vs = /* glsl */ `
void main() {
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

/* ── fragment shader generator ── */
function makeFragmentShader(numSegments: number, numEndpoints: number) {
  return /* glsl */ `
precision highp float;

uniform vec2 iResolution;
uniform float iTime;
uniform sampler2D uSegments;
uniform sampler2D uEndpoints;

#define NUM_SEGMENTS ${numSegments}
#define NUM_ENDPOINTS ${numEndpoints}

// ── tuning ──

// 拖尾頭移動速度 (arc-length / 秒)
// 範圍 0.05–1.0 | 調大：動畫加快 | 調小：動畫放慢
#define SPEED        0.16

// 拖尾亮頭後方的指數衰減率
// 範圍 3.0–30.0 | 調大：尾巴更短更銳利 | 調小：尾巴更長更柔
#define TRAIL_DECAY  10.0

// 線段被點亮後的基礎亮度 (拖尾通過後的持續發光)
// 範圍 0.05–0.5 | 調大：點亮後更亮 | 調小：點亮後更暗
#define BASE_DIM     0.15

// 線段活動時的光暈寬度 (1/d 衰減)
// 範圍 0.001–0.01 | 調大：活動光暈更粗更亮 | 調小：更細更暗
#define GLOW_W       0.0025

// 拖尾畫完後到下一輪開始的等待時間 (秒)
// 範圍 0.5–5.0 | 調大：停頓更久 | 調小：循環更快
#define PAUSE        2.0

// drain 動畫佔 PAUSE 時間的比例
// 範圍 0.3–0.9 | 調大：drain 更慢（佔更多 PAUSE）| 調小：drain 更快，留更多空白
#define DRAIN_FRAC   0.65

// 起點端點在拖尾出發前的充能時間 (秒)
// 範圍 0.5–3.0 | 調大：起點充能更久才出發 | 調小：幾乎立刻出發
#define PRE_CHARGE   1.5

// 端點圓環活動時的光暈寬度 (1/d 衰減)
// 範圍 0.001–0.01 | 調大：端點活動光暈更粗更亮 | 調小：更細更暗
#define EP_GLOW_W    0.003

// 終點端點開始充能的距離 (arc-length)
// 範圍 0.005–0.05 | 調大：拖尾離更遠就開始亮 | 調小：要非常接近才亮
#define EP_CHARGE_END 0.012

// 像素距離裁切閾值 (超過此距離直接跳過，優化效能)
// 範圍 0.05–0.3 | 調大：計算範圍更廣（更精確但更慢）| 調小：更快但光暈可能被截斷
#define DIST_CUTOFF  0.12

// 線段待機光暈的寬度 (smoothstep 柔邊，與亮度解耦)
// 範圍 0.001–0.01 | 調大：待機線條更粗 | 調小：更細
#define IDLE_W       0.004

// 線段和端點待機光暈的亮度
// 範圍 0.02–0.2 | 調大：待機更亮 | 調小：待機更暗
#define IDLE_DIM     0.3

// 端點圓環待機光暈的寬度 (smoothstep 柔邊)
// 範圍 0.002–0.015 | 調大：待機圓環更粗 | 調小：更細
#define EP_IDLE_W    0.004

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
    float delay    = anim.w;

    float drawTime  = totalArc / SPEED;
    float cycleTime = PRE_CHARGE + drawTime + PAUSE;
    float ct        = mod(iTime + delay, cycleTime);
    float headPos   = (ct - PRE_CHARGE) * SPEED;

    float arcDist = headPos - arcAt;
    float reached = smoothstep(-0.02, 0.002, arcDist);

    // drain: energy sweeps start→end during pause
    float afterDraw = max(ct - (PRE_CHARGE + drawTime), 0.0);
    float drainSpeed = totalArc / (PAUSE * DRAIN_FRAC);
    float drainPos = afterDraw * drainSpeed;
    float fade = 1.0 - smoothstep(-0.04, 0.04, drainPos - arcAt);

    // bright moving head (only during draw phase)
    float headGlow = exp(-arcDist * arcDist * TRAIL_DECAY * TRAIL_DECAY * 4.0) * reached;
    headGlow *= step(ct, PRE_CHARGE + drawTime + 0.01);

    // trailing glow behind head — fades with drain, not hard cutoff
    float trailBehind = exp(-max(arcDist, 0.0) * TRAIL_DECAY) * step(0.0, arcDist) * fade;

    float trail = max(headGlow, trailBehind);

    float base = reached * BASE_DIM * fade;

    float g = GLOW_W / max(d, 0.0004);
    float gIdle = IDLE_DIM * (1.0 - smoothstep(0.0, IDLE_W, d));
    headTotal = max(headTotal, g * trail);
    baseTotal = max(baseTotal, max(g * base, gIdle));
  }

  // ── endpoints (synced to path timing) ──
  float epGlow = 0.0;
  float epHeadGlow = 0.0;
  float invEp = 1.0 / float(NUM_ENDPOINTS);

  for (int i = 0; i < NUM_ENDPOINTS; i++) {
    float tu = (float(i) + 0.5) * invEp;
    vec4 ep0 = texture2D(uEndpoints, vec2(tu, 0.25)); // cx, cy, r, arcPos
    vec4 ep1 = texture2D(uEndpoints, vec2(tu, 0.75)); // totalArc, delay, isStart, 0

    float d = sdRing(uv, ep0.xy, ep0.z);
    if (d > 0.06) continue;

    float arcPos   = ep0.w;
    float totalArc = ep1.x;
    float delay    = ep1.y;
    float isStart  = ep1.z;

    float drawTime  = totalArc / SPEED;
    float cycleTime = PRE_CHARGE + drawTime + PAUSE;
    float ct        = mod(iTime + delay, cycleTime);
    float headPos   = (ct - PRE_CHARGE) * SPEED;

    float distToHead = headPos - arcPos;

    // charge-up range: start endpoints charge during PRE_CHARGE, end endpoints charge as trail approaches
    float chargeRange = isStart > 0.5 ? PRE_CHARGE * SPEED : EP_CHARGE_END;
    float charge = smoothstep(-chargeRange, 0.0, distToHead);

    // bright flash when trail arrives/departs
    float flash = exp(-distToHead * distToHead * 300.0) * charge;

    // dim base after trail passes
    float dimAfter = step(0.0, distToHead) * BASE_DIM * charge;

    // drain: positional fade synced with segment drain
    float afterDraw = max(ct - (PRE_CHARGE + drawTime), 0.0);
    float drainSpeed = totalArc / (PAUSE * DRAIN_FRAC);
    float drainPos = afterDraw * drainSpeed;
    float fade = 1.0 - smoothstep(-0.04, 0.04, drainPos - arcPos);

    float g = EP_GLOW_W / max(d, 0.0004);
    float gIdle = IDLE_DIM * (1.0 - smoothstep(0.0, EP_IDLE_W, d));
    epHeadGlow = max(epHeadGlow, g * flash * fade);
    epGlow = max(epGlow, max(g * dimAfter * fade, gIdle));
  }

  // ── compose ──
  vec3 bg   = vec3(0.025, 0.01, 0.12);
  vec3 baseCol = vec3(0.0, 0.75, 0.6);
  vec3 headCol = vec3(0.55, 1.0, 0.9);
  vec3 epCol   = vec3(0.0, 0.85, 0.7);

  vec3 col = bg;
  col += baseCol * max(baseTotal, epGlow);
  col += headCol * max(headTotal, epHeadGlow);

  // vignette
  vec2 vc = gl_FragCoord.xy / iResolution - 0.5;
  col *= 1.0 - dot(vc, vc) * 1.3;

  gl_FragColor = vec4(col, 1.0);
}
`;
}

/* ── helpers ── */
function seededRand(seed: number) {
  let s = Math.abs(seed) || 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

/* ── component ── */
export default function CircuitShader() {
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const { segTex, epTex, fragmentShader } = useMemo(() => {
    const cx = 400, cy = 300, sc = 300;
    const nx = (x: number) => (x - cx) / sc;
    const ny = (y: number) => (cy - y) / sc;
    const nr = (r: number) => r / sc;

    const rand = seededRand(42);
    const GAP = circuitData.gap ?? 2.66; // SVG pixels from segment end to circle center
    const EP_R = circuitData.endpointRadius ?? 2.8; // SVG circle radius

    interface Seg {
      x1: number; y1: number; x2: number; y2: number;
      arcStart: number; arcEnd: number;
      totalArc: number; delay: number;
    }

    interface Ep {
      cx: number; cy: number; r: number;
      arcPos: number; totalArc: number; delay: number; isStart: number;
    }

    const segs: Seg[] = [];
    const eps: Ep[] = [];

    for (const path of circuitData.paths) {
      let cumArc = 0;
      const pathSegs: Omit<Seg, 'totalArc' | 'delay'>[] = [];

      for (let i = 0; i < path.length - 1; i++) {
        const x1 = nx(path[i][0]), y1 = ny(path[i][1]);
        const x2 = nx(path[i + 1][0]), y2 = ny(path[i + 1][1]);
        const len = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
        pathSegs.push({ x1, y1, x2, y2, arcStart: cumArc, arcEnd: cumArc + len });
        cumArc += len;
      }

      const delay = rand() * 8;
      for (const s of pathSegs) {
        segs.push({ ...s, totalArc: cumArc, delay });
      }

      // ── derive endpoints from path ends ──
      // Start: extend from path[0] away from path[1]
      {
        const [sx, sy] = path[0];
        const [s1x, s1y] = path[1];
        const dx = sx - s1x, dy = sy - s1y;
        const len = Math.sqrt(dx * dx + dy * dy);
        eps.push({
          cx: nx(sx + (dx / len) * GAP),
          cy: ny(sy + (dy / len) * GAP),
          r: nr(EP_R),
          arcPos: 0,
          totalArc: cumArc,
          delay,
          isStart: 1,
        });
      }
      // End: extend from path[last] away from path[last-1]
      {
        const last = path.length - 1;
        const [ex, ey] = path[last];
        const [e1x, e1y] = path[last - 1];
        const dx = ex - e1x, dy = ey - e1y;
        const len = Math.sqrt(dx * dx + dy * dy);
        eps.push({
          cx: nx(ex + (dx / len) * GAP),
          cy: ny(ey + (dy / len) * GAP),
          r: nr(EP_R),
          arcPos: cumArc,
          totalArc: cumArc,
          delay,
          isStart: 0,
        });
      }
    }

    // ── segment DataTexture (width=N, height=2) ──
    const N = segs.length;
    const segData = new Float32Array(N * 2 * 4);
    for (let i = 0; i < N; i++) {
      const s = segs[i];
      segData[i * 4 + 0] = s.x1;
      segData[i * 4 + 1] = s.y1;
      segData[i * 4 + 2] = s.x2;
      segData[i * 4 + 3] = s.y2;
      const r1 = N * 4;
      segData[r1 + i * 4 + 0] = s.arcStart;
      segData[r1 + i * 4 + 1] = s.arcEnd;
      segData[r1 + i * 4 + 2] = s.totalArc;
      segData[r1 + i * 4 + 3] = s.delay;
    }
    const sTex = new THREE.DataTexture(segData, N, 2, THREE.RGBAFormat, THREE.FloatType);
    sTex.minFilter = THREE.NearestFilter;
    sTex.magFilter = THREE.NearestFilter;
    sTex.needsUpdate = true;

    // ── endpoint DataTexture (width=M, height=2) ──
    const M = eps.length;
    const epData = new Float32Array(M * 2 * 4);
    for (let i = 0; i < M; i++) {
      const e = eps[i];
      // row 0: cx, cy, r, arcPos
      epData[i * 4 + 0] = e.cx;
      epData[i * 4 + 1] = e.cy;
      epData[i * 4 + 2] = e.r;
      epData[i * 4 + 3] = e.arcPos;
      // row 1: totalArc, delay, isStart, 0
      const r1 = M * 4;
      epData[r1 + i * 4 + 0] = e.totalArc;
      epData[r1 + i * 4 + 1] = e.delay;
      epData[r1 + i * 4 + 2] = e.isStart;
      epData[r1 + i * 4 + 3] = 0;
    }
    const eTex = new THREE.DataTexture(epData, M, 2, THREE.RGBAFormat, THREE.FloatType);
    eTex.minFilter = THREE.NearestFilter;
    eTex.magFilter = THREE.NearestFilter;
    eTex.needsUpdate = true;

    return {
      segTex: sTex,
      epTex: eTex,
      fragmentShader: makeFragmentShader(N, M),
    };
  }, []);

  useFrame((state) => {
    const mat = matRef.current;
    if (!mat) return;
    mat.uniforms.iTime.value = state.clock.getElapsedTime();
    mat.uniforms.iResolution.value.set(
      state.size.width * state.viewport.dpr,
      state.size.height * state.viewport.dpr,
    );
  });

  return (
    <mesh frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={vs}
        fragmentShader={fragmentShader}
        uniforms={{
          iResolution: { value: new THREE.Vector2() },
          iTime: { value: 0 },
          uSegments: { value: segTex },
          uEndpoints: { value: epTex },
        }}
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  );
}
