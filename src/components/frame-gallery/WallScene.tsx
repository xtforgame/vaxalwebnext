'use client';

import * as THREE from 'three';
import PortalFrame from './PortalFrame';
import type { FrameConfig } from './types';

interface WallSceneProps {
  frames: FrameConfig[];
  sceneTextures: {
    videoTexture: THREE.Texture;
    staticTexture: THREE.Texture;
    blendFactor: number;
  }[];
}

/**
 * WallScene renders:
 * - A large flat wall (solid color)
 * - All hexagonal portal frames mounted on the wall
 */
export default function WallScene({ frames, sceneTextures }: WallSceneProps) {
  return (
    <group>
      {/* Wall */}
      <mesh position={[0, 0, -0.5]} receiveShadow>
        <planeGeometry args={[30, 15]} />
        <meshStandardMaterial color="#1a1a2e" />
      </mesh>

      {/* Frames */}
      {frames.map((frame, i) => (
        <PortalFrame
          key={frame.id}
          config={frame}
          videoTexture={sceneTextures[i].videoTexture}
          staticTexture={sceneTextures[i].staticTexture}
          blendFactor={sceneTextures[i].blendFactor}
        />
      ))}
    </group>
  );
}
