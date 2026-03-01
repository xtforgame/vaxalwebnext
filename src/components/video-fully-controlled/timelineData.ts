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
  time: number; // wall-clock seconds — use START_TIME + n
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

export type TimelineAction =
  | PlayAction
  | PauseAction
  | SeekAction
  | SpeedAction
  | ZoomAction;

// ─── Configuration ───────────────────────────────────────────────
export const VIDEO_SRC = '/video/BigBuckBunny.mp4';
export const VIDEO_ASPECT = 16 / 9;

// ─── Demo Timeline ──────────────────────────────────────────────
const START_TIME = 0;

export const TIMELINE: TimelineAction[] = [
  // 0s — start from 10s mark
  { type: 'seek', time: START_TIME + 0, to: 10 },
  { type: 'play', time: START_TIME + 0 },

  // 3s — slow zoom into upper-right
  {
    type: 'zoom',
    time: START_TIME + 3,
    scale: 2,
    focal: [0.75, 0.3],
    duration: 2,
    easing: 'easeInOutCubic',
  },

  // 5s — slow-mo while zoomed
  {
    type: 'speed',
    time: START_TIME + 5,
    rate: 0.3,
    duration: 1,
    easing: 'easeOutCubic',
  },

  // 7s — zoom out to full view
  {
    type: 'zoom',
    time: START_TIME + 7,
    scale: 1,
    focal: [0.5, 0.5],
    duration: 1.5,
    easing: 'easeInOutCubic',
  },

  // 8s — back to normal speed
  {
    type: 'speed',
    time: START_TIME + 8,
    rate: 1,
    duration: 0.5,
    easing: 'easeInCubic',
  },

  // 10s — fast-forward
  { type: 'speed', time: START_TIME + 10, rate: 3 },

  // 12s — normal speed + zoom to centre (simultaneous)
  { type: 'speed', time: START_TIME + 12, rate: 1 },
  {
    type: 'zoom',
    time: START_TIME + 12,
    scale: 1.5,
    focal: [0.5, 0.5],
    duration: 1,
    easing: 'easeOutCubic',
  },

  // 14s — dramatic zoom to bottom-left
  {
    type: 'zoom',
    time: START_TIME + 14,
    scale: 3,
    focal: [0.2, 0.8],
    duration: 2,
    easing: 'easeInCubic',
  },

  // 16s — snap back
  {
    type: 'zoom',
    time: START_TIME + 16,
    scale: 1,
    focal: [0.5, 0.5],
    duration: 0.5,
    easing: 'easeOutCubic',
  },

  // 17s — seek to 60s + slow-mo
  { type: 'seek', time: START_TIME + 17, to: 60 },
  { type: 'speed', time: START_TIME + 17, rate: 0.5 },

  // 19s — speed up + zoom simultaneously
  {
    type: 'speed',
    time: START_TIME + 19,
    rate: 2,
    duration: 1,
    easing: 'easeInOutCubic',
  },
  {
    type: 'zoom',
    time: START_TIME + 19,
    scale: 2.5,
    focal: [0.6, 0.4],
    duration: 2,
    easing: 'easeInOutCubic',
  },

  // 22s — zoom out + pause
  {
    type: 'zoom',
    time: START_TIME + 22,
    scale: 1,
    focal: [0.5, 0.5],
    duration: 1,
    easing: 'easeOutCubic',
  },
  { type: 'pause', time: START_TIME + 23 },
];
