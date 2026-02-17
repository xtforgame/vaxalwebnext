import * as THREE from 'three';
import type { FrameConfig } from './types';

/**
 * Easing: cubic ease-in-out for smooth start/stop.
 */
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * CameraDirector builds a smooth spline path for the camera to travel
 * from close-up on frame A → pull out → overview → pan → push into frame B.
 *
 * Coordinate system:
 *   Wall at Z = 0.
 *   Camera in front of wall at Z > 0.
 *   Immersed = very close (Z ≈ 0.5), hexagon fills viewport.
 *   Overview = pulled back (Z ≈ 9).
 */
export class CameraDirector {
  private positionCurve: THREE.CatmullRomCurve3;
  private lookAtCurve: THREE.CatmullRomCurve3;

  constructor(fromFrame: FrameConfig, toFrame: FrameConfig) {
    const a = fromFrame.wallPosition;
    const b = toFrame.wallPosition;
    const midX = (a.x + b.x) / 2;
    const midY = (a.y + b.y) / 2;

    // Camera position waypoints
    const posPoints = [
      new THREE.Vector3(a.x, a.y, 0.5),         // P0: immersed in A (very close)
      new THREE.Vector3(a.x, a.y + 0.3, 4.5),   // P1: pulling back from A
      new THREE.Vector3(midX, midY + 0.2, 9.0),  // P2: overview (centered, far)
      new THREE.Vector3(b.x, b.y + 0.3, 4.5),   // P3: approaching B
      new THREE.Vector3(b.x, b.y, 0.5),          // P4: immersed in B
    ];

    this.positionCurve = new THREE.CatmullRomCurve3(
      posPoints,
      false,
      'catmullrom',
      0.35
    );

    // LookAt target waypoints — always looking at the wall surface
    const lookPoints = [
      new THREE.Vector3(a.x, a.y, 0),    // look at A center
      new THREE.Vector3(a.x, a.y, 0),    // still at A
      new THREE.Vector3(midX, midY, 0),   // look at wall center
      new THREE.Vector3(b.x, b.y, 0),    // look at B
      new THREE.Vector3(b.x, b.y, 0),    // look at B center
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
