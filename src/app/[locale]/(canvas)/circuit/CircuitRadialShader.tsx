'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import circuitData from './circuitData.json';
import { circuitVertexShader, makeFragmentShader } from './makeCircuitShader';

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
      const startNx = nx(rawPath[0][0]), startNy = ny(rawPath[0][1]);
      const lastIdx = rawPath.length - 1;
      const endNx = nx(rawPath[lastIdx][0]), endNy = ny(rawPath[lastIdx][1]);

      const startDist = distFromOrigin(startNx, startNy);
      const endDist = distFromOrigin(endNx, endNy);

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
          centerDist,
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
      fragmentShader: makeFragmentShader({
        numSegments: N,
        numEndpoints: M,
        mode: 'radial',
        maxRadius: maxCenterDist,
        center: [originX, originY],
      }),
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
        vertexShader={circuitVertexShader}
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
