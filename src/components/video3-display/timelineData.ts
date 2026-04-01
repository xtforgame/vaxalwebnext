import type { TimelineAction } from '@/components/video-player';

// ─── Configuration ───────────────────────────────────────────────
export const VIDEO_SRC = '/large-videos/assistant.mov';
export const VIDEO_ASPECT = 4096 / 2206;

// ─── Demo Timeline ──────────────────────────────────────────────
let START_TIME = 0;

export const TIMELINE: TimelineAction[] = [
  //
  { type: 'seek', time: START_TIME + 0, to: 0 },
  { type: 'play', time: START_TIME + 0 },
  { type: 'speed', time: START_TIME + 0, rate: 1 },

  //
  {
    type: 'zoom',
    time: START_TIME += 3,
    scale: 2,
    focal: [0.9, 0.9],
    duration: 1,
    easing: 'easeInOutCubic',
  },
  { type: 'speed', time: START_TIME, rate: 0.5 },

  //
  {
    type: 'zoom',
    time: START_TIME += 2,
    scale: 1,
    focal: [0.5, 0.5],
    duration: 1,
    easing: 'easeInOutCubic',
  },

  //
  { type: 'speed', time: START_TIME += 1, rate: 4 },


  // { type: 'overlay-show', time: START_TIME, text: '雙手放開，交給AI' },


  // //
  // { type: 'speed', time: START_TIME += 20, rate: 2 },
  // { type: 'overlay-hide', time: START_TIME },
  // { type: 'pause', time: START_TIME },
  // { type: 'seek', time: START_TIME, to: 36 },
  // { type: 'play', time: START_TIME },


  { type: 'speed', time: START_TIME += 8, rate: 2 },

  //
  {
    type: 'zoom',
    time: START_TIME += 3,
    scale: 2,
    focal: [0.9, 0.9],
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
  { type: 'pause', time: START_TIME += 1 },
];
