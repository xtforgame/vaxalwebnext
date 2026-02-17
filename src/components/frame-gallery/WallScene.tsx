'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import PortalFrame from './PortalFrame';
import { createWallWithHoles } from './FrameShapeUtils';
import type { FrameConfig } from './types';

interface WallSceneProps {
  frames: FrameConfig[];
  sceneTextures: {
    videoTexture: THREE.Texture;
    staticTexture: THREE.Texture;
    blendFactor: number;
    contentZ: number;
  }[];
}

/**
 * WallScene renders:
 * - A wall with hexagonal holes (FrontSide — invisible from behind)
 * - All portal frames (content behind wall + frame border on wall surface)
 */
export default function WallScene({ frames, sceneTextures }: WallSceneProps) {
  // Wall geometry with hexagonal holes punched at each frame position
  const wallGeo = useMemo(() => {
    const holeConfigs = frames.map((f) => ({
      position: f.wallPosition,
      innerRadius: f.radius - f.borderWidth,
    }));
    return createWallWithHoles(30, 15, holeConfigs);
  }, [frames]);

  return (
    <group>
      {/* Wall with hexagonal holes — at Z=0, FrontSide only */}
      <mesh position={[0, 0, 0]} renderOrder={1}>
        <primitive object={wallGeo} attach="geometry" />
        <meshStandardMaterial color="#1a1a2e" side={THREE.FrontSide} />
      </mesh>

      {/* Frames: content planes (Z=-0.5, behind wall) + border rings (Z=0) */}
      {frames.map((frame, i) => (
        <PortalFrame
          key={frame.id}
          config={frame}
          videoTexture={sceneTextures[i].videoTexture}
          staticTexture={sceneTextures[i].staticTexture}
          blendFactor={sceneTextures[i].blendFactor}
          contentZ={sceneTextures[i].contentZ}
        />
      ))}
    </group>
  );
}
