'use client';

import * as THREE from 'three';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';

interface NeonFrameProps {
  width: number;
  height: number;
  color?: string | THREE.Color;
  thickness?: number; // Used for tube thickness
  cutSize?: number;
}

export default function NeonFrame({
  width,
  height,
  color = '#00ffff',
  thickness = 0.05,
  cutSize = 0.4,
}: NeonFrameProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  // Generate chamfered outer frame as a thick Tube/Extrude
  const geometry = useMemo(() => {
    const hw = width / 2;
    const hh = height / 2;

    const shape = new THREE.Shape();
    shape.moveTo(-hw + cutSize, hh);
    shape.lineTo(hw - cutSize, hh);
    shape.lineTo(hw, hh - cutSize);
    shape.lineTo(hw, -hh + cutSize);
    shape.lineTo(hw - cutSize, -hh);
    shape.lineTo(-hw + cutSize, -hh);
    shape.lineTo(-hw, -hh + cutSize);
    shape.lineTo(-hw, hh - cutSize);
    shape.lineTo(-hw + cutSize, hh); // close loop

    // To make a hollow frame out of a shape, we need an inner shape (hole)
    const innerHw = hw - thickness;
    const innerHh = hh - thickness;
    const innerCut = cutSize - (thickness * 0.4); // adjusted cut for inner
    
    const hole = new THREE.Path();
    hole.moveTo(-innerHw + innerCut, innerHh);
    hole.lineTo(innerHw - innerCut, innerHh);
    hole.lineTo(innerHw, innerHh - innerCut);
    hole.lineTo(innerHw, -innerHh + innerCut);
    hole.lineTo(innerHw - innerCut, -innerHh);
    hole.lineTo(-innerHw + innerCut, -innerHh);
    hole.lineTo(-innerHw, -innerHh + innerCut);
    hole.lineTo(-innerHw, innerHh - innerCut);
    hole.lineTo(-innerHw + innerCut, innerHh); // close loop
    
    shape.holes.push(hole);

    const extrudeSettings = {
      depth: thickness,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.02,
      bevelSegments: 3,
      curveSegments: 12
    };

    const ge = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    // Center the extrusion along Z
    ge.translate(0, 0, -thickness / 2);
    return ge;
  }, [width, height, cutSize, thickness]);

  // Subtle flicker effect or breathing glow
  useFrame((state) => {
    if (meshRef.current) {
      const t = state.clock.getElapsedTime();
      const material = meshRef.current.material as THREE.MeshStandardMaterial;
      
      const baseIntensity = 3.0; // Higher base for real neon
      // Occasional glitch/flicker
      const flicker = Math.random() > 0.95 ? Math.random() * 1.5 : 0;
      // Sine wave breathing
      const breath = Math.sin(t * 2) * 0.5;
      
      material.emissiveIntensity = baseIntensity + breath - flicker;
    }
  });

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshStandardMaterial 
        color="#ffffff" // White core 
        emissive={color} // Colored aura
        emissiveIntensity={3.0} // Base intensity for Bloom
        roughness={0.2}
        metalness={0.8}
        toneMapped={false}
      />
    </mesh>
  );
}
