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
#define SPEED        0.16
#define TRAIL_DECAY  10.0
#define BASE_DIM     0.15
#define GLOW_W       0.0025
#define PAUSE        2.0
#define PRE_CHARGE   1.5
#define EP_GLOW_W    0.003
#define EP_CHARGE_END 0.012
#define DIST_CUTOFF  0.12
#define MIN_DIM      0.04

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

    // bright trail head
    float trail = exp(-arcDist * arcDist * TRAIL_DECAY * TRAIL_DECAY * 4.0) * reached;
    trail *= step(ct, PRE_CHARGE + drawTime + 0.01);
    float trailBehind = exp(-max(arcDist, 0.0) * TRAIL_DECAY) * step(0.0, arcDist);
    trail = max(trail, trailBehind) * step(ct, PRE_CHARGE + drawTime + 0.01);

    // dim base, fade during pause (never below MIN_DIM)
    float fade = 1.0 - smoothstep(PRE_CHARGE + drawTime, cycleTime, ct);
    float base = max(reached * BASE_DIM * fade, MIN_DIM);

    float g = GLOW_W / max(d, 0.0004);
    headTotal = max(headTotal, g * trail);
    baseTotal = max(baseTotal, g * base);
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

    // fade during pause
    float fade = 1.0 - smoothstep(PRE_CHARGE + drawTime, cycleTime, ct);

    float intensity = max(flash, dimAfter) * fade;

    float g = EP_GLOW_W / max(d, 0.0004);
    epHeadGlow = max(epHeadGlow, g * flash * fade);
    epGlow = max(epGlow, g * max(dimAfter * fade, MIN_DIM));
  }

  // ── compose ──
  vec3 bg   = vec3(0.025, 0.01, 0.12);
  vec3 baseCol = vec3(0.0, 0.75, 0.6);
  vec3 headCol = vec3(0.55, 1.0, 0.9);
  vec3 epCol   = vec3(0.0, 0.85, 0.7);

  vec3 col = bg;
  col += baseCol * baseTotal;
  col += headCol * headTotal;
  col += baseCol * epGlow;
  col += headCol * epHeadGlow;

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
