'use client';

import * as THREE from 'three';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';

export default function ParticleBackground({ count = 1000 }) {
  const pointsRef = useRef<THREE.Points>(null);

  const particlesPosition = useMemo(() => {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      // Scatter in a large 3D volume around the camera path
      positions[idx] = (Math.random() - 0.5) * 100;     // x
      positions[idx + 1] = (Math.random() - 0.5) * 40;  // y
      positions[idx + 2] = (Math.random() - 0.5) * 200; // z
    }
    return positions;
  }, [count]);

  useFrame((state) => {
    if (pointsRef.current) {
      // Very slight vertical floating math
      const t = state.clock.elapsedTime;
      pointsRef.current.position.y = Math.sin(t * 0.2) * 2;
      pointsRef.current.rotation.z = Math.sin(t * 0.1) * 0.05;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          args={[particlesPosition, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.15}
        color="#00ffff"
        transparent
        opacity={0.4}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
