'use client';

import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import LightTrail from './LightTrail';
import { createPuzzleShape } from './PuzzleShapeUtils';
import type { FrameConfig } from './types';

const CONTENT_WIDTH = 10;
const CONTENT_HEIGHT = CONTENT_WIDTH * (9 / 16); // 5.625

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
 * WallScene renders:
 * 1. Video content planes (Z position updated via ref every frame)
 * 2. Stencil-masked wall (puzzle-shaped holes, no earcut)
 * 3. Light trail between frames
 */
export default function WallScene({ frames, sceneTextures, trailProgressRef, trailVisibleRef }: WallSceneProps) {
  const contentMeshRefs = useRef<(THREE.Mesh | null)[]>([]);

  // Flat puzzle shapes for stencil masks (confirmed clean in Step 1)
  const puzzleGeos = useMemo(() => {
    return frames.map((f) => {
      const innerRadius = f.radius - f.borderWidth;
      const shape = createPuzzleShape(innerRadius);
      return new THREE.ShapeGeometry(shape, 24);
    });
  }, [frames]);

  // Update content plane Z positions from refs every frame
  useFrame(() => {
    for (let i = 0; i < frames.length; i++) {
      const mesh = contentMeshRefs.current[i];
      if (mesh) {
        mesh.position.z = sceneTextures[i].contentZRef.current;
      }
    }
  });

  return (
    <group>
      {/* Video content planes — Z updated every frame via ref */}
      {frames.map((f, i) => (
        <mesh
          key={f.id}
          ref={(el) => { contentMeshRefs.current[i] = el; }}
          position={[f.wallPosition.x, f.wallPosition.y, sceneTextures[i].contentZRef.current]}
        >
          <planeGeometry args={[CONTENT_WIDTH, CONTENT_HEIGHT]} />
          <meshBasicMaterial
            map={sceneTextures[i].videoTexture}
            toneMapped={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}

      {/* Stencil pass: write 1 where puzzle shapes are (no color, no depth) */}
      {frames.map((f, i) => (
        <mesh
          key={`stencil-${f.id}`}
          position={[f.wallPosition.x, f.wallPosition.y, 0]}
          rotation={i === 1 ? [0, 0, Math.PI / 2] : undefined}
          renderOrder={0}
        >
          <primitive object={puzzleGeos[i]} attach="geometry" />
          <meshBasicMaterial
            colorWrite={false}
            depthWrite={false}
            stencilWrite={true}
            stencilRef={1}
            stencilFunc={THREE.AlwaysStencilFunc}
            stencilZPass={THREE.ReplaceStencilOp}
          />
        </mesh>
      ))}

      {/* Wall — renders only where stencil != 1 (puzzle holes are transparent) */}
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

      {/* Light trail */}
      <LightTrail
        fromFrame={frames[0]}
        toFrame={frames[1]}
        progressRef={trailProgressRef}
        visibleRef={trailVisibleRef}
      />
    </group>
  );
}
