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
function makeFragmentShader(numSegments: number, numEndpoints: number, maxRadius: number, center: [number, number]) {
  return /* glsl */ `
precision highp float;

uniform vec2 iResolution;
uniform float iTime;
uniform sampler2D uSegments;
uniform sampler2D uEndpoints;
uniform float uShowPulse;

#define NUM_SEGMENTS ${numSegments}
#define NUM_ENDPOINTS ${numEndpoints}

// ── tuning ──

// 拖尾頭移動速度 (arc-length / 秒)
#define SPEED          0.16

// 拖尾亮頭後方的指數衰減率
#define TRAIL_DECAY    10.0

// 動畫進行中已點亮線段的亮度
#define BASE_DIM       0.15

// 線段活動光暈寬度 (1/d 衰減)
#define GLOW_W         0.0025

// 端點活動光暈寬度
#define EP_GLOW_W      0.003

// 終點端點開始充能的距離 (arc-length)
#define EP_CHARGE_END  0.012

// 像素距離裁切
#define DIST_CUTOFF    0.12

// 放射展開速度 (normalized units / 秒)
// 調大：擴散更快 | 調小：擴散更慢
#define EXPANSION_SPEED 0.25

// 未啟動時的待機光暈亮度 (smoothstep 柔邊)
#define PRE_DIM        0.03

// 動畫完成後的持續亮度 (smoothstep 柔邊)
#define POST_DIM       0.12

// trail 畫完後 drain 的持續時間 (秒)
#define DRAIN_TIME     1.5

// 待機光暈寬度
#define IDLE_W         0.004

// 端點待機光暈寬度
#define EP_IDLE_W      0.005

// 放射脈衝的最大半徑
#define MAX_RADIUS     ${maxRadius.toFixed(4)}

// 圖案重心 (放射原點)
#define CENTER         vec2(${center[0].toFixed(4)}, ${center[1].toFixed(4)})

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
    float dist     = anim.w; // center distance of start endpoint

    float activationTime = dist / EXPANSION_SPEED;
    float ct = iTime - activationTime;
    float activated = smoothstep(-0.1, 0.1, ct);

    float headPos  = max(ct, 0.0) * SPEED;
    float drawTime = totalArc / SPEED;

    float arcDist = headPos - arcAt;
    float reached = smoothstep(-0.02, 0.002, arcDist) * activated;

    // drain: after trail finishes, energy sweeps start→end
    float afterDraw = max(max(ct, 0.0) - drawTime, 0.0);
    float drainSpeed = totalArc / DRAIN_TIME;
    float drainPos = afterDraw * drainSpeed;
    float fade = 1.0 - smoothstep(-0.04, 0.04, drainPos - arcAt);
    float drained = smoothstep(-0.04, 0.04, drainPos - arcAt);

    // bright moving head (only during draw)
    float headGlow = exp(-arcDist * arcDist * TRAIL_DECAY * TRAIL_DECAY * 4.0) * reached;
    headGlow *= step(max(ct, 0.0), drawTime + 0.01);

    // trailing glow behind head — fades with drain
    float trailBehind = exp(-max(arcDist, 0.0) * TRAIL_DECAY) * step(0.0, arcDist) * activated * fade;

    float trail = max(headGlow, trailBehind);

    // brightness: PRE_DIM → BASE_DIM (during draw) → POST_DIM (after drain)
    float animBase = mix(PRE_DIM, BASE_DIM, reached) * fade;
    float base = mix(animBase, POST_DIM, drained * activated);

    float g = GLOW_W / max(d, 0.0004);
    float idleDim = mix(PRE_DIM, POST_DIM, drained * activated);
    float gIdle = idleDim * (1.0 - smoothstep(0.0, IDLE_W, d));

    headTotal = max(headTotal, g * trail);
    baseTotal = max(baseTotal, max(g * base, gIdle));
  }

  // ── endpoints ──
  float epGlow = 0.0;
  float epHeadGlow = 0.0;
  float invEp = 1.0 / float(NUM_ENDPOINTS);

  for (int i = 0; i < NUM_ENDPOINTS; i++) {
    float tu = (float(i) + 0.5) * invEp;
    vec4 ep0 = texture2D(uEndpoints, vec2(tu, 0.25)); // cx, cy, r, arcPos
    vec4 ep1 = texture2D(uEndpoints, vec2(tu, 0.75)); // totalArc, centerDist, isStart, 0

    float d = sdRing(uv, ep0.xy, ep0.z);
    if (d > 0.06) continue;

    float arcPos   = ep0.w;
    float totalArc = ep1.x;
    float dist     = ep1.y; // start endpoint's center distance
    float isStart  = ep1.z;

    float activationTime = dist / EXPANSION_SPEED;
    float ct = iTime - activationTime;
    float activated = smoothstep(-0.1, 0.1, ct);

    float headPos  = max(ct, 0.0) * SPEED;
    float drawTime = totalArc / SPEED;

    float distToHead = headPos - arcPos;

    // drain sync
    float afterDraw = max(max(ct, 0.0) - drawTime, 0.0);
    float drainSpeed = totalArc / DRAIN_TIME;
    float drainPos = afterDraw * drainSpeed;
    float fade = 1.0 - smoothstep(-0.04, 0.04, drainPos - arcPos);
    float drained = smoothstep(-0.04, 0.04, drainPos - arcPos);

    // charge-up: start endpoints charge as radius approaches, end endpoints charge as trail approaches
    float chargeRange = isStart > 0.5 ? EXPANSION_SPEED * 0.3 : EP_CHARGE_END;
    float charge = smoothstep(-chargeRange, 0.0, distToHead) * activated;

    // flash when trail arrives — fades with drain
    float flash = exp(-distToHead * distToHead * 300.0) * charge * fade;

    // base after trail passes
    float dimAfter = step(0.0, distToHead) * BASE_DIM * charge * fade;
    float base = mix(PRE_DIM, mix(dimAfter, POST_DIM, drained), activated);

    float g = EP_GLOW_W / max(d, 0.0004);
    float idleDim = mix(PRE_DIM, POST_DIM, drained * activated);
    float gIdle = idleDim * (1.0 - smoothstep(0.0, EP_IDLE_W, d));

    epHeadGlow = max(epHeadGlow, g * flash);
    epGlow = max(epGlow, max(g * base, gIdle));
  }

  // ── radial pulse ring ──
  float pulseR = iTime * EXPANSION_SPEED;
  float ringDist = abs(length(uv - CENTER) - pulseR);
  float ringGlow = 0.008 / max(ringDist, 0.001);
  ringGlow *= smoothstep(0.15, 0.0, ringDist);
  ringGlow *= 1.0 - smoothstep(MAX_RADIUS, MAX_RADIUS + 0.2, pulseR);

  // ── compose ──
  vec3 bg       = vec3(0.025, 0.01, 0.12);
  vec3 baseCol  = vec3(0.0, 0.75, 0.6);
  vec3 headCol  = vec3(0.55, 1.0, 0.9);
  vec3 pulseCol = vec3(0.2, 0.7, 0.9);

  vec3 col = bg;
  col += baseCol * max(baseTotal, epGlow);
  col += headCol * max(headTotal, epHeadGlow);
  col += pulseCol * ringGlow * 0.12 * uShowPulse;

  // vignette
  vec2 vc = gl_FragCoord.xy / iResolution - 0.5;
  col *= 1.0 - dot(vc, vc) * 1.3;

  gl_FragColor = vec4(col, 1.0);
}
`;
}

/* ── component ── */
export default function CircuitRadialShader({ showPulse = true }: { showPulse?: boolean }) {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const startTimeRef = useRef(-1);

  const { segTex, epTex, fragmentShader } = useMemo(() => {
    const cx = 400, cy = 300, sc = 300;
    const nx = (x: number) => (x - cx) / sc;
    const ny = (y: number) => (cy - y) / sc;
    const nr = (r: number) => r / sc;

    const GAP = circuitData.gap ?? 2.66;
    const EP_R = circuitData.endpointRadius ?? 2.8;

    interface Seg {
      x1: number; y1: number; x2: number; y2: number;
      arcStart: number; arcEnd: number;
      totalArc: number; centerDist: number;
    }

    interface Ep {
      cx: number; cy: number; r: number;
      arcPos: number; totalArc: number; centerDist: number; isStart: number;
    }

    // Compute pattern centroid as radial origin
    let sumX = 0, sumY = 0, ptCount = 0;
    for (const p of circuitData.paths) {
      for (const [px, py] of p) { sumX += nx(px); sumY += ny(py); ptCount++; }
    }
    const originX = sumX / ptCount;
    const originY = sumY / ptCount;
    const distFromOrigin = (x: number, y: number) =>
      Math.sqrt((x - originX) ** 2 + (y - originY) ** 2);

    const segs: Seg[] = [];
    const eps: Ep[] = [];
    let maxCenterDist = 0;

    for (const rawPath of circuitData.paths) {
      // Determine which end is closer to pattern centroid → that becomes the start
      const startNx = nx(rawPath[0][0]), startNy = ny(rawPath[0][1]);
      const lastIdx = rawPath.length - 1;
      const endNx = nx(rawPath[lastIdx][0]), endNy = ny(rawPath[lastIdx][1]);

      const startDist = distFromOrigin(startNx, startNy);
      const endDist = distFromOrigin(endNx, endNy);

      // Reverse path if the far end is closer to center
      const path = endDist < startDist ? [...rawPath].reverse() : rawPath;
      const centerDist = Math.min(startDist, endDist);
      const farDist = Math.max(startDist, endDist);
      if (farDist > maxCenterDist) maxCenterDist = farDist;

      let cumArc = 0;
      const pathSegs: Omit<Seg, 'totalArc' | 'centerDist'>[] = [];

      for (let i = 0; i < path.length - 1; i++) {
        const x1 = nx(path[i][0]), y1 = ny(path[i][1]);
        const x2 = nx(path[i + 1][0]), y2 = ny(path[i + 1][1]);
        const len = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
        pathSegs.push({ x1, y1, x2, y2, arcStart: cumArc, arcEnd: cumArc + len });
        cumArc += len;
      }

      for (const s of pathSegs) {
        segs.push({ ...s, totalArc: cumArc, centerDist });
      }

      // Start endpoint (closer to center)
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
          centerDist,
          isStart: 1,
        });
      }
      // End endpoint (farther from center)
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
          centerDist, // same as start for timing sync
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
      segData[r1 + i * 4 + 3] = s.centerDist;
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
      epData[i * 4 + 0] = e.cx;
      epData[i * 4 + 1] = e.cy;
      epData[i * 4 + 2] = e.r;
      epData[i * 4 + 3] = e.arcPos;
      const r1 = M * 4;
      epData[r1 + i * 4 + 0] = e.totalArc;
      epData[r1 + i * 4 + 1] = e.centerDist;
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
      fragmentShader: makeFragmentShader(N, M, maxCenterDist, [originX, originY]),
    };
  }, []);

  useFrame((state) => {
    const mat = matRef.current;
    if (!mat) return;
    if (startTimeRef.current < 0) startTimeRef.current = state.clock.getElapsedTime();
    mat.uniforms.iTime.value = state.clock.getElapsedTime() - startTimeRef.current;
    mat.uniforms.iResolution.value.set(
      state.size.width * state.viewport.dpr,
      state.size.height * state.viewport.dpr,
    );
    mat.uniforms.uShowPulse.value = showPulse ? 1.0 : 0.0;
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
          uShowPulse: { value: 1.0 },
        }}
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  );
}
