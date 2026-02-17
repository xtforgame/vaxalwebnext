'use client';

import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { FrameConfig } from './types';
import { easeInOutCubic } from './CameraDirector';

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
 * Fragment shader for light trail effect.
 *
 * Key design choices:
 * - World-space hex masking prevents trail leaking into frame openings
 * - 2D distance from head point creates round leading edge
 * - Exponential core decay: white core fades fast → blue glow dominates tail
 * - exp() radial falloff gives wide, soft glow (vs 1/dist which drops too fast)
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
    if (d < -0.05) discard;

    // === Hex frame masking (world-space distance) ===
    float distA = length(vWorldPos.xy - uFrameA);
    float distB = length(vWorldPos.xy - uFrameB);
    float hexFade = smoothstep(uHexInner, uHexInner + 0.5, min(distA, distB));

    // === Round head shape (2D aspect-corrected distance) ===
    // curve ~14 units, ribbon half-width 1.2 → aspect ≈ 12
    float dScaled = d * 12.0;
    float headDist = length(vec2(dScaled, r));

    // Discard ahead fragments outside head radius
    if (d < 0.0 && headDist > 0.5) discard;

    float dBehind = max(0.0, d);

    // === HEAD: bright round point ===
    float headCore = smoothstep(0.25, 0.02, headDist);
    float headGlow = 0.04 / (headDist + 0.04);
    headGlow = min(headGlow, 1.0);
    float headInfluence = 1.0 - smoothstep(0.0, 0.12, dBehind);

    // === TRAIL: elongated glow along path ===
    // Trail is ONLY behind the head (d > 0). Ahead of head → only headCore/headGlow.
    // smoothstep(-0.003, 0.01, d): 0 when d < -0.003, 1 when d > 0.01
    float trailMask = smoothstep(-0.003, 0.01, d);

    // Radial: exponential falloff (wide, soft)
    float trailR = exp(-r * 3.0);
    // Longitudinal: slow inverse-distance decay for long visible tail
    float trailD = 1.0 / (dBehind * 2.0 + 0.25);
    float trailGlow = trailR * trailD * 0.18 * trailMask;
    trailGlow = min(trailGlow, 0.8);

    // Core line — decays fast behind head so tail is pure blue glow
    float trailCore = smoothstep(0.03, 0.003, r);
    trailCore *= exp(-dBehind * 15.0) * trailMask;
    trailCore = min(trailCore, 1.0);

    // === COMBINE head + trail ===
    float core = max(trailCore, headCore * headInfluence);
    float glow = trailGlow + headGlow * headInfluence * 0.25;
    glow = min(glow, 1.0);

    // Energy pulse
    float pulse = 1.0 + 0.05 * sin(vUv.x * 50.0 - uTime * 5.0);

    // Color: white core → light blue glow → deep blue outer
    vec3 white     = vec3(1.0);
    vec3 lightBlue = vec3(0.45, 0.75, 1.0);
    vec3 blue      = vec3(0.12, 0.3, 0.85);

    vec3 color = white * core
               + lightBlue * glow * pulse
               + blue * glow * 0.35;

    float alpha = core * 0.85 + glow * 0.65;

    // Ribbon edge fade
    alpha *= 1.0 - smoothstep(0.3, 1.0, r);
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

    const rawProgress = progressRef.current;
    const easedProgress = easeInOutCubic(Math.max(0, Math.min(1, rawProgress)));

    material.uniforms.uProgress.value = easedProgress;
    material.uniforms.uTime.value = elapsedRef.current;
  });

  return (
    <group ref={groupRef} visible={false}>
      <mesh geometry={ribbonGeo} material={material} renderOrder={10} />
    </group>
  );
}
