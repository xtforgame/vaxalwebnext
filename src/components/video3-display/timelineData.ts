import type { TimelineAction } from '@/components/video-player';

// ─── Configuration ───────────────────────────────────────────────
export const VIDEO_SRC = '/large-videos/assistant.mov';
export const VIDEO_ASPECT = 4096 / 2206;

// ─── Demo Timeline ──────────────────────────────────────────────
let START_TIME = 0;

export const TIMELINE: TimelineAction[] = [
  //
  { type: 'seek', time: START_TIME + 0, to: 6 },
  { type: 'play', time: START_TIME + 0 },
  { type: 'speed', time: START_TIME + 0, rate: 1 },

  //
  {
    type: 'zoom',
    time: START_TIME += 2,
    scale: 2,
    focal: [0.5, 0.9],
    duration: 1,
    easing: 'easeInOutCubic',
  },

  { type: 'speed', time: START_TIME += 1, rate: 4 },


  //
  {
    type: 'zoom',
    time: START_TIME += 2.5,
    scale: 1,
    focal: [0.5, 0.5],
    duration: 1,
    easing: 'easeInOutCubic',
  },

  //
  { type: 'speed', time: START_TIME += 1, rate: 4 },
  { type: 'overlay-show', time: START_TIME, text: 'AI處理中...' },


  //
  { type: 'speed', time: START_TIME += 2, rate: 2 },
  { type: 'overlay-hide', time: START_TIME },
  { type: 'pause', time: START_TIME },
  { type: 'seek', time: START_TIME, to: 36 },
  { type: 'play', time: START_TIME },


  //
  {
    type: 'zoom',
    time: START_TIME += 4,
    scale: 2,
    focal: [0.5, 0.9],
    duration: 1,
    easing: 'easeInOutCubic',
  },
  { type: 'speed', time: START_TIME, rate: 4 },
  //
  {
    type: 'zoom',
    time: START_TIME += 5.5,
    scale: 1,
    focal: [0.5, 0.5],
    duration: 1,
    easing: 'easeInOutCubic',
  },

  //
  { type: 'speed', time: START_TIME += 1, rate: 16 },
  { type: 'overlay-show', time: START_TIME, text: 'AI處理中...' },


  { type: 'speed', time: START_TIME += 2, rate: 4 },
  { type: 'overlay-hide', time: START_TIME },

  { type: 'pause', time: START_TIME += 12 },
];
