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
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/**
 * Fragment shader adapted from Shadertoy reference (light-trail.shader).
 *
 * UV.x = position along trail (0..1)
 * UV.y = position across ribbon (0=edge, 0.5=center, 1=edge)
 *
 * Reference techniques:
 *   Inverse-distance glow: .012 * 0.18 / (pSize * length)
 *   Hard core:             smoothstep(0.03, 0.004, pSize * length)
 *   Color:                 sci-fi blue-white (adapted from YELLOW/WHITE)
 */
const trailFrag = /* glsl */ `
  uniform float uProgress;
  uniform float uTime;
  varying vec2 vUv;

  void main() {
    // r = radial distance from center (0 = center, 1 = edge)
    float r = abs(vUv.y - 0.5) * 2.0;

    // d = signed distance from head (positive = behind, negative = ahead)
    float d = uProgress - vUv.x;

    // Aspect-ratio scaling: trail ~14 units long, ribbon ~2.4 wide
    // UV.x=1 ≈ 14 units, r=1 ≈ 1.2 units → scale factor ≈ 12
    float dScaled = d * 12.0;

    // 2D distance from head point (for circular head glow)
    float headDist = length(vec2(dScaled, r));

    // Round discard: behind head always renders, ahead uses circular cutoff
    if (d < 0.0) {
      float aheadDist = length(vec2((-d) * 12.0, r));
      if (aheadDist > 0.6) discard;
    }

    float dBehind = max(0.0, d);

    // === Trail glow (ref: .012 * 0.18 / dist) ===
    // Slow longitudinal decay for long visible tail
    float glow = 0.004 / ((r * 0.25 + 0.02) * (dBehind * 0.5 + 0.06));
    glow = min(glow, 1.5);

    // === Hard core line ===
    float core = smoothstep(0.06, 0.008, r) * smoothstep(0.03, 0.002, dBehind);

    // === Circular head glow (ref: smoothstep(0.03, 0.004, dist)) ===
    float headGlow = smoothstep(0.5, 0.03, headDist);
    float headSoft = 0.015 / (headDist + 0.04);
    headSoft = min(headSoft, 1.0);

    // Subtle energy pulse
    float pulse = 1.0 + 0.05 * sin(vUv.x * 60.0 - uTime * 4.0);

    // Color: white core/head → light blue glow → blue outer
    vec3 white     = vec3(1.0);
    vec3 lightBlue = vec3(0.45, 0.75, 1.0);
    vec3 blue      = vec3(0.15, 0.4, 0.9);

    vec3 color = white * (core + headGlow * 0.7)
               + lightBlue * (glow * 0.5 + headSoft * 0.3) * pulse
               + blue * glow * 0.2;

    float alpha = core + headGlow * 0.8 + glow * 0.4 + headSoft * 0.2;

    // Fade to zero at ribbon edges
    alpha *= smoothstep(1.0, 0.5, r);

    // Smooth entry at trail start
    alpha *= smoothstep(0.0, 0.01, vUv.x);

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

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: trailVert,
        fragmentShader: trailFrag,
        uniforms: {
          uProgress: { value: 0 },
          uTime: { value: 0 },
        },
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    []
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
