import * as THREE from 'three';
import type { FrameConfig } from './types';

/**
 * Easing: cubic ease-in-out for smooth start/stop.
 */
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Camera Z when immersed — behind the wall, looking through video plane.
 *
 * Content plane (10×5.625) fills viewport at distance VIEWPORT_DIST with FOV=50°:
 *   distance = CONTENT_HEIGHT / (2 * tan(FOV/2))
 *            = 5.625 / (2 * tan(25°)) ≈ 6.03 → use 6
 *   camera Z = RESTING_Z - VIEWPORT_DIST ≈ -6
 */
export const IMMERSED_Z = -6;

/** Distance from camera to video plane for full-viewport fill */
export const VIEWPORT_DIST = 6;

/** Z position of video planes when resting against the wall */
export const RESTING_Z = -0.1;

/**
 * CameraDirector builds a smooth spline path for the camera position.
 *
 * Camera ALWAYS faces -Z (rotation 0,0,0). Only position changes.
 * The wall at Z=0 naturally appears/disappears as the camera crosses it.
 *
 * Path:
 *   P0: immersed in A (Z=-6, behind wall)
 *   P1: pulled out past wall (Z=+6)
 *   P2: overview (Z=+12, both frames visible)
 *   P3: aligned with B (Z=+6)
 *   P4: immersed in B (Z=-6, behind wall)
 */
export class CameraDirector {
  private positionCurve: THREE.CatmullRomCurve3;

  constructor(fromFrame: FrameConfig, toFrame: FrameConfig) {
    const a = fromFrame.wallPosition;
    const b = toFrame.wallPosition;
    const midX = (a.x + b.x) / 2;
    const midY = (a.y + b.y) / 2;

    const posPoints = [
      new THREE.Vector3(a.x, a.y, IMMERSED_Z),       // P0: immersed in A
      new THREE.Vector3(a.x, a.y + 0.3, 6.0),        // P1: pulled out past wall
      new THREE.Vector3(midX, midY + 0.2, 12.0),      // P2: overview
      new THREE.Vector3(b.x, b.y + 0.3, 6.0),         // P3: approaching B
      new THREE.Vector3(b.x, b.y, IMMERSED_Z),        // P4: immersed in B
    ];

    this.positionCurve = new THREE.CatmullRomCurve3(
      posPoints,
      false,
      'catmullrom',
      0.35
    );
  }

  /**
   * Given a global progress value 0..1, returns only the camera position.
   * Camera rotation is always (0, 0, 0) — set externally.
   */
  evaluate(globalProgress: number): { position: THREE.Vector3 } {
    const t = easeInOutCubic(Math.max(0, Math.min(1, globalProgress)));
    return {
      position: this.positionCurve.getPointAt(t),
    };
  }

  /**
   * Map a phase + phase-progress to a global 0..1 value.
   *
   * Phase distribution:
   *   exiting:   0.00 - 0.30
   *   overview:  0.30 - 0.50
   *   panning:   0.50 - 0.70
   *   entering:  0.70 - 1.00
   */
  static phaseToGlobal(
    phase: 'exiting' | 'overview' | 'panning' | 'entering',
    phaseProgress: number
  ): number {
    const p = Math.max(0, Math.min(1, phaseProgress));
    switch (phase) {
      case 'exiting':
        return 0.0 + p * 0.3;
      case 'overview':
        return 0.3 + p * 0.2;
      case 'panning':
        return 0.5 + p * 0.2;
      case 'entering':
        return 0.7 + p * 0.3;
    }
  }
}
