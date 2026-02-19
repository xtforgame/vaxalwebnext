import * as THREE from 'three';

/**
 * PCB trace waypoints — all segments are exact multiples of 45 degrees.
 * Connects frame A at (-10, 6) to frame B at (10, -6).
 *
 * Angles used: 0° (right), 270° (down), 315° (down-right diagonal).
 */
export const PCB_WAYPOINTS: THREE.Vector2[] = [
  new THREE.Vector2(-10, 6),       // frame A center (hidden by mask)
  new THREE.Vector2(-10, 4.75),    // drop down to avoid socket indent
  new THREE.Vector2(-7, 4.75),     // right, dx=3
  new THREE.Vector2(-5, 4),        // diag ↘, gentle slope
  new THREE.Vector2(-1, 4),        // right, dx=4
  new THREE.Vector2(-1, 2),        // down,  dy=-2
  new THREE.Vector2(1, 0),         // diag ↘, dx=2, dy=-2
  new THREE.Vector2(1, -2),        // down,  dy=-2
  new THREE.Vector2(4, -2),        // right, dx=3
  new THREE.Vector2(6, -4),        // diag ↘, dx=2, dy=-2
  new THREE.Vector2(8, -4),        // right, dx=2
  new THREE.Vector2(10, -4.75),    // approach frame B avoiding socket
  new THREE.Vector2(10, -6),       // frame B center (hidden by mask)
];

/** Cumulative arc-length at each waypoint (precomputed). */
const PCB_CUMULATIVE: number[] = [0];
const PCB_SEG_LENGTHS: number[] = [];
let PCB_TOTAL = 0;

for (let i = 1; i < PCB_WAYPOINTS.length; i++) {
  const len = PCB_WAYPOINTS[i].distanceTo(PCB_WAYPOINTS[i - 1]);
  PCB_SEG_LENGTHS.push(len);
  PCB_TOTAL += len;
  PCB_CUMULATIVE.push(PCB_TOTAL);
}

export const PCB_TOTAL_LENGTH = PCB_TOTAL;

/**
 * Arc-length parameterized point on the polyline.
 * t ∈ [0, 1] → XY position.
 */
export function pcbPointAt(t: number): THREE.Vector2 {
  const clamped = Math.max(0, Math.min(1, t));
  const target = clamped * PCB_TOTAL;

  // Binary search for the segment
  let lo = 0;
  let hi = PCB_CUMULATIVE.length - 2;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (PCB_CUMULATIVE[mid] <= target) lo = mid;
    else hi = mid - 1;
  }

  const segStart = PCB_CUMULATIVE[lo];
  const segLen = PCB_SEG_LENGTHS[lo];
  const localT = segLen > 0 ? (target - segStart) / segLen : 0;

  const a = PCB_WAYPOINTS[lo];
  const b = PCB_WAYPOINTS[lo + 1];
  return new THREE.Vector2(
    a.x + (b.x - a.x) * localT,
    a.y + (b.y - a.y) * localT
  );
}

/**
 * Project an XY position onto the polyline and return the closest t ∈ [0, 1].
 * Uses exact per-segment closest-point projection.
 */
export function pcbClosestT(px: number, py: number): number {
  let bestDist = Infinity;
  let bestGlobalDist = 0;

  for (let i = 0; i < PCB_WAYPOINTS.length - 1; i++) {
    const a = PCB_WAYPOINTS[i];
    const b = PCB_WAYPOINTS[i + 1];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const segLenSq = dx * dx + dy * dy;

    // Project point onto segment, clamped to [0, 1]
    let localT = 0;
    if (segLenSq > 0) {
      localT = ((px - a.x) * dx + (py - a.y) * dy) / segLenSq;
      localT = Math.max(0, Math.min(1, localT));
    }

    const cx = a.x + dx * localT;
    const cy = a.y + dy * localT;
    const dist = (px - cx) * (px - cx) + (py - cy) * (py - cy);

    if (dist < bestDist) {
      bestDist = dist;
      bestGlobalDist = PCB_CUMULATIVE[i] + localT * PCB_SEG_LENGTHS[i];
    }
  }

  return PCB_TOTAL > 0 ? bestGlobalDist / PCB_TOTAL : 0;
}
