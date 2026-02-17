'use client';

import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import type { FrameConfig } from './types';
import { easeInOutCubic } from './CameraDirector';

const TRAIL_Z = 0.05;

const trailVert = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const trailFrag = /* glsl */ `
  uniform float uProgress;
  uniform vec3 uColor;
  uniform float uOpacityScale;
  varying vec2 vUv;

  void main() {
    // Don't draw ahead of progress
    if (vUv.x > uProgress + 0.005) discard;

    float distFromHead = max(0.0, uProgress - vUv.x);

    // Head glow — intense at leading edge
    float headGlow = exp(-distFromHead * 15.0);

    // Trail brightness — fades behind head but remains visible
    float trail = exp(-distFromHead * 1.5) * 0.5 + 0.15;

    // Color: white at head, tinted elsewhere
    vec3 color = mix(uColor * trail, vec3(1.0), headGlow * 0.8);
    float alpha = mix(trail, 1.0, headGlow) * uOpacityScale;

    // Smooth entry at start of trail
    alpha *= smoothstep(0.0, 0.015, vUv.x);

    gl_FragColor = vec4(color, alpha);
  }
`;

interface LightTrailProps {
  fromFrame: FrameConfig;
  toFrame: FrameConfig;
  /** Raw global progress (0..1), before easing */
  progressRef: { current: number };
  /** Whether the trail should be visible */
  visibleRef: { current: boolean };
}

export default function LightTrail({
  fromFrame,
  toFrame,
  progressRef,
  visibleRef,
}: LightTrailProps) {
  const { camera } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Mesh>(null);
  const headLightRef = useRef<THREE.PointLight>(null);

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

  // Core tube — thin, bright
  const coreGeo = useMemo(
    () => new THREE.TubeGeometry(trailCurve, 200, 0.03, 8, false),
    [trailCurve]
  );

  // Glow tube — wider, dimmer
  const glowGeo = useMemo(
    () => new THREE.TubeGeometry(trailCurve, 200, 0.12, 8, false),
    [trailCurve]
  );

  const coreMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: trailVert,
        fragmentShader: trailFrag,
        uniforms: {
          uProgress: { value: 0 },
          uColor: { value: new THREE.Color(0x00d4ff) },
          uOpacityScale: { value: 1.0 },
        },
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    []
  );

  const glowMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: trailVert,
        fragmentShader: trailFrag,
        uniforms: {
          uProgress: { value: 0 },
          uColor: { value: new THREE.Color(0x0055cc) },
          uOpacityScale: { value: 0.35 },
        },
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    []
  );

  useFrame(() => {
    if (!groupRef.current) return;

    const visible = visibleRef.current;
    groupRef.current.visible = visible;
    if (!visible) return;

    // Apply easing to match camera movement speed
    const rawProgress = progressRef.current;
    const easedProgress = easeInOutCubic(Math.max(0, Math.min(1, rawProgress)));

    coreMat.uniforms.uProgress.value = easedProgress;
    glowMat.uniforms.uProgress.value = easedProgress;

    // Head sphere + light follow camera XY on wall plane
    const hx = camera.position.x;
    const hy = camera.position.y;

    if (headRef.current) {
      headRef.current.position.set(hx, hy, TRAIL_Z + 0.01);
      // Scale down near start/end of trail
      const edgeDist = Math.min(easedProgress, 1 - easedProgress);
      headRef.current.scale.setScalar(Math.min(1, edgeDist * 10));
    }

    if (headLightRef.current) {
      headLightRef.current.position.set(hx, hy, TRAIL_Z + 0.3);
      headLightRef.current.intensity = Math.min(1, Math.min(easedProgress, 1 - easedProgress) * 10) * 2;
    }
  });

  return (
    <group ref={groupRef} visible={false}>
      {/* Core trail — thin, bright cyan */}
      <mesh geometry={coreGeo} material={coreMat} renderOrder={10} />
      {/* Outer glow — wider, dimmer blue */}
      <mesh geometry={glowGeo} material={glowMat} renderOrder={9} />

      {/* Head sphere — bright point at leading edge */}
      <mesh ref={headRef} renderOrder={11}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.9}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Point light at head — illuminates wall around the leading point */}
      <pointLight
        ref={headLightRef}
        color="#00d4ff"
        intensity={0}
        distance={3}
        decay={2}
      />
    </group>
  );
}
