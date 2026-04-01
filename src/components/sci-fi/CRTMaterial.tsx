'use client';

import * as THREE from 'three';
import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';

// ---- Shader source ----

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D map;
  uniform float time;
  uniform float scanlineIntensity;
  uniform float scanlineFrequency;
  uniform float scanlineSpeed;
  uniform float vignetteStart;
  uniform float vignetteEnd;
  varying vec2 vUv;

  void main() {
    vec4 texColor = texture2D(map, vUv);

    // Animated CRT scanlines
    float scanline = sin(vUv.y * scanlineFrequency - time * scanlineSpeed) * scanlineIntensity;
    texColor.rgb -= scanline;

    // Radial vignette
    float edgeDist = distance(vUv, vec2(0.5));
    texColor.rgb *= smoothstep(vignetteStart, vignetteEnd, edgeDist);

    gl_FragColor = texColor;
  }
`;

// ---- Props ----

export interface CRTMaterialProps {
  /** Source texture (video, image, render target, etc.) */
  map: THREE.Texture;
  /** Scanline darkness per cycle (default: 0.04) */
  scanlineIntensity?: number;
  /** Number of scanline cycles across the full height (default: 800) */
  scanlineFrequency?: number;
  /** Scanline scroll speed (default: 10) */
  scanlineSpeed?: number;
  /** Vignette outer edge distance (default: 0.8) */
  vignetteStart?: number;
  /** Vignette inner edge distance (default: 0.2) */
  vignetteEnd?: number;
}

// ---- Component ----

export default function CRTMaterial({
  map,
  scanlineIntensity = 0.04,
  scanlineFrequency = 800.0,
  scanlineSpeed = 10.0,
  vignetteStart = 0.8,
  vignetteEnd = 0.2,
}: CRTMaterialProps) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  // Stable uniforms object (created once, mutated in-place)
  const uniformsRef = useRef({
    map: { value: map },
    time: { value: 0 },
    scanlineIntensity: { value: scanlineIntensity },
    scanlineFrequency: { value: scanlineFrequency },
    scanlineSpeed: { value: scanlineSpeed },
    vignetteStart: { value: vignetteStart },
    vignetteEnd: { value: vignetteEnd },
  });

  // Sync prop changes into uniforms
  useEffect(() => {
    const u = uniformsRef.current;
    u.map.value = map;
    u.scanlineIntensity.value = scanlineIntensity;
    u.scanlineFrequency.value = scanlineFrequency;
    u.scanlineSpeed.value = scanlineSpeed;
    u.vignetteStart.value = vignetteStart;
    u.vignetteEnd.value = vignetteEnd;
  }, [
    map,
    scanlineIntensity,
    scanlineFrequency,
    scanlineSpeed,
    vignetteStart,
    vignetteEnd,
  ]);

  // Animate time uniform
  useFrame((state) => {
    uniformsRef.current.time.value = state.clock.getElapsedTime();
  });

  return (
    <shaderMaterial
      ref={materialRef}
      vertexShader={vertexShader}
      fragmentShader={fragmentShader}
      uniforms={uniformsRef.current}
      toneMapped={false}
    />
  );
}
