import type { TimelineAction } from '@/components/video-player';

// ─── Configuration ───────────────────────────────────────────────
export const VIDEO_SRC = '/large-videos/doble.mov';
export const VIDEO_ASPECT = 4096 / 2206;

// ─── Demo Timeline ──────────────────────────────────────────────
let START_TIME = 0;

export const TIMELINE: TimelineAction[] = [
  //
  { type: 'seek', time: START_TIME + 0, to: 3.5 },
  { type: 'play', time: START_TIME + 0 },
  { type: 'speed', time: START_TIME + 0, rate: 1 },

  { type: 'pause', time: START_TIME += 55 },
];
