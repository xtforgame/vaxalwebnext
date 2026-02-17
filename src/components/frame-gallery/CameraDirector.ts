import * as THREE from 'three';
import type { FrameConfig } from './types';

/**
 * Easing: cubic ease-in-out for smooth start/stop.
 */
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export const IMMERSED_Z = -6;
export const VIEWPORT_DIST = 6;
export const RESTING_Z = -0.1;

/**
 * Phase durations (must match TransitionController).
 * Used to compute time-proportional global progress.
 */
const PHASE_DUR = {
  exiting: 2.5,
  overview: 1.5,
  panning: 2.0,
  entering: 2.5,
} as const;

const TOTAL_DUR =
  PHASE_DUR.exiting + PHASE_DUR.overview + PHASE_DUR.panning + PHASE_DUR.entering;

// Cumulative start times
const PHASE_START = {
  exiting: 0,
  overview: PHASE_DUR.exiting,
  panning: PHASE_DUR.exiting + PHASE_DUR.overview,
  entering: PHASE_DUR.exiting + PHASE_DUR.overview + PHASE_DUR.panning,
} as const;

/**
 * CameraDirector — single CatmullRomCurve3 spline, single global easing.
 *
 * The entire transition is ONE continuous motion with gentle start/end.
 * No per-phase easing → no velocity discontinuities at phase boundaries.
 *
 * Camera ALWAYS faces -Z (rotation 0,0,0). Only position changes.
 */
export class CameraDirector {
  private positionCurve: THREE.CatmullRomCurve3;

  constructor(fromFrame: FrameConfig, toFrame: FrameConfig) {
    const a = fromFrame.wallPosition;
    const b = toFrame.wallPosition;
    const midX = (a.x + b.x) / 2;
    const midY = (a.y + b.y) / 2;

    const posPoints = [
      new THREE.Vector3(a.x, a.y, IMMERSED_Z),        // P0: immersed in A
      new THREE.Vector3(a.x, a.y + 0.3, 6.0),         // P1: pulled out past wall
      new THREE.Vector3(midX, midY + 0.2, 15.0),       // P2: overview
      new THREE.Vector3(b.x, b.y + 0.3, 6.0),          // P3: approaching B
      new THREE.Vector3(b.x, b.y, IMMERSED_Z),         // P4: immersed in B
    ];

    this.positionCurve = new THREE.CatmullRomCurve3(
      posPoints,
      false,
      'catmullrom',
      0.35
    );
  }

  /**
   * Given a global progress 0..1, returns camera position on the spline.
   * A single easeInOutCubic is applied for the entire motion.
   */
  evaluate(globalProgress: number): { position: THREE.Vector3 } {
    const t = easeInOutCubic(Math.max(0, Math.min(1, globalProgress)));
    return {
      position: this.positionCurve.getPointAt(t),
    };
  }

  /**
   * Map phase + phaseProgress to a global 0..1 value using elapsed time ratios.
   *
   * This gives a time-proportional mapping: the camera moves at a speed
   * determined solely by the global easing curve, with no stops at phase
   * boundaries.
   */
  static phaseToGlobal(
    phase: 'exiting' | 'overview' | 'panning' | 'entering',
    phaseProgress: number
  ): number {
    const p = Math.max(0, Math.min(1, phaseProgress));
    return (PHASE_START[phase] + p * PHASE_DUR[phase]) / TOTAL_DUR;
  }
}
