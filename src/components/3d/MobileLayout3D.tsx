'use client';

import { MeshTransmissionMaterial, RoundedBox, Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';

const GlassMaterial = ({ color = 'white', thickness = 0.5, ...props }) => (
  <MeshTransmissionMaterial
    backside
    backsideThickness={5}
    thickness={thickness}
    samples={10}
    transmission={1}
    clearcoat={1}
    clearcoatRoughness={0}
    chromaticAberration={0.06}
    anisotropy={0.1}
    roughness={0.05}
    distortion={0.1}
    distortionScale={0.1}
    temporalDistortion={0}
    color={color}
    transparent
    opacity={0.9}
    {...props}
  />
);

interface UIElementProps {
  width?: number;
  height?: number;
  depth?: number;
  radius?: number;
  color?: string;
  position?: [number, number, number];
  label?: string;
}

const UIElement = ({ 
  width = 1, 
  height = 1, 
  depth = 0.1, 
  radius = 0.1, 
  color = 'white', 
  position = [0, 0, 0],
  label = ""
}: UIElementProps) => {
  return (
    <group position={position}>
      <RoundedBox args={[width, height, depth]} radius={radius} smoothness={4}>
        <GlassMaterial color={color} thickness={depth * 2} />
      </RoundedBox>
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
    // Subtle overall movement
    group.current.rotation.y = Math.sin(t / 4) / 12;
    group.current.rotation.x = Math.PI / 12 + Math.cos(t / 4) / 18;
  });

  return (
    <group ref={group}>
      {/* 1. Base Device Frame (Deepest) */}
      <UIElement 
        width={4.2} height={8.8} depth={0.4} radius={0.6} 
        color="#f1f5f9" position={[0, 0, 0]} 
      />

      {/* 2. Main Screen Layer */}
      <UIElement 
        width={3.8} height={8.2} depth={0.1} radius={0.4} 
        color="#ffffff" position={[0, 0, 0.5]} 
      />

      {/* 3. Status Bar (Top Layer) */}
      <UIElement 
        width={3.4} height={0.3} depth={0.05} radius={0.08} 
        color="#f8fafc" position={[0, 3.7, 1.0]} 
      />

      {/* 4. Navigation/Header Bar */}
      <UIElement 
        width={3.4} height={0.7} depth={0.08} radius={0.15} 
        color="#ffffff" position={[0, 3.1, 1.5]} 
        label="Vaxal Dashboard"
      />

      {/* 5. Search Bar */}
      <UIElement 
        width={3.2} height={0.6} depth={0.08} radius={0.3} 
        color="#f1f5f9" position={[0, 2.2, 2.0]} 
        label="Search components..."
      />

      {/* 6. Featured Hero Card */}
      <UIElement 
        width={3.2} height={2.0} depth={0.15} radius={0.3} 
        color="#3DB5E6" position={[0, 0.6, 2.5]} 
        label="Premium 3D Visuals"
      />

      {/* 7. Action Items Grid */}
      <group position={[0, -1.0, 3.0]}>
        <UIElement width={0.7} height={0.7} depth={0.1} radius={0.2} color="#ffffff" position={[-1.2, 0, 0]} label="AI" />
        <UIElement width={0.7} height={0.7} depth={0.1} radius={0.2} color="#ffffff" position={[-0.4, 0, 0]} label="Web" />
        <UIElement width={0.7} height={0.7} depth={0.1} radius={0.2} color="#ffffff" position={[0.4, 0, 0]} label="App" />
        <UIElement width={0.7} height={0.7} depth={0.1} radius={0.2} color="#ffffff" position={[1.2, 0, 0]} label="Cloud" />
      </group>

      {/* 8. Content List Items */}
      <group position={[0, -2.4, 3.5]}>
        <UIElement width={3.2} height={0.8} depth={0.08} radius={0.2} color="#ffffff" position={[0, 0, 0]} label="Item Alpha" />
        <UIElement width={3.2} height={0.8} depth={0.08} radius={0.2} color="#ffffff" position={[0, -1.0, 0.5]} label="Item Beta" />
        <UIElement width={3.2} height={0.8} depth={0.08} radius={0.2} color="#ffffff" position={[0, -2.0, 1.0]} label="Item Gamma" />
      </group>

      {/* 9. Bottom Navigation Dock */}
      <UIElement 
        width={3.6} height={0.9} depth={0.15} radius={0.4} 
        color="#1E1B4B" position={[0, -4.0, 4.5]} 
        label="Home  |  Search  |  Settings"
      />
    </group>
  );
}
