import type { TimelineAction } from '@/components/video-player';

// ─── Configuration ───────────────────────────────────────────────
export const VIDEO_SRC = '/large-videos/reimbursement.mov';
export const VIDEO_ASPECT = 4096 / 2206;

// ─── Demo Timeline ──────────────────────────────────────────────
let START_TIME = 0;

export const TIMELINE: TimelineAction[] = [
  // 0s — start from 10s mark
  { type: 'seek', time: START_TIME + 0, to: 7 },
  { type: 'play', time: START_TIME + 0 },
  { type: 'speed', time: START_TIME + 0, rate: 2 },

  // 1s — cursor appears at centre
  {
    type: 'zoom',
    time: START_TIME += 2,
    scale: 2,
    focal: [0.5, 0.9],
    duration: 1,
    easing: 'easeInOutCubic',
  },

  // 2s — cursor moves to upper-right (previewing the zoom target)
  // { type: 'cursor-show', time: START_TIME + 3.5, position: [0.5, 0.5] },
  // { type: 'cursor-move', time: START_TIME + 3.5, to: [0.38, 0.95], duration: 1, easing: 'easeInOutCubic' },
  // { type: 'cursor-click', time: START_TIME + 4.5 },
  // { type: 'cursor-hide', time: START_TIME + 6 },

  // 5s — slow-mo while zoomed
  // {
  //   type: 'speed',
  //   time: START_TIME + 5,
  //   rate: 0.3,
  //   duration: 1,
  //   easing: 'easeOutCubic',
  // },

  // 6s — cursor hides while zoomed
  

  // 7s — zoom out to full view
  {
    type: 'zoom',
    time: START_TIME += 4,
    scale: 1,
    focal: [0.5, 0.5],
    duration: 1,
    easing: 'easeInOutCubic',
  },

  // 10s — fast-forward + gear overlay
  { type: 'speed', time: START_TIME += 1.5, rate: 12 },
  { type: 'overlay-show', time: START_TIME, text: 'AI處理中...' },


  // 12s — normal speed + hide overlay + zoom to centre
  { type: 'speed', time: START_TIME += 2, rate: 2 },
  { type: 'overlay-hide', time: START_TIME },

  { type: 'pause', time: START_TIME },
  { type: 'seek', time: START_TIME, to: 191 },
  { type: 'play', time: START_TIME },

  { type: 'pause', time: START_TIME += 104.5 },
];
