import * as THREE from 'three';
import type { FrameConfig } from './types';

/**
 * Easing: cubic ease-in-out for smooth start/stop.
 * Derivative is 0 at t=0 and t=1, giving smooth phase transitions.
 */
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Camera Z when immersed — behind the wall, content fills viewport.
 *
 * Content plane (10×5.625) at distance VIEWPORT_DIST with FOV=50°:
 *   distance = CONTENT_HEIGHT / (2 * tan(FOV/2))
 *            = 5.625 / (2 * tan(25°)) ≈ 6.03 → use 6
 */
export const IMMERSED_Z = -6;

/** Distance from camera to video plane for full-viewport fill */
export const VIEWPORT_DIST = 6;

/** Z position of video planes when resting against the wall */
export const RESTING_Z = -0.1;

/**
 * CameraDirector uses per-phase linear interpolation between waypoints.
 *
 * Each phase lerps between two specific waypoints with its own easing.
 * This guarantees the camera is at the exact correct position at every
 * phase boundary — no misalignment from global spline parameterization.
 *
 * Waypoints:
 *   immersedA  (-3.5, 0, -6)   ← immersed in frame A
 *   pulledOutA (-3.5, 0.3, +6) ← pulled out past wall, aligned with A
 *   overview   (mid, 0.2, +12) ← zoomed out, both frames visible
 *   pulledOutB (+3.5, 0.3, +6) ← aligned with B, in front of wall
 *   immersedB  (+3.5, 0, -6)   ← immersed in frame B
 *
 * Phase → segment:
 *   exiting:  immersedA  → pulledOutA
 *   overview: pulledOutA → overview
 *   panning:  overview   → pulledOutB
 *   entering: pulledOutB → immersedB
 *
 * Camera ALWAYS faces -Z (rotation 0,0,0). Only position changes.
 */
export class CameraDirector {
  private immersedA: THREE.Vector3;
  private pulledOutA: THREE.Vector3;
  private overview: THREE.Vector3;
  private pulledOutB: THREE.Vector3;
  private immersedB: THREE.Vector3;

  constructor(fromFrame: FrameConfig, toFrame: FrameConfig) {
    const a = fromFrame.wallPosition;
    const b = toFrame.wallPosition;
    const midX = (a.x + b.x) / 2;
    const midY = (a.y + b.y) / 2;

    this.immersedA = new THREE.Vector3(a.x, a.y, IMMERSED_Z);
    this.pulledOutA = new THREE.Vector3(a.x, a.y + 0.3, 6.0);
    this.overview = new THREE.Vector3(midX, midY + 0.2, 12.0);
    this.pulledOutB = new THREE.Vector3(b.x, b.y + 0.3, 6.0);
    this.immersedB = new THREE.Vector3(b.x, b.y, IMMERSED_Z);
  }

  /**
   * Given a phase and its progress (0..1), returns the camera position.
   * Each phase interpolates between its own pair of waypoints with easing.
   */
  evaluate(
    phase: 'exiting' | 'overview' | 'panning' | 'entering',
    progress: number
  ): { position: THREE.Vector3 } {
    const t = easeInOutCubic(Math.max(0, Math.min(1, progress)));

    let from: THREE.Vector3;
    let to: THREE.Vector3;

    switch (phase) {
      case 'exiting':
        from = this.immersedA;
        to = this.pulledOutA;
        break;
      case 'overview':
        from = this.pulledOutA;
        to = this.overview;
        break;
      case 'panning':
        from = this.overview;
        to = this.pulledOutB;
        break;
      case 'entering':
        from = this.pulledOutB;
        to = this.immersedB;
        break;
    }

    return {
      position: new THREE.Vector3().lerpVectors(from, to, t),
    };
  }
}
