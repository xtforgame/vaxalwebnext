'use client';

import { Text } from '@react-three/drei';
import { useRef, useMemo } from 'react';
import * as THREE from 'three';

/**
 * Creates a proper 3D rounded box geometry with beveled edges on all axes
 */
function createRoundedBoxGeometry(
  width: number,
  height: number,
  depth: number,
  radius: number,
  segments: number = 8
): THREE.BufferGeometry {
  // Clamp radius to half the smallest dimension
  const maxRadius = Math.min(width, height, depth) / 2;
  const r = Math.min(radius, maxRadius);

  // Create a 2D rounded rectangle shape
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

  // Extrude with bevel to create 3D rounded edges
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

  // Center the geometry (ExtrudeGeometry starts at z=0)
  geometry.translate(0, 0, -(depth - r * 2) / 2 - r);

  geometry.computeVertexNormals();

  return geometry;
}

interface GlassPanelProps {
  width?: number;
  height?: number;
  depth?: number;
  radius?: number;
  color?: string;
  position?: [number, number, number];
  label?: string;
  opacity?: number;
}

const GlassPanel = ({
  width = 1,
  height = 1,
  depth = 0.1,
  radius = 0.05,
  color = '#ffffff',
  position = [0, 0, 0],
  label = '',
  opacity = 0.9,
}: GlassPanelProps) => {
  const geometry = useMemo(
    () => createRoundedBoxGeometry(width, height, depth, radius, 6),
    [width, height, depth, radius]
  );

  return (
    <group position={position}>
      <mesh geometry={geometry}>
        <meshStandardMaterial
          color={color}
          transparent
          opacity={opacity}
          roughness={0.1}
          metalness={0.05}
          envMapIntensity={0.8}
          side={THREE.FrontSide}
        />
      </mesh>
      {label && (
        <Text
          position={[0, 0, depth / 2 + 0.01]}
          fontSize={0.15}
          color="#334155"
          anchorX="center"
          anchorY="middle"
          font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf"
        >
          {label}
        </Text>
      )}
    </group>
  );
};

export default function MobileLayout3D() {
  const group = useRef<THREE.Group>(null);

  return (
    <group ref={group}>
      {/* 1. Base Device Frame */}
      <GlassPanel
        width={4.2}
        height={8.8}
        depth={0.3}
        radius={0.15}
        color="#e2e8f0"
        position={[0, 0, 0]}
        opacity={0.95}
      />

      {/* 2. Main Screen Layer */}
      <GlassPanel
        width={3.8}
        height={8.2}
        depth={0.08}
        radius={0.04}
        color="#ffffff"
        position={[0, 0, 0.25]}
        opacity={0.9}
      />

      {/* 3. Status Bar */}
      <GlassPanel
        width={3.4}
        height={0.3}
        depth={0.04}
        radius={0.02}
        color="#f1f5f9"
        position={[0, 3.7, 0.5]}
        opacity={0.8}
      />

      {/* 4. Navigation Header */}
      <GlassPanel
        width={3.4}
        height={0.7}
        depth={0.06}
        radius={0.03}
        color="#ffffff"
        position={[0, 3.1, 0.7]}
        label="Vaxal Dashboard"
        opacity={0.9}
      />

      {/* 5. Search Bar */}
      <GlassPanel
        width={3.2}
        height={0.6}
        depth={0.06}
        radius={0.03}
        color="#f1f5f9"
        position={[0, 2.2, 0.9]}
        label="Search..."
        opacity={0.85}
      />

      {/* 6. Hero Card */}
      <GlassPanel
        width={3.2}
        height={2.0}
        depth={0.12}
        radius={0.06}
        color="#3DB5E6"
        position={[0, 0.6, 1.1]}
        label="Premium 3D"
        opacity={0.92}
      />

      {/* 7. Action Grid */}
      <group position={[0, -1.0, 1.3]}>
        <GlassPanel width={0.7} height={0.7} depth={0.06} radius={0.03} color="#ffffff" position={[-1.2, 0, 0]} label="AI" />
        <GlassPanel width={0.7} height={0.7} depth={0.06} radius={0.03} color="#ffffff" position={[-0.4, 0, 0]} label="Web" />
        <GlassPanel width={0.7} height={0.7} depth={0.06} radius={0.03} color="#ffffff" position={[0.4, 0, 0]} label="App" />
        <GlassPanel width={0.7} height={0.7} depth={0.06} radius={0.03} color="#ffffff" position={[1.2, 0, 0]} label="Cloud" />
      </group>

      {/* 8. List Items */}
      <group position={[0, -2.4, 1.5]}>
        <GlassPanel width={3.2} height={0.8} depth={0.06} radius={0.03} color="#ffffff" position={[0, 0, 0]} label="Item Alpha" />
        <GlassPanel width={3.2} height={0.8} depth={0.06} radius={0.03} color="#ffffff" position={[0, -1.0, 0.2]} label="Item Beta" />
      </group>

      {/* 9. Bottom Navigation */}
      <GlassPanel
        width={3.6}
        height={0.9}
        depth={0.12}
        radius={0.06}
        color="#1e293b"
        position={[0, -4.0, 1.9]}
        label="Home | Search | Settings"
        opacity={0.95}
      />
    </group>
  );
}
