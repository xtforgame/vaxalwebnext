'use client';

import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import type { FrameConfig } from './types';
import { PCB_WAYPOINTS, pcbClosestT } from './PcbPath';

const TRAIL_Z = 0.05;
const RIBBON_HALF_WIDTH = 1.2;

/**
 * Build a flat ribbon along a polyline with proper miter joints at corners.
 * UV.x = 0..1 along the path (arc-length normalized)
 * UV.y = 0..1 across the ribbon width (0.5 = center line)
 */
function createPolylineRibbon(
  waypoints: THREE.Vector2[],
  halfWidth: number,
  z: number
): THREE.BufferGeometry {
  const n = waypoints.length;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  // Cumulative distances for UV.x
  const cumDist: number[] = [0];
  for (let i = 1; i < n; i++) {
    cumDist.push(cumDist[i - 1] + waypoints[i].distanceTo(waypoints[i - 1]));
  }
  const totalLen = cumDist[n - 1];

  // Segment normals (perpendicular, rotated 90° CCW from direction)
  const segNormals: THREE.Vector2[] = [];
  for (let i = 0; i < n - 1; i++) {
    const dx = waypoints[i + 1].x - waypoints[i].x;
    const dy = waypoints[i + 1].y - waypoints[i].y;
    const len = Math.sqrt(dx * dx + dy * dy);
    segNormals.push(new THREE.Vector2(-dy / len, dx / len));
  }

  for (let i = 0; i < n; i++) {
    const uX = totalLen > 0 ? cumDist[i] / totalLen : 0;
    let nx: number, ny: number;

    if (i === 0) {
      // First point: use first segment's normal
      nx = segNormals[0].x;
      ny = segNormals[0].y;
    } else if (i === n - 1) {
      // Last point: use last segment's normal
      nx = segNormals[n - 2].x;
      ny = segNormals[n - 2].y;
    } else {
      // Interior point: miter joint
      const n1 = segNormals[i - 1];
      const n2 = segNormals[i];
      const mx = n1.x + n2.x;
      const my = n1.y + n2.y;
      const mLen = Math.sqrt(mx * mx + my * my);
      if (mLen < 0.001) {
        // Degenerate (180° turn): fallback to first normal
        nx = n1.x;
        ny = n1.y;
      } else {
        // Scale by 1/cos(halfAngle) for correct miter width
        const dot = (mx * n1.x + my * n1.y) / mLen;
        const scale = dot > 0.01 ? 1 / dot : 1;
        nx = (mx / mLen) * scale;
        ny = (my / mLen) * scale;
      }
    }

    const wx = waypoints[i].x;
    const wy = waypoints[i].y;

    // +side vertex (UV.y = 0)
    positions.push(wx + nx * halfWidth, wy + ny * halfWidth, z);
    uvs.push(uX, 0.0);

    // -side vertex (UV.y = 1)
    positions.push(wx - nx * halfWidth, wy - ny * halfWidth, z);
    uvs.push(uX, 1.0);

    if (i < n - 1) {
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

  // Polyline ribbon on the wall surface
  const ribbonGeo = useMemo(
    () => createPolylineRibbon(PCB_WAYPOINTS, RIBBON_HALF_WIDTH, TRAIL_Z),
    []
  );

  const { camera } = useThree();

  // Puzzle shape is taller than wide (SVG aspect ~0.71).
  // Use the narrower half-width so the trail starts at the puzzle edge.
  const hexInner = (fromFrame.radius - fromFrame.borderWidth) * 0.71;

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

    // Exact projection of camera XY onto the PCB polyline
    const bestT = pcbClosestT(camera.position.x, camera.position.y);

    material.uniforms.uProgress.value = bestT;
    material.uniforms.uTime.value = elapsedRef.current;
  });

  return (
    <group ref={groupRef} visible={false}>
      <mesh geometry={ribbonGeo} material={material} renderOrder={10} />
    </group>
  );
}
