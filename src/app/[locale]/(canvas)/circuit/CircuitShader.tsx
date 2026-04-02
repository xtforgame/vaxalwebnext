'use client';

import { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
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
#define EP_GLOW_W    0.002
#define DIST_CUTOFF  0.12

// point-to-segment distance + parameter t ∈ [0,1]
vec2 sdSeg(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return vec2(length(pa - ba * h), h);
}

// hollow circle (ring) distance
float sdRing(vec2 p, vec2 c, float r) {
  return abs(length(p - c) - r);
}

void main() {
  vec2 uv = (gl_FragCoord.xy * 2.0 - iResolution) / iResolution.y;

  float baseTotal = 0.0;
  float headTotal = 0.0;
  float invSeg = 1.0 / float(NUM_SEGMENTS);

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
    float cycleTime = drawTime + PAUSE;
    float ct        = mod(iTime + delay, cycleTime);
    float headPos   = ct * SPEED;

    float arcDist = headPos - arcAt;
    // soft edge: let glow bleed slightly ahead of head (matches visible glow radius)
    float reached = smoothstep(-0.02, 0.002, arcDist);

    // bright trail head (exponential falloff, symmetric near head)
    float trail = exp(-arcDist * arcDist * TRAIL_DECAY * TRAIL_DECAY * 4.0) * reached;
    // only show head during draw phase
    trail *= step(ct, drawTime + 0.01);
    // also add directional trail behind head
    float trailBehind = exp(-max(arcDist, 0.0) * TRAIL_DECAY) * step(0.0, arcDist);
    trail = max(trail, trailBehind) * step(ct, drawTime + 0.01);

    // dim base for already-drawn segments, fade during pause
    float fade = 1.0 - smoothstep(drawTime, cycleTime, ct);
    float base = reached * BASE_DIM * fade;

    float g = GLOW_W / max(d, 0.0004);
    headTotal = max(headTotal, g * trail);
    baseTotal = max(baseTotal, g * base);
  }

  // ── endpoints ──
  float epGlow = 0.0;
  float invEp = 1.0 / float(NUM_ENDPOINTS);
  for (int i = 0; i < NUM_ENDPOINTS; i++) {
    vec4 ep = texture2D(uEndpoints, vec2((float(i) + 0.5) * invEp, 0.5));
    float d = sdRing(uv, ep.xy, ep.z);
    if (d > 0.06) continue;
    float pulse = 0.55 + 0.45 * sin(iTime * 2.5 + ep.x * 15.0 + ep.y * 11.0);
    epGlow = max(epGlow, EP_GLOW_W / max(d, 0.0004) * pulse);
  }

  // ── compose ──
  vec3 bg   = vec3(0.025, 0.01, 0.12);
  vec3 base = vec3(0.0, 0.75, 0.6);
  vec3 head = vec3(0.55, 1.0, 0.9);
  vec3 epc  = vec3(0.0, 0.85, 0.7);

  vec3 col = bg;
  col += base * baseTotal;
  col += head * headTotal;
  col += epc  * epGlow * 0.4;

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
  const { size, viewport } = useThree();
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const { segTex, epTex, fragmentShader } = useMemo(() => {
    // ── coordinate normalization ──
    // SVG 800×600 → center at (400,300), scale by half-height (300)
    const cx = 400, cy = 300, sc = 300;
    const nx = (x: number) => (x - cx) / sc;
    const ny = (y: number) => (cy - y) / sc; // flip Y
    const nr = (r: number) => r / sc;

    // ── process paths → segments with arc lengths ──
    const rand = seededRand(42);

    interface Seg {
      x1: number; y1: number; x2: number; y2: number;
      arcStart: number; arcEnd: number;
      totalArc: number; delay: number;
    }

    const segs: Seg[] = [];

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

      const delay = rand() * 8; // stagger up to 8 seconds
      for (const s of pathSegs) {
        segs.push({ ...s, totalArc: cumArc, delay });
      }
    }

    // ── build segment DataTexture (width=N, height=2) ──
    const N = segs.length;
    const segData = new Float32Array(N * 2 * 4);
    for (let i = 0; i < N; i++) {
      const s = segs[i];
      // row 0 (bottom): geometry
      segData[i * 4 + 0] = s.x1;
      segData[i * 4 + 1] = s.y1;
      segData[i * 4 + 2] = s.x2;
      segData[i * 4 + 3] = s.y2;
      // row 1 (top): animation
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

    // ── build endpoint DataTexture (width=M, height=1) ──
    const M = circuitData.endpoints.length;
    const epData = new Float32Array(M * 4);
    for (let i = 0; i < M; i++) {
      const ep = circuitData.endpoints[i];
      epData[i * 4 + 0] = nx(ep.x);
      epData[i * 4 + 1] = ny(ep.y);
      epData[i * 4 + 2] = nr(ep.r);
      epData[i * 4 + 3] = 0;
    }

    const eTex = new THREE.DataTexture(epData, M, 1, THREE.RGBAFormat, THREE.FloatType);
    eTex.minFilter = THREE.NearestFilter;
    eTex.magFilter = THREE.NearestFilter;
    eTex.needsUpdate = true;

    return {
      segTex: sTex,
      epTex: eTex,
      fragmentShader: makeFragmentShader(N, M),
    };
  }, []);

  useEffect(() => {
    return () => {
      segTex.dispose();
      epTex.dispose();
    };
  }, [segTex, epTex]);

  useFrame(({ clock }) => {
    const mat = matRef.current;
    if (!mat) return;
    mat.uniforms.iTime.value = clock.getElapsedTime();
    mat.uniforms.iResolution.value.set(
      size.width * viewport.dpr,
      size.height * viewport.dpr,
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
