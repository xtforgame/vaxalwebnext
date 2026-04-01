'use client';

import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { createFrameGeometry } from './FrameShapeUtils';
import type { FrameConfig } from './types';

const CONTENT_WIDTH = 10;
const CONTENT_HEIGHT = CONTENT_WIDTH * (9 / 16); // 5.625

interface PortalFrameProps {
  config: FrameConfig;
  videoTexture: THREE.Texture;
  /** Ref updated every frame by FrameGallery — avoids React state lag */
  contentZRef: { current: number };
}

/**
 * PortalFrame renders:
 * 1. A large rectangular content plane (video texture, position updated via ref)
 * 2. The physical frame border (ring extrusion) at the wall surface
 */
export default function PortalFrame({
  config,
  videoTexture,
  contentZRef,
}: PortalFrameProps) {
  const contentMeshRef = useRef<THREE.Mesh>(null);
  const innerRadius = config.radius - config.borderWidth;

  const frameGeo = useMemo(
    () => createFrameGeometry(config.radius, innerRadius, config.frameDepth),
    [config.radius, innerRadius, config.frameDepth]
  );

  // Update content plane Z position every frame from ref (no React state lag)
  useFrame(() => {
    if (contentMeshRef.current) {
      contentMeshRef.current.position.z = contentZRef.current;
    }
  });

  const pos = config.wallPosition;

  return (
    <group position={[pos.x, pos.y, pos.z]}>
      {/* Content surface — video only, Z updated via ref in useFrame */}
      <mesh ref={contentMeshRef} renderOrder={0}>
        <planeGeometry args={[CONTENT_WIDTH, CONTENT_HEIGHT]} />
        <meshBasicMaterial map={videoTexture} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>

      {/* Frame border — at wall surface */}
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
