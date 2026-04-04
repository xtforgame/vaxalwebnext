'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import circuitData from './circuitData.json';
import { circuitVertexShader, makeFragmentShader } from './makeCircuitShader';

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
    const GAP = circuitData.gap ?? 2.66;
    const EP_R = circuitData.endpointRadius ?? 2.8;

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

      // Start endpoint
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
      // End endpoint
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
      epData[i * 4 + 0] = e.cx;
      epData[i * 4 + 1] = e.cy;
      epData[i * 4 + 2] = e.r;
      epData[i * 4 + 3] = e.arcPos;
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
      fragmentShader: makeFragmentShader({ numSegments: N, numEndpoints: M, mode: 'cyclic' }),
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
        vertexShader={circuitVertexShader}
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
