import type { TimelineAction } from '@/components/video-player';

// ─── Configuration ───────────────────────────────────────────────
export const VIDEO_SRC = '/large-videos/reimbursement.mov';
export const VIDEO_ASPECT = 4096 / 2206;

// ─── Demo Timeline ──────────────────────────────────────────────
const START_TIME = 0;

export const TIMELINE: TimelineAction[] = [
  // 0s — start from 10s mark
  { type: 'seek', time: START_TIME + 0, to: 10 },
  { type: 'play', time: START_TIME + 0 },

  // 1s — cursor appears at centre
  { type: 'cursor-show', time: START_TIME + 1, position: [0.5, 0.5] },

  // 2s — cursor moves to upper-right (previewing the zoom target)
  { type: 'cursor-move', time: START_TIME + 2, to: [0.75, 0.3], duration: 1, easing: 'easeInOutCubic' },

  // 3s — click + zoom into upper-right
  { type: 'cursor-click', time: START_TIME + 3 },
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

  // 6s — cursor hides while zoomed
  { type: 'cursor-hide', time: START_TIME + 6 },

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

  // 10s — fast-forward + gear overlay
  { type: 'speed', time: START_TIME + 10, rate: 3 },
  { type: 'overlay-show', time: START_TIME + 10, text: 'Fast forwarding...' },

  // 12s — normal speed + hide overlay + zoom to centre
  { type: 'speed', time: START_TIME + 12, rate: 1 },
  { type: 'overlay-hide', time: START_TIME + 12 },
  {
    type: 'zoom',
    time: START_TIME + 12,
    scale: 1.5,
    focal: [0.5, 0.5],
    duration: 1,
    easing: 'easeOutCubic',
  },

  // 13s — cursor reappears, moves toward bottom-left
  { type: 'cursor-show', time: START_TIME + 13, position: [0.5, 0.5] },
  { type: 'cursor-move', time: START_TIME + 13, to: [0.2, 0.8], duration: 1, easing: 'easeInOutCubic' },

  // 14s — click + dramatic zoom to bottom-left
  { type: 'cursor-click', time: START_TIME + 14 },
  {
    type: 'zoom',
    time: START_TIME + 14,
    scale: 3,
    focal: [0.2, 0.8],
    duration: 2,
    easing: 'easeInCubic',
  },

  // 15.5s — cursor hides
  { type: 'cursor-hide', time: START_TIME + 15.5 },

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

  // 18.5s — cursor shows and moves to zoom target
  { type: 'cursor-show', time: START_TIME + 18.5, position: [0.5, 0.5] },
  { type: 'cursor-move', time: START_TIME + 18.5, to: [0.6, 0.4], duration: 0.5, easing: 'easeOutCubic' },
  { type: 'cursor-click', time: START_TIME + 19 },

  // 19s — speed up + zoom + gear overlay simultaneously
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
  { type: 'overlay-show', time: START_TIME + 19, text: 'Analyzing...' },

  // 21s — cursor hides + overlay hides
  { type: 'cursor-hide', time: START_TIME + 21 },
  { type: 'overlay-hide', time: START_TIME + 21 },

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
