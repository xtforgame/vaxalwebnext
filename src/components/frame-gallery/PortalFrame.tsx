'use client';

import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { createFrameGeometry } from './FrameShapeUtils';
import { CrossfadeShaderMaterial } from './CrossfadeMaterial';
import type { FrameConfig } from './types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Crossfade = 'crossfadeShaderMaterial' as any;
// Side-effect: registers the JSX element via extend()
void CrossfadeShaderMaterial;

interface PortalFrameProps {
  config: FrameConfig;
  videoTexture: THREE.Texture;
  staticTexture: THREE.Texture;
  blendFactor: number; // 0=static, 1=video
  contentVisible: boolean;
}

// Content plane: 16:9 aspect, large enough to fill viewport at immersed Z=-6.5
const CONTENT_WIDTH = 10;
const CONTENT_HEIGHT = CONTENT_WIDTH * (9 / 16); // 5.625

/**
 * PortalFrame renders:
 * 1. A large rectangular content plane BEHIND the wall (crossfade shader)
 * 2. The physical frame border (ring extrusion) at the wall surface
 *
 * The wall (in WallScene) has hexagonal holes that physically mask the content.
 * Camera behind wall (Z<0) → wall invisible (FrontSide) → full-screen content.
 * Camera in front of wall (Z>0) → wall visible → hex clipping appears.
 */
export default function PortalFrame({
  config,
  videoTexture,
  staticTexture,
  blendFactor,
  contentVisible,
}: PortalFrameProps) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const innerRadius = config.radius - config.borderWidth;

  const frameGeo = useMemo(
    () => createFrameGeometry(config.radius, innerRadius, config.frameDepth),
    [config.radius, innerRadius, config.frameDepth]
  );

  // Update blend uniform every frame for smooth crossfade
  useFrame(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.uBlend.value = blendFactor;
    }
  });

  const pos = config.wallPosition;

  return (
    <group position={[pos.x, pos.y, pos.z]}>
      {/* Content surface — large rectangle BEHIND the wall at Z=-0.5 */}
      <mesh position={[0, 0, -0.5]} renderOrder={0} visible={contentVisible}>
        <planeGeometry args={[CONTENT_WIDTH, CONTENT_HEIGHT]} />
        <Crossfade
          ref={materialRef}
          key={CrossfadeShaderMaterial.key}
          uTexA={staticTexture}
          uTexB={videoTexture}
          uBlend={blendFactor}
          toneMapped={false}
          side={THREE.DoubleSide}
        />
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
