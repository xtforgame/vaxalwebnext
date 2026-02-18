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
 * Used to compute time-proportional global progress.
 */
const PHASE_DUR = {
  exiting: 2.5,
  overview: 1.5,
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

// Phase boundaries as fractions of total duration
const EXIT_END = PHASE_DUR.exiting / TOTAL_DUR;
const OVER_END = (PHASE_DUR.exiting + PHASE_DUR.overview) / TOTAL_DUR;
const PAN_END = (PHASE_DUR.exiting + PHASE_DUR.overview + PHASE_DUR.panning) / TOTAL_DUR;

/**
 * CameraDirector — PCB trace polyline path.
 *
 * XY and Z are independent channels:
 * - XY: follows the PCB polyline during panning, stays at frame center otherwise
 * - Z:  smooth pull-out / push-in via eased interpolation
 *
 * Camera ALWAYS faces -Z (rotation 0,0,0). Only position changes.
 */
export class CameraDirector {
  private fromXY: THREE.Vector2;
  private toXY: THREE.Vector2;

  constructor(fromFrame: FrameConfig, toFrame: FrameConfig) {
    this.fromXY = new THREE.Vector2(fromFrame.wallPosition.x, fromFrame.wallPosition.y);
    this.toXY = new THREE.Vector2(toFrame.wallPosition.x, toFrame.wallPosition.y);
  }

  /**
   * Given a global progress 0..1, returns camera position.
   * Global easeInOutCubic is applied, then phase-specific behavior.
   */
  evaluate(globalProgress: number): { position: THREE.Vector3 } {
    const eased = easeInOutCubic(Math.max(0, Math.min(1, globalProgress)));

    let x: number, y: number, z: number;

    if (eased <= EXIT_END) {
      // Exiting: XY at frame A, Z rises from IMMERSED to OVERVIEW
      const p = easeInOutCubic(eased / EXIT_END);
      x = this.fromXY.x;
      y = this.fromXY.y;
      z = THREE.MathUtils.lerp(IMMERSED_Z, OVERVIEW_Z, p);
    } else if (eased <= OVER_END) {
      // Overview: XY at frame A, Z holds at OVERVIEW
      x = this.fromXY.x;
      y = this.fromXY.y;
      z = OVERVIEW_Z;
    } else if (eased <= PAN_END) {
      // Panning: XY follows PCB polyline (linear = constant speed), Z at OVERVIEW
      const panT = (eased - OVER_END) / (PAN_END - OVER_END);
      const pt = pcbPointAt(panT);
      x = pt.x;
      y = pt.y;
      z = OVERVIEW_Z;
    } else {
      // Entering: XY at frame B, Z descends from OVERVIEW to IMMERSED
      const p = easeInOutCubic((eased - PAN_END) / (1 - PAN_END));
      x = this.toXY.x;
      y = this.toXY.y;
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
