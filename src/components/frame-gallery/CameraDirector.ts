import * as THREE from 'three';
import type { FrameConfig } from './types';

/**
 * Easing: cubic ease-in-out for smooth start/stop.
 */
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Camera Z position when immersed.
 *
 * Content plane (10×5.625) at Z=-0.5. To fill the viewport with FOV=50°:
 *   distance = CONTENT_HEIGHT / (2 * tan(FOV/2))
 *            = 5.625 / (2 * tan(25°)) ≈ 6.03
 *   camera Z = -0.5 - 6.03 ≈ -6.5
 */
export const IMMERSED_Z = -6.5;

/**
 * CameraDirector builds a smooth spline path for the camera to travel
 * from close-up on frame A → pull out through wall → overview → pan →
 * push through wall into frame B.
 *
 * Coordinate system:
 *   Wall at Z = 0 (FrontSide — invisible from behind).
 *   Content planes at Z = -0.5 (behind wall).
 *   Camera immersed at Z ≈ -6.5 (behind wall, content fills viewport).
 *   Camera overview at Z ≈ 14 (in front of wall, both frames visible).
 *
 * The camera physically crosses Z=0 during exiting and entering phases.
 * FrontSide rendering on the wall means:
 *   Z < 0 → wall invisible → full-screen video content
 *   Z > 0 → wall visible → hex holes clip content
 */
export class CameraDirector {
  private positionCurve: THREE.CatmullRomCurve3;
  private lookAtCurve: THREE.CatmullRomCurve3;

  constructor(fromFrame: FrameConfig, toFrame: FrameConfig) {
    const a = fromFrame.wallPosition;
    const b = toFrame.wallPosition;
    const midX = (a.x + b.x) / 2;
    const midY = (a.y + b.y) / 2;

    // Camera position waypoints — crosses Z=0 wall plane
    const posPoints = [
      new THREE.Vector3(a.x, a.y, IMMERSED_Z),          // P0: immersed in A (behind wall)
      new THREE.Vector3(a.x, a.y + 0.3, 3.0),           // P1: pulled out past wall
      new THREE.Vector3(midX, midY + 0.2, 14.0),        // P2: overview (both frames visible)
      new THREE.Vector3(b.x, b.y + 0.3, 3.0),           // P3: approaching B from front
      new THREE.Vector3(b.x, b.y, IMMERSED_Z),          // P4: immersed in B (behind wall)
    ];

    this.positionCurve = new THREE.CatmullRomCurve3(
      posPoints,
      false,
      'catmullrom',
      0.35
    );

    // LookAt target waypoints — always toward the wall/content
    const lookPoints = [
      new THREE.Vector3(a.x, a.y, 0),    // look at wall/content A
      new THREE.Vector3(a.x, a.y, 0),    // still at A
      new THREE.Vector3(midX, midY, 0),   // look at wall center
      new THREE.Vector3(b.x, b.y, 0),    // look at B
      new THREE.Vector3(b.x, b.y, 0),    // look at wall/content B
    ];

    this.lookAtCurve = new THREE.CatmullRomCurve3(
      lookPoints,
      false,
      'catmullrom',
      0.35
    );
  }

  /**
   * Given a global progress value 0..1 across the entire transition,
   * returns the camera position and lookAt target.
   */
  evaluate(globalProgress: number): {
    position: THREE.Vector3;
    lookAt: THREE.Vector3;
  } {
    const t = easeInOutCubic(Math.max(0, Math.min(1, globalProgress)));
    return {
      position: this.positionCurve.getPointAt(t),
      lookAt: this.lookAtCurve.getPointAt(t),
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
