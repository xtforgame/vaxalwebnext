import type { TransitionPhase, TransitionState } from './types';

/**
 * Duration of each phase in seconds.
 */
const PHASE_DURATIONS: Record<TransitionPhase, number> = {
  immersed: Infinity, // stays until triggered
  exiting: 2.5,
  overview: 1.5,
  panning: 2.0,
  entering: 2.5,
};

const PHASE_ORDER: TransitionPhase[] = [
  'immersed',
  'exiting',
  'overview',
  'panning',
  'entering',
];

/**
 * TransitionController manages the state machine for the 5-phase
 * camera transition between frames.
 */
export class TransitionController {
  private _state: TransitionState;
  private _elapsed = 0;
  private _running = false;
  private _onPhaseChange?: (phase: TransitionPhase) => void;

  constructor(initialFrame: number) {
    this._state = {
      phase: 'immersed',
      progress: 0,
      fromFrame: initialFrame,
      toFrame: initialFrame,
    };
  }

  get state(): Readonly<TransitionState> {
    return this._state;
  }

  get isRunning(): boolean {
    return this._running;
  }

  set onPhaseChange(cb: (phase: TransitionPhase) => void) {
    this._onPhaseChange = cb;
  }

  /**
   * Start a transition from the current frame to target frame.
   */
  startTransition(toFrame: number): void {
    if (this._running) return;
    this._running = true;
    this._elapsed = 0;
    this._state = {
      phase: 'exiting',
      progress: 0,
      fromFrame: this._state.fromFrame,
      toFrame,
    };
    this._onPhaseChange?.('exiting');
  }

  /**
   * Call every frame with delta time (seconds).
   */
  update(dt: number): void {
    if (!this._running) return;

    this._elapsed += dt;
    const duration = PHASE_DURATIONS[this._state.phase];
    const progress = Math.min(this._elapsed / duration, 1);
    this._state.progress = progress;

    if (progress >= 1) {
      this._advancePhase();
    }
  }

  private _advancePhase(): void {
    const currentIndex = PHASE_ORDER.indexOf(this._state.phase);
    const nextIndex = currentIndex + 1;

    if (nextIndex >= PHASE_ORDER.length) {
      // Transition complete — now immersed in the new frame
      this._running = false;
      this._state = {
        phase: 'immersed',
        progress: 0,
        fromFrame: this._state.toFrame,
        toFrame: this._state.toFrame,
      };
      this._onPhaseChange?.('immersed');
      return;
    }

    const nextPhase = PHASE_ORDER[nextIndex];
    this._elapsed = 0;
    this._state = {
      ...this._state,
      phase: nextPhase,
      progress: 0,
    };
    this._onPhaseChange?.(nextPhase);
  }
}
