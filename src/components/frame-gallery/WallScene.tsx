'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import PortalFrame from './PortalFrame';
import LightTrail from './LightTrail';
import { createFrameGeometry } from './FrameShapeUtils';
import { createPuzzleShape } from './PuzzleShapeUtils';
import type { FrameConfig } from './types';

interface WallSceneProps {
  frames: FrameConfig[];
  sceneTextures: {
    videoTexture: THREE.Texture;
    contentZRef: { current: number };
  }[];
  trailProgressRef: { current: number };
  trailVisibleRef: { current: boolean };
}

/**
 * DIAGNOSTIC — incrementally testing each piece.
 * Step 1 (confirmed OK): flat puzzle shape in white
 * Step 2 (current):      new manually-triangulated ring in white
 */
export default function WallScene({ frames, sceneTextures, trailProgressRef, trailVisibleRef }: WallSceneProps) {
  const posA = frames[0].wallPosition;
  const posB = frames[1].wallPosition;

  // Step 1: flat puzzle shape (already confirmed clean)
  const diagFlatGeo = useMemo(() => {
    const shape = createPuzzleShape(2.55);
    return new THREE.ShapeGeometry(shape, 24);
  }, []);

  // Step 2: NEW manually-triangulated ring (bypasses earcut)
  const diagRingGeo = useMemo(() => {
    return createFrameGeometry(2.8, 2.55, 0.3);
  }, []);

  return (
    <group>
      {/* Step 1: flat puzzle shape — white (confirmed OK) */}
      <mesh position={[posA.x, posA.y, 0]}>
        <primitive object={diagFlatGeo} attach="geometry" />
        <meshBasicMaterial color="white" side={THREE.DoubleSide} />
      </mesh>

      {/* Step 3: ring with meshStandardMaterial (confirmed OK) */}
      <mesh position={[posB.x, posB.y, 0]}>
        <primitive object={diagRingGeo} attach="geometry" />
        <meshStandardMaterial color="#8888ff" metalness={0.3} roughness={0.6} />
      </mesh>

      {/* Step 4: video content plane behind the ring */}
      <mesh position={[posB.x, posB.y, -0.2]}>
        <planeGeometry args={[10, 10 * (9 / 16)]} />
        <meshBasicMaterial
          map={sceneTextures[1].videoTexture}
          toneMapped={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}
