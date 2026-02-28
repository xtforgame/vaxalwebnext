'use client';

import * as THREE from 'three';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';

export interface NeonFrameProps {
  /** Frame width in world units */
  width: number;
  /** Frame height in world units */
  height: number;
  /** Neon glow color (default: cyan) */
  color?: string | THREE.Color;
  /** Frame tube thickness (default: 0.05) */
  thickness?: number;
  /** Corner chamfer size (default: 0.4) */
  cutSize?: number;
  /** Base emissive intensity for bloom extraction (default: 3.0) */
  emissiveIntensity?: number;
  /** Sine-wave breathing speed; 0 disables (default: 2) */
  breathingSpeed?: number;
  /** Breathing amplitude (default: 0.5) */
  breathingAmplitude?: number;
  /** Per-frame flicker probability 0-1; 0 disables (default: 0.05) */
  flickerChance?: number;
}

export default function NeonFrame({
  width,
  height,
  color = '#00ffff',
  thickness = 0.05,
  cutSize = 0.4,
  emissiveIntensity = 3.0,
  breathingSpeed = 2,
  breathingAmplitude = 0.5,
  flickerChance = 0.05,
}: NeonFrameProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  const geometry = useMemo(() => {
    const hw = width / 2;
    const hh = height / 2;

    // Outer shape with chamfered corners
    const shape = new THREE.Shape();
    shape.moveTo(-hw + cutSize, hh);
    shape.lineTo(hw - cutSize, hh);
    shape.lineTo(hw, hh - cutSize);
    shape.lineTo(hw, -hh + cutSize);
    shape.lineTo(hw - cutSize, -hh);
    shape.lineTo(-hw + cutSize, -hh);
    shape.lineTo(-hw, -hh + cutSize);
    shape.lineTo(-hw, hh - cutSize);
    shape.lineTo(-hw + cutSize, hh);

    // Inner hole for hollow frame
    const innerHw = hw - thickness;
    const innerHh = hh - thickness;
    const innerCut = cutSize - thickness * 0.4;

    const hole = new THREE.Path();
    hole.moveTo(-innerHw + innerCut, innerHh);
    hole.lineTo(innerHw - innerCut, innerHh);
    hole.lineTo(innerHw, innerHh - innerCut);
    hole.lineTo(innerHw, -innerHh + innerCut);
    hole.lineTo(innerHw - innerCut, -innerHh);
    hole.lineTo(-innerHw + innerCut, -innerHh);
    hole.lineTo(-innerHw, -innerHh + innerCut);
    hole.lineTo(-innerHw, innerHh - innerCut);
    hole.lineTo(-innerHw + innerCut, innerHh);

    shape.holes.push(hole);

    const ge = new THREE.ExtrudeGeometry(shape, {
      depth: thickness,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.02,
      bevelSegments: 3,
      curveSegments: 12,
    });
    ge.translate(0, 0, -thickness / 2);
    return ge;
  }, [width, height, cutSize, thickness]);

  // Breathing glow + occasional flicker
  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.getElapsedTime();
    const mat = meshRef.current.material as THREE.MeshStandardMaterial;

    const breath =
      breathingSpeed > 0
        ? Math.sin(t * breathingSpeed) * breathingAmplitude
        : 0;

    const flicker =
      flickerChance > 0 && Math.random() < flickerChance
        ? Math.random() * 1.5
        : 0;

    mat.emissiveIntensity = emissiveIntensity + breath - flicker;
  });

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshStandardMaterial
        color="#ffffff"
        emissive={color}
        emissiveIntensity={emissiveIntensity}
        roughness={0.2}
        metalness={0.8}
        toneMapped={false}
      />
    </mesh>
  );
}
