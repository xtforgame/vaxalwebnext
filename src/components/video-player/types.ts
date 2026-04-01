// ─── Easing ──────────────────────────────────────────────────────
export type EasingName =
  | 'linear'
  | 'easeInCubic'
  | 'easeOutCubic'
  | 'easeInOutCubic';

export type EasingFn = (t: number) => number;

export const EASING_MAP: Record<EasingName, EasingFn> = {
  linear: (t) => t,
  easeInCubic: (t) => t * t * t,
  easeOutCubic: (t) => 1 - Math.pow(1 - t, 3),
  easeInOutCubic: (t) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
};

// ─── Action Types (discriminated union) ──────────────────────────
interface ActionBase {
  time: number; // wall-clock seconds
}

export interface PlayAction extends ActionBase {
  type: 'play';
}

export interface PauseAction extends ActionBase {
  type: 'pause';
}

export interface SeekAction extends ActionBase {
  type: 'seek';
  to: number; // video timestamp in seconds
}

export interface SpeedAction extends ActionBase {
  type: 'speed';
  rate: number; // target playback rate
  duration?: number; // seconds for gradual change (omit = instant)
  easing?: EasingName; // default 'easeInCubic'
}

export interface ZoomAction extends ActionBase {
  type: 'zoom';
  scale: number; // 1 = fit screen, 2 = 2× zoom, etc.
  focal: [number, number]; // normalised [0,1]: (0,0)=top-left, (0.5,0.5)=centre
  duration: number; // seconds
  easing?: EasingName; // default 'easeInCubic'
}

// ─── Cursor Action Types ─────────────────────────────────────────
export interface CursorShowAction extends ActionBase {
  type: 'cursor-show';
  position: [number, number]; // normalised [0,1]: (0,0)=top-left
}

export interface CursorHideAction extends ActionBase {
  type: 'cursor-hide';
}

export interface CursorMoveAction extends ActionBase {
  type: 'cursor-move';
  to: [number, number]; // normalised target position
  duration: number;
  easing?: EasingName; // default 'easeInOutCubic'
}

export interface CursorClickAction extends ActionBase {
  type: 'cursor-click';
}

// ─── Overlay Action Types ────────────────────────────────────────
export interface OverlayShowAction extends ActionBase {
  type: 'overlay-show';
  text?: string; // text displayed below the gears
}

export interface OverlayHideAction extends ActionBase {
  type: 'overlay-hide';
}

export type TimelineAction =
  | PlayAction
  | PauseAction
  | SeekAction
  | SpeedAction
  | ZoomAction
  | CursorShowAction
  | CursorHideAction
  | CursorMoveAction
  | CursorClickAction
  | OverlayShowAction
  | OverlayHideAction;
