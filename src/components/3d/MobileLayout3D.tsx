'use client';

import { Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { GlassMaterial } from './GlassMaterial';

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

interface GlassPanelProps {
  width?: number;
  height?: number;
  depth?: number;
  radius?: number;
  color?: string;
  position?: [number, number, number];
  label?: string;
  opacity?: number;
  ior?: number;
  chromaticAberration?: number;
  reflectivity?: number;
  absorption?: number;
}

const GlassPanel = ({
  width = 1,
  height = 1,
  depth = 0.1,
  radius = 0.05,
  color = '#ffffff',
  position = [0, 0, 0],
  label = '',
  opacity = 0.12,
  ior = 1.45,
  chromaticAberration = 0.5,
  reflectivity = 1.0,
  absorption = 3.0,
}: GlassPanelProps) => {
  const geometry = useMemo(
    () => createRoundedBoxGeometry(width, height, depth, radius, 6),
    [width, height, depth, radius]
  );

  return (
    <group position={position}>
      <mesh geometry={geometry} renderOrder={position[2]}>
        <GlassMaterial
          color={color}
          opacity={opacity}
          ior={ior}
          chromaticAberration={chromaticAberration}
          reflectivity={reflectivity}
          envMapIntensity={1.2}
          fresnelPower={1.5}
          thickness={depth}
          absorption={absorption}
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

  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.getElapsedTime();
    group.current.rotation.y = Math.sin(t / 4) / 12;
    group.current.rotation.x = Math.PI / 12 + Math.cos(t / 4) / 18;
    state.invalidate();
  });

  return (
    <group ref={group}>
      {/* 1. Base Device Frame - 淡紫色 */}
      <GlassPanel
        width={4.2}
        height={8.8}
        depth={0.3}
        radius={0.15}
        color="#c4b5fd"
        position={[0, 0, 0]}
        opacity={0.15}
        chromaticAberration={0.3}
      />

      {/* 2. Main Screen Layer - 淡藍色 */}
      <GlassPanel
        width={3.8}
        height={8.2}
        depth={0.08}
        radius={0.04}
        color="#bae6fd"
        position={[0, 0, 0.25]}
        opacity={0.1}
        chromaticAberration={0.4}
      />

      {/* 3. Status Bar - 淡粉色 */}
      <GlassPanel
        width={3.4}
        height={0.3}
        depth={0.04}
        radius={0.02}
        color="#fecdd3"
        position={[0, 3.7, 0.5]}
        opacity={0.12}
      />

      {/* 4. Navigation Header - 淡青色 */}
      <GlassPanel
        width={3.4}
        height={0.7}
        depth={0.06}
        radius={0.03}
        color="#a5f3fc"
        position={[0, 3.1, 0.7]}
        label="Vaxal Dashboard"
        opacity={0.12}
      />

      {/* 5. Search Bar - 淡綠色 */}
      <GlassPanel
        width={3.2}
        height={0.6}
        depth={0.06}
        radius={0.03}
        color="#bbf7d0"
        position={[0, 2.2, 0.9]}
        label="Search..."
        opacity={0.12}
      />

      {/* 6. Hero Card - 天藍色 */}
      <GlassPanel
        width={3.2}
        height={2.0}
        depth={0.12}
        radius={0.06}
        color="#38bdf8"
        position={[0, 0.6, 1.1]}
        label="Premium 3D"
        opacity={0.2}
        chromaticAberration={0.8}
        reflectivity={1.2}
      />

      {/* 7. Action Grid - 各種淡色 */}
      <GlassPanel width={0.7} height={0.7} depth={0.06} radius={0.03} color="#fca5a5" position={[-1.2, -1.0, 1.3]} label="AI" opacity={0.15} />
      <GlassPanel width={0.7} height={0.7} depth={0.06} radius={0.03} color="#fdba74" position={[-0.4, -1.0, 1.3]} label="Web" opacity={0.15} />
      <GlassPanel width={0.7} height={0.7} depth={0.06} radius={0.03} color="#fde047" position={[0.4, -1.0, 1.3]} label="App" opacity={0.15} />
      <GlassPanel width={0.7} height={0.7} depth={0.06} radius={0.03} color="#86efac" position={[1.2, -1.0, 1.3]} label="Cloud" opacity={0.15} />

      {/* 8. List Items - 淡紫/淡藍 */}
      <GlassPanel width={3.2} height={0.8} depth={0.06} radius={0.03} color="#d8b4fe" position={[0, -2.4, 1.5]} label="Item Alpha" opacity={0.12} />
      <GlassPanel width={3.2} height={0.8} depth={0.06} radius={0.03} color="#93c5fd" position={[0, -3.4, 1.7]} label="Item Beta" opacity={0.12} />

      {/* 9. Bottom Navigation - 深藍色玻璃 */}
      <GlassPanel
        width={3.6}
        height={0.9}
        depth={0.12}
        radius={0.06}
        color="#1e3a5f"
        position={[0, -4.0, 1.9]}
        label="Home | Search | Settings"
        opacity={0.25}
        chromaticAberration={0.6}
      />
    </group>
  );
}
