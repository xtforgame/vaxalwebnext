import * as THREE from 'three';

// ─── Video sources (only 2 unique videos) ────────────────────────
export const VIDEO_SOURCES = [
  '/video/BigBuckBunny.mp4',
  '/video/ElephantsDream.mp4',
] as const;

// ─── Plane layout (scattered like memory fragments) ─────────────
export const PLANES = [
  { id: '1', pos: [-10, 5, -3] as [number, number, number], rot: [0.25, 0.6, -0.15] as [number, number, number], videoIdx: 0 },
  { id: '2', pos: [8, 7, -8] as [number, number, number], rot: [-0.3, -0.45, 0.2] as [number, number, number], videoIdx: 1 },
  { id: '3', pos: [-3, -7, -2] as [number, number, number], rot: [0.4, 0.15, 0.35] as [number, number, number], videoIdx: 1 },
  { id: '4', pos: [12, -4, -6] as [number, number, number], rot: [-0.15, -0.7, -0.25] as [number, number, number], videoIdx: 0 },
  { id: '5', pos: [-13, -1, -10] as [number, number, number], rot: [0.5, 0.8, 0.1] as [number, number, number], videoIdx: 0 },
  { id: '6', pos: [4, 9, -11] as [number, number, number], rot: [-0.2, -0.35, 0.45] as [number, number, number], videoIdx: 1 },
  { id: '7', pos: [1, -9, -5] as [number, number, number], rot: [0.35, 0.1, -0.5] as [number, number, number], videoIdx: 0 },
  { id: '8', pos: [-7, 2, -12] as [number, number, number], rot: [-0.4, 0.55, 0.3] as [number, number, number], videoIdx: 1 },
];

// ─── Glass video panels (scattered) ─────────────────────────────
export const GLASS_PANELS = [
  { id: 'g1', pos: [3, 1, 3] as [number, number, number], rot: [0.15, -0.4, 0.2] as [number, number, number], videoIdx: 0, w: 5, h: 3, color: '#fca5a5' },
  { id: 'g2', pos: [-9, 6, -6] as [number, number, number], rot: [-0.3, 0.5, -0.15] as [number, number, number], videoIdx: 1, w: 4, h: 2.5, color: '#bbf7d0' },
  { id: 'g3', pos: [10, -6, -1] as [number, number, number], rot: [0.2, -0.6, 0.35] as [number, number, number], videoIdx: 0, w: 4.5, h: 2.8, color: '#d8b4fe' },
];

// ─── All fragments in tour order ────────────────────────────────
export type FragmentDef = { id: string; pos: [number, number, number]; rot: [number, number, number] };
export const ALL_FRAGMENTS: FragmentDef[] = [...PLANES, ...GLASS_PANELS];

// ─── Fragment titles ────────────────────────────────────────────
export const FRAGMENT_META: Record<string, { title: string; subtitle: string }> = {
  '1': { title: 'Distant Echo', subtitle: 'A memory fading into silence' },
  '2': { title: 'Neon Drift', subtitle: 'Lights bleeding through the void' },
  '3': { title: 'Frozen Pulse', subtitle: 'Time suspended in crystal' },
  '4': { title: 'Solar Wind', subtitle: 'Particles dancing at light speed' },
  '5': { title: 'Deep Current', subtitle: 'Waves beneath the surface' },
  '6': { title: 'Ghost Signal', subtitle: 'Transmission from another world' },
  '7': { title: 'Void Bloom', subtitle: 'Flowers growing in zero gravity' },
  '8': { title: 'Static Dream', subtitle: 'Consciousness between channels' },
  'g1': { title: 'Crystal Memory', subtitle: 'Fragments preserved in glass' },
  'g2': { title: 'Emerald Gate', subtitle: 'Portal to forgotten realms' },
  'g3': { title: 'Amethyst Core', subtitle: 'Energy crystallized in time' },
};

// ─── Camera / tour constants ────────────────────────────────────
export const INITIAL_CAM_POS = new THREE.Vector3(0, 0, 20);
export const INITIAL_LOOK_AT = new THREE.Vector3(0, 0, 0);
export const LERP_SPEED = 3;
export const TOUR_FLIGHT_DURATION = 2; // seconds per flight
export const TOUR_DWELL_TIME = 2500; // ms — enough time to read the title
export const TOUR_VIEW_DISTANCE = 5; // how far camera sits from fragment

export type TourPhase = 'idle' | 'flying-to' | 'dwelling' | 'flying-back';

// ─── Utility functions ──────────────────────────────────────────
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function getFragmentCameraTarget(fragment: FragmentDef): { camPos: THREE.Vector3; lookAt: THREE.Vector3; up: THREE.Vector3 } {
  const pos = new THREE.Vector3(...fragment.pos);
  const euler = new THREE.Euler(...fragment.rot);
  const quat = new THREE.Quaternion().setFromEuler(euler);
  const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(quat);
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(quat);
  const camPos = pos.clone().add(normal.clone().multiplyScalar(TOUR_VIEW_DISTANCE));
  return { camPos, lookAt: pos, up };
}
