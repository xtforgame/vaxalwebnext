'use client';

import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import type { FrameConfig } from './types';

const TRAIL_Z = 0.05;
const RIBBON_HALF_WIDTH = 1.2;
const RIBBON_SEGMENTS = 200;

/**
 * Build a flat ribbon geometry along a curve, lying on the wall.
 * UV.x = 0..1 along the curve (progress direction)
 * UV.y = 0..1 across the ribbon width (0.5 = center line)
 */
function createRibbonGeometry(
  curve: THREE.CatmullRomCurve3,
  halfWidth: number,
  segments: number
): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const point = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t);

    // Perpendicular direction in the XY plane
    const nx = -tangent.y;
    const ny = tangent.x;
    const len = Math.sqrt(nx * nx + ny * ny) || 1;
    const nnx = nx / len;
    const nny = ny / len;

    // +side vertex (UV.y = 0)
    positions.push(
      point.x + nnx * halfWidth,
      point.y + nny * halfWidth,
      point.z
    );
    uvs.push(t, 0.0);

    // -side vertex (UV.y = 1)
    positions.push(
      point.x - nnx * halfWidth,
      point.y - nny * halfWidth,
      point.z
    );
    uvs.push(t, 1.0);

    if (i < segments) {
      const base = i * 2;
      indices.push(base, base + 1, base + 2);
      indices.push(base + 1, base + 3, base + 2);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  return geo;
}

const trailVert = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldPos;
  void main() {
    vUv = uv;
    vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/**
 * Fragment shader — unified light trail.
 *
 * Single continuous function from head to tail:
 * - Core (thin white line) and glow (wide blue halo) both peak at head
 *   and decay smoothly behind — no separate "head" vs "trail" systems.
 * - Leading edge: soft smoothstep cutoff → naturally tapered point.
 * - headBloom / trailPersist use max() for seamless handoff near head.
 */
const trailFrag = /* glsl */ `
  uniform float uProgress;
  uniform float uTime;
  uniform vec2 uFrameA;
  uniform vec2 uFrameB;
  uniform float uHexInner;
  varying vec2 vUv;
  varying vec3 vWorldPos;

  void main() {
    float r = abs(vUv.y - 0.5) * 2.0;   // 0=center, 1=edge
    float d = uProgress - vUv.x;         // >0 behind head, <0 ahead

    // Early discard: well ahead of head
    if (d < -0.03) discard;

    // === Hex frame masking ===
    float distA = length(vWorldPos.xy - uFrameA);
    float distB = length(vWorldPos.xy - uFrameB);
    float hexFade = smoothstep(uHexInner, uHexInner + 0.5, min(distA, distB));

    // === Leading edge: soft taper ahead of head ===
    float leading = smoothstep(-0.02, 0.003, d);

    float dBehind = max(0.0, d);

    // === CORE: thin bright line, peaks at head, decays behind ===
    float coreR = exp(-r * r * 600.0);     // tight Gaussian → thin line
    float coreD = exp(-dBehind * 8.0);     // exponential tail decay
    float core = coreR * coreD * leading;

    // === GLOW: unified halo from head through trail ===
    float glowR = exp(-r * 3.0);           // soft radial spread

    // Two overlapping curves, take the brighter one at each point:
    // headBloom: strong near head, drops fast → gives bright halo at tip
    // trailPersist: weaker but slow 1/x decay → long visible tail
    float headBloom    = exp(-dBehind * 20.0) * 0.5;
    float trailPersist = 0.15 / (dBehind * 1.2 + 0.25);
    float glowD = max(headBloom, trailPersist);

    float glow = glowR * glowD * leading;
    glow = min(glow, 0.8);

    // Energy pulse
    float pulse = 1.0 + 0.05 * sin(vUv.x * 50.0 - uTime * 5.0);

    // Color: white core → light blue glow → deep blue outer
    vec3 white     = vec3(1.0);
    vec3 lightBlue = vec3(0.45, 0.75, 1.0);
    vec3 blue      = vec3(0.12, 0.3, 0.85);

    vec3 color = white * core
               + lightBlue * glow * pulse
               + blue * glow * 0.35;

    float alpha = core * 0.9 + glow * 0.7;

    // Ribbon edge fade
    alpha *= 1.0 - smoothstep(0.35, 1.0, r);
    // Hex frame distance fade
    alpha *= hexFade;

    gl_FragColor = vec4(color, alpha);
  }
`;

interface LightTrailProps {
  fromFrame: FrameConfig;
  toFrame: FrameConfig;
  progressRef: { current: number };
  visibleRef: { current: boolean };
}

export default function LightTrail({
  fromFrame,
  toFrame,
  progressRef,
  visibleRef,
}: LightTrailProps) {
  const groupRef = useRef<THREE.Group>(null);
  const elapsedRef = useRef(0);

  // Trail curve on wall — same XY waypoints as camera path
  const trailCurve = useMemo(() => {
    const a = fromFrame.wallPosition;
    const b = toFrame.wallPosition;
    const midX = (a.x + b.x) / 2;
    const midY = (a.y + b.y) / 2;
    return new THREE.CatmullRomCurve3(
      [
        new THREE.Vector3(a.x, a.y, TRAIL_Z),
        new THREE.Vector3(a.x, a.y + 0.3, TRAIL_Z),
        new THREE.Vector3(midX, midY + 0.2, TRAIL_Z),
        new THREE.Vector3(b.x, b.y + 0.3, TRAIL_Z),
        new THREE.Vector3(b.x, b.y, TRAIL_Z),
      ],
      false,
      'catmullrom',
      0.35
    );
  }, [fromFrame, toFrame]);

  // Flat ribbon on the wall surface
  const ribbonGeo = useMemo(
    () => createRibbonGeometry(trailCurve, RIBBON_HALF_WIDTH, RIBBON_SEGMENTS),
    [trailCurve]
  );

  // Precompute lookup: trail curve XY at uniform arc-length samples
  // Used to project camera XY → trail parameter each frame
  const trailLookup = useMemo(() => {
    const N = 200;
    const table: { t: number; x: number; y: number }[] = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const p = trailCurve.getPointAt(t);
      table.push({ t, x: p.x, y: p.y });
    }
    return table;
  }, [trailCurve]);

  const { camera } = useThree();

  const hexInner = fromFrame.radius - fromFrame.borderWidth;

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: trailVert,
        fragmentShader: trailFrag,
        uniforms: {
          uProgress: { value: 0 },
          uTime: { value: 0 },
          uFrameA: { value: new THREE.Vector2(fromFrame.wallPosition.x, fromFrame.wallPosition.y) },
          uFrameB: { value: new THREE.Vector2(toFrame.wallPosition.x, toFrame.wallPosition.y) },
          uHexInner: { value: hexInner },
        },
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    [fromFrame, toFrame, hexInner]
  );

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    const visible = visibleRef.current;
    groupRef.current.visible = visible;
    if (!visible) return;

    elapsedRef.current += delta;

    // Project camera XY onto the trail curve to find matching parameter
    const cx = camera.position.x;
    const cy = camera.position.y;
    let bestT = 0;
    let bestDist = Infinity;
    for (const s of trailLookup) {
      const dx = s.x - cx;
      const dy = s.y - cy;
      const dist = dx * dx + dy * dy;
      if (dist < bestDist) {
        bestDist = dist;
        bestT = s.t;
      }
    }

    material.uniforms.uProgress.value = bestT;
    material.uniforms.uTime.value = elapsedRef.current;
  });

  return (
    <group ref={groupRef} visible={false}>
      <mesh geometry={ribbonGeo} material={material} renderOrder={10} />
    </group>
  );
}
