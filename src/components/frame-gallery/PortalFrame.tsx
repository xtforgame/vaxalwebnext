'use client';

import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { createHexagonShape, createFrameGeometry } from './FrameShapeUtils';
import type { FrameConfig } from './types';

interface PortalFrameProps {
  config: FrameConfig;
  videoTexture: THREE.Texture;
  staticTexture: THREE.Texture;
  blendFactor: number; // 0=static, 1=video
}

/**
 * PortalFrame renders:
 * 1. A hexagonal content surface (video/static texture)
 * 2. The physical frame border (ring extrusion)
 *
 * When the camera is very close, the hex fills the viewport → immersive.
 * When pulled back, the frame border and wall become visible.
 */
export default function PortalFrame({
  config,
  videoTexture,
  staticTexture,
  blendFactor,
}: PortalFrameProps) {
  const contentRef = useRef<THREE.Mesh>(null);
  const innerRadius = config.radius - config.borderWidth;

  // Hexagonal content surface — the "screen" showing video/image
  const contentGeo = useMemo(() => {
    const shape = createHexagonShape(innerRadius);
    const geo = new THREE.ShapeGeometry(shape);
    // Compute UVs to map 16:9 video into hexagon
    // Center the video in the hexagon, clamping to show the widest portion
    const pos = geo.attributes.position;
    const uvs = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      // Map hexagon coords to 0..1 UV space
      // hexagon width = 2*innerR, height = 2*innerR*sin(60°) = innerR*√3
      const hexWidth = innerRadius * 2;
      const hexHeight = innerRadius * Math.sqrt(3);
      // For 16:9 video, we want to fill the hexagon width
      // and center vertically
      const videoAspect = 16 / 9;
      const hexAspect = hexWidth / hexHeight;

      let u: number, v: number;
      if (hexAspect > videoAspect) {
        // Hex is wider than video — fit by width, crop top/bottom
        u = (x / hexWidth) + 0.5;
        v = (y / (hexWidth / videoAspect)) + 0.5;
      } else {
        // Hex is taller — fit by height, crop left/right
        u = (x / (hexHeight * videoAspect)) + 0.5;
        v = (y / hexHeight) + 0.5;
      }
      uvs[i * 2] = u;
      uvs[i * 2 + 1] = v;
    }
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    return geo;
  }, [innerRadius]);

  // Frame border geometry (extruded ring)
  const frameGeo = useMemo(
    () => createFrameGeometry(config.radius, innerRadius, config.frameDepth),
    [config.radius, innerRadius, config.frameDepth]
  );

  const activeTexture = blendFactor > 0.5 ? videoTexture : staticTexture;

  useFrame(() => {
    if (contentRef.current) {
      const mat = contentRef.current.material as THREE.MeshBasicMaterial;
      if (mat.map !== activeTexture) {
        mat.map = activeTexture;
        mat.needsUpdate = true;
      }
    }
  });

  const pos = config.wallPosition;

  return (
    <group position={[pos.x, pos.y, pos.z]}>
      {/* Content surface — hexagonal "screen" */}
      <mesh
        ref={contentRef}
        geometry={contentGeo}
        renderOrder={1}
      >
        <meshBasicMaterial
          map={activeTexture}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>

      {/* Frame border */}
      <mesh geometry={frameGeo} renderOrder={2}>
        <meshStandardMaterial
          color="#2a2a3e"
          metalness={0.3}
          roughness={0.6}
        />
      </mesh>
    </group>
  );
}
