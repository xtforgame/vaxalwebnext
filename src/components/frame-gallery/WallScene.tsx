'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
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
 * DIAGNOSTIC — Step 6: stencil-buffer wall with puzzle holes.
 *
 * Approach (avoids earcut entirely):
 * 1. Render puzzle shapes into stencil buffer (no color/depth write)
 * 2. Render wall quad — skips pixels where stencil == 1 (the holes)
 * 3. Video planes behind the wall show through the holes
 */
export default function WallScene({ frames, sceneTextures, trailProgressRef, trailVisibleRef }: WallSceneProps) {
  const posA = frames[0].wallPosition;
  const posB = frames[1].wallPosition;

  // Flat puzzle shapes for stencil masks (confirmed clean in Step 1)
  const puzzleGeoA = useMemo(() => {
    const shape = createPuzzleShape(2.55);
    return new THREE.ShapeGeometry(shape, 24);
  }, []);

  const puzzleGeoB = useMemo(() => {
    const shape = createPuzzleShape(2.55);
    return new THREE.ShapeGeometry(shape, 24);
  }, []);

  return (
    <group>
      {/* Video planes behind wall */}
      <mesh position={[posA.x, posA.y, -0.2]}>
        <planeGeometry args={[10, 10 * (9 / 16)]} />
        <meshBasicMaterial
          map={sceneTextures[0].videoTexture}
          toneMapped={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[posB.x, posB.y, -0.2]}>
        <planeGeometry args={[10, 10 * (9 / 16)]} />
        <meshBasicMaterial
          map={sceneTextures[1].videoTexture}
          toneMapped={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Stencil pass: write 1 where puzzle shapes are (no color, no depth) */}
      <mesh position={[posA.x, posA.y, 0]} renderOrder={0}>
        <primitive object={puzzleGeoA} attach="geometry" />
        <meshBasicMaterial
          colorWrite={false}
          depthWrite={false}
          stencilWrite={true}
          stencilRef={1}
          stencilFunc={THREE.AlwaysStencilFunc}
          stencilZPass={THREE.ReplaceStencilOp}
        />
      </mesh>
      <mesh position={[posB.x, posB.y, 0]} renderOrder={0}>
        <primitive object={puzzleGeoB} attach="geometry" />
        <meshBasicMaterial
          colorWrite={false}
          depthWrite={false}
          stencilWrite={true}
          stencilRef={1}
          stencilFunc={THREE.AlwaysStencilFunc}
          stencilZPass={THREE.ReplaceStencilOp}
        />
      </mesh>

      {/* Wall: renders only where stencil != 1 (i.e. NOT in puzzle holes) */}
      <mesh position={[0, 0, 0]} renderOrder={1}>
        <planeGeometry args={[35, 22]} />
        <meshBasicMaterial
          color="#1a1a2e"
          side={THREE.FrontSide}
          stencilWrite={true}
          stencilFunc={THREE.NotEqualStencilFunc}
          stencilRef={1}
          stencilFail={THREE.KeepStencilOp}
          stencilZFail={THREE.KeepStencilOp}
          stencilZPass={THREE.KeepStencilOp}
        />
      </mesh>
    </group>
  );
}
