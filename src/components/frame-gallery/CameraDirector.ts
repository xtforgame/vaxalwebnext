import * as THREE from 'three';
import type { FrameConfig } from './types';
import { pcbPointAt } from './PcbPath';

/**
 * Easing: cubic ease-in-out for smooth start/stop.
 */
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export const IMMERSED_Z = -6;
export const VIEWPORT_DIST = 6;
export const RESTING_Z = -0.1;

const OVERVIEW_Z = 18;

/**
 * Phase durations (must match TransitionController).
 */
const PHASE_DUR = {
  exiting: 2.5,
  overview: 0.3,
  panning: 4.0,
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

// Z profile phase boundaries (fractions of total eased progress)
const EXIT_END = PHASE_DUR.exiting / TOTAL_DUR;
const PAN_END = (PHASE_DUR.exiting + PHASE_DUR.overview + PHASE_DUR.panning) / TOTAL_DUR;

// XY panning range — overlaps with exit/enter for seamless flow.
// Starts midway through exit (camera already partly pulled out),
// ends midway through enter (camera starts descending while still panning).
const XY_START = EXIT_END * 0.5;
const XY_END = PAN_END + (1.0 - PAN_END) * 0.5;

/**
 * CameraDirector — PCB trace polyline path.
 *
 * XY and Z are INDEPENDENT channels that overlap in time:
 * - XY: starts panning midway through exit, finishes midway through enter
 * - Z:  smooth pull-out during exit, hold, smooth push-in during enter
 *
 * This overlap eliminates dead pauses at phase boundaries.
 * Camera ALWAYS faces -Z (rotation 0,0,0). Only position changes.
 */
export class CameraDirector {
  private fromXY: THREE.Vector2;
  private toXY: THREE.Vector2;

  constructor(fromFrame: FrameConfig, toFrame: FrameConfig) {
    this.fromXY = new THREE.Vector2(fromFrame.wallPosition.x, fromFrame.wallPosition.y);
    this.toXY = new THREE.Vector2(toFrame.wallPosition.x, toFrame.wallPosition.y);
  }

  evaluate(globalProgress: number): { position: THREE.Vector3 } {
    const eased = easeInOutCubic(Math.max(0, Math.min(1, globalProgress)));

    // === XY: PCB polyline, overlapping with exit/enter ===
    let x: number, y: number;
    if (eased <= XY_START) {
      x = this.fromXY.x;
      y = this.fromXY.y;
    } else if (eased >= XY_END) {
      x = this.toXY.x;
      y = this.toXY.y;
    } else {
      const panT = (eased - XY_START) / (XY_END - XY_START);
      const pt = pcbPointAt(panT);
      x = pt.x;
      y = pt.y;
    }

    // === Z: independent exit/enter profile ===
    let z: number;
    if (eased <= EXIT_END) {
      const p = easeInOutCubic(eased / EXIT_END);
      z = THREE.MathUtils.lerp(IMMERSED_Z, OVERVIEW_Z, p);
    } else if (eased <= PAN_END) {
      z = OVERVIEW_Z;
    } else {
      const p = easeInOutCubic((eased - PAN_END) / (1 - PAN_END));
      z = THREE.MathUtils.lerp(OVERVIEW_Z, IMMERSED_Z, p);
    }

    return { position: new THREE.Vector3(x, y, z) };
  }

  /**
   * Map phase + phaseProgress to a global 0..1 value using elapsed time ratios.
   */
  static phaseToGlobal(
    phase: 'exiting' | 'overview' | 'panning' | 'entering',
    phaseProgress: number
  ): number {
    const p = Math.max(0, Math.min(1, phaseProgress));
    return (PHASE_START[phase] + p * PHASE_DUR[phase]) / TOTAL_DUR;
  }
}
