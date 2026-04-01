'use client';

import { useRef, useMemo } from 'react';
import { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { GlassMaterial } from '@/components/3d/GlassMaterial';

// Copied from MobileLayout3D.tsx (not exported)
function createRoundedBoxGeometry(
  width: number,
  height: number,
  depth: number,
  radius: number,
  segments: number = 8
): THREE.BufferGeometry {
  const maxRadius = Math.min(width, height, depth) / 2;
  const r = Math.min(radius, maxRadius);

  const shape = new THREE.Shape();
  const w = width / 2 - r;
  const h = height / 2 - r;

  shape.moveTo(-w, -height / 2);
  shape.lineTo(w, -height / 2);
  shape.quadraticCurveTo(width / 2, -height / 2, width / 2, -h);
  shape.lineTo(width / 2, h);
  shape.quadraticCurveTo(width / 2, height / 2, w, height / 2);
  shape.lineTo(-w, height / 2);
  shape.quadraticCurveTo(-width / 2, height / 2, -width / 2, h);
  shape.lineTo(-width / 2, -h);
  shape.quadraticCurveTo(-width / 2, -height / 2, -w, -height / 2);

  const extrudeSettings: THREE.ExtrudeGeometryOptions = {
    depth: depth - r * 2,
    bevelEnabled: true,
    bevelThickness: r,
    bevelSize: r,
    bevelOffset: 0,
    bevelSegments: segments,
    curveSegments: segments,
  };

  const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  geometry.translate(0, 0, -(depth - r * 2) / 2 - r);
  geometry.computeVertexNormals();

  return geometry;
}

interface GlassVideoPanelProps {
  id: string;
  position: [number, number, number];
  rotation: [number, number, number];
  width: number;
  height: number;
  depth?: number;
  color?: string;
  material: THREE.MeshBasicMaterial;
  onFocus: (id: string, position: THREE.Vector3, normal: THREE.Vector3) => void;
}

export default function GlassVideoPanel({
  id,
  position,
  rotation,
  width,
  height,
  depth = 0.12,
  color = '#bae6fd',
  material,
  onFocus,
}: GlassVideoPanelProps) {
  const groupRef = useRef<THREE.Group>(null!);

  const glassGeometry = useMemo(
    () => createRoundedBoxGeometry(width, height, depth, 0.06, 6),
    [width, height, depth]
  );

  // Video plane sized to fit within the glass panel (90% scale)
  const videoWidth = width * 0.9;
  const videoHeight = height * 0.9;

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (!groupRef.current) return;

    const worldPos = new THREE.Vector3();
    groupRef.current.getWorldPosition(worldPos);

    const normal = new THREE.Vector3(0, 0, 1);
    groupRef.current.getWorldQuaternion(new THREE.Quaternion()).clone();
    const quat = new THREE.Quaternion();
    groupRef.current.getWorldQuaternion(quat);
    normal.applyQuaternion(quat);

    onFocus(id, worldPos, normal);
  };

  return (
    <group
      ref={groupRef}
      position={position}
      rotation={rotation}
      onClick={handleClick}
      onPointerDown={(e) => e.stopPropagation()}
      onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { document.body.style.cursor = 'auto'; }}
    >
      {/* Glass body */}
      <mesh geometry={glassGeometry}>
        <GlassMaterial
          color={color}
          opacity={0.15}
          ior={1.45}
          chromaticAberration={0.5}
          reflectivity={1.0}
          envMapIntensity={1.2}
          fresnelPower={1.5}
          thickness={depth}
          absorption={3.0}
        />
      </mesh>

      {/* Video surface — at the back of the glass body.
          Full glass thickness sits in front, overlaying the video.
          Offset +0.01 from back face to avoid z-fighting. */}
      <mesh position={[0, 0, -depth / 2 + 0.01]} material={material}>
        <planeGeometry args={[videoWidth, videoHeight]} />
      </mesh>
    </group>
  );
}
