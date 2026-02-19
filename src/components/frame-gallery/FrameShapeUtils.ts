import * as THREE from 'three';
import {
  createPuzzleFrameGeometry,
  createWallWithPuzzleHoles,
} from './PuzzleShapeUtils';

/**
 * Create a wall geometry (large rectangle) with puzzle-shaped holes at each frame position.
 * The holes use innerRadius so the frame border ring covers the gap to outerRadius.
 */
export function createWallWithHoles(
  wallWidth: number,
  wallHeight: number,
  holeConfigs: { position: THREE.Vector3; innerRadius: number }[]
): THREE.ShapeGeometry {
  return createWallWithPuzzleHoles(wallWidth, wallHeight, holeConfigs);
}

/**
 * Create an extruded puzzle frame geometry (ring with depth).
 */
export function createFrameGeometry(
  outerRadius: number,
  innerRadius: number,
  depth: number
): THREE.BufferGeometry {
  return createPuzzleFrameGeometry(outerRadius, innerRadius, depth);
}
