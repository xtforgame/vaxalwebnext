'use client';

import { useRef } from 'react';
import { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';

interface VideoPlaneProps {
  id: string;
  position: [number, number, number];
  rotation: [number, number, number];
  material: THREE.MeshBasicMaterial;
  onFocus: (id: string, position: THREE.Vector3, normal: THREE.Vector3) => void;
}

export default function VideoPlane({ id, position, rotation, material, onFocus }: VideoPlaneProps) {
  const meshRef = useRef<THREE.Mesh>(null!);

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    // Stop R3F event propagation so objects behind don't also receive the click
    e.stopPropagation();

    if (!meshRef.current) return;
    const worldPos = new THREE.Vector3();
    meshRef.current.getWorldPosition(worldPos);

    const normal = new THREE.Vector3(0, 0, 1);
    normal.applyQuaternion(meshRef.current.quaternion);

    onFocus(id, worldPos, normal);
  };

  return (
    <mesh
      ref={meshRef}
      position={position}
      rotation={rotation}
      onClick={handleClick}
      onPointerDown={(e) => e.stopPropagation()}
      onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { document.body.style.cursor = 'auto'; }}
      material={material}
    >
      <planeGeometry args={[4, 2.25]} />
    </mesh>
  );
}
