import * as THREE from 'three';

export const FRAME_VERT_COUNT = 12;

// Compute correct polygon inset: each vertex offset along bisector of adjacent
// edge normals so that perpendicular distance = t for ALL edges (including 45°).
export function insetCW(pts: [number, number][], t: number): [number, number][] {
  const n = pts.length;
  const out: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const prev = (i - 1 + n) % n;
    const next = (i + 1) % n;
    // Inward normals (right perpendicular for CW winding)
    const dx1 = pts[i][0] - pts[prev][0];
    const dy1 = pts[i][1] - pts[prev][1];
    const l1 = Math.hypot(dx1, dy1) || 1;
    const nx1 = dy1 / l1, ny1 = -dx1 / l1;
    const dx2 = pts[next][0] - pts[i][0];
    const dy2 = pts[next][1] - pts[i][1];
    const l2 = Math.hypot(dx2, dy2) || 1;
    const nx2 = dy2 / l2, ny2 = -dx2 / l2;
    // Bisector scaled so perpendicular offset = t
    const bx = nx1 + nx2, by = ny1 + ny2;
    const dot = bx * nx1 + by * ny1;
    const s = Math.abs(dot) > 1e-10 ? t / dot : t;
    out.push([pts[i][0] + bx * s, pts[i][1] + by * s]);
  }
  return out;
}

// Shared outer contour for frame geometry and glow SDF
export function getFrameContour(w: number, h: number, cutSize: number): [number, number][] {
  const hw = w / 2;
  const hh = h / 2;
  const dipH     = cutSize;
  const peakW    = cutSize * 0.8;
  const brCham   = cutSize * 1.5;
  const stepDrop = cutSize;
  const blFlat   = cutSize * 1.8;
  const bodyTop  = hh - dipH;
  const upperBot = -hh + stepDrop;
  return [
    [-hw, bodyTop],                          // B
    [-hw + dipH, hh],                        // C
    [-hw + dipH + peakW, hh],                // D
    [-hw + 2 * dipH + peakW, bodyTop],       // E
    [hw - peakW - dipH, bodyTop],            // F
    [hw - peakW, hh],                        // G
    [hw, hh],                                // H
    [hw, upperBot + brCham],                 // I
    [hw - brCham, upperBot],                 // BR chamfer end
    [-hw + blFlat + stepDrop, upperBot],     // J
    [-hw + blFlat, -hh],                     // K
    [-hw, -hh],                              // A
  ];
}

export function buildNeonFrameGeometry(
  w: number, h: number, thickness: number, cutSize: number
): THREE.BufferGeometry {
  // Sci-fi frame — dipped body with raised peaks at left & right top corners
  // Built as manual triangle-strip ring to avoid earcut artifacts on concave top.
  //
  //        C──D                  G──H
  //       ╱    ╲________________╱    │  ← body (E–F) LOWER than peaks (C–D, G–H)
  //      B      E              F     │
  //      │                           │
  //      │                           I
  //      │          J______________╱
  //      │         ╱
  //      A───────K

  const outer = getFrameContour(w, h, cutSize);

  // Inner contour — proper polygon inset (uniform perpendicular distance)
  const inner = insetCW(outer, thickness);

  const halfD = thickness / 2;
  const n = outer.length;
  const pos: number[] = [];
  const nrm: number[] = [];
  const ids: number[] = [];
  let vi = 0;
  const v = (x: number, y: number, z: number, nx: number, ny: number, nz: number) => {
    pos.push(x, y, z);
    nrm.push(nx, ny, nz);
    return vi++;
  };

  // Front ring (z = +halfD, normal +Z)
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const a = v(outer[i][0], outer[i][1], halfD, 0, 0, 1);
    const b = v(outer[j][0], outer[j][1], halfD, 0, 0, 1);
    const c = v(inner[j][0], inner[j][1], halfD, 0, 0, 1);
    const d = v(inner[i][0], inner[i][1], halfD, 0, 0, 1);
    ids.push(a, d, c, a, c, b);
  }

  // Back ring (z = -halfD, normal -Z, reversed winding)
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const a = v(outer[i][0], outer[i][1], -halfD, 0, 0, -1);
    const b = v(outer[j][0], outer[j][1], -halfD, 0, 0, -1);
    const c = v(inner[j][0], inner[j][1], -halfD, 0, 0, -1);
    const d = v(inner[i][0], inner[i][1], -halfD, 0, 0, -1);
    ids.push(a, b, c, a, c, d);
  }

  // Outer side faces (outward normals)
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const dx = outer[j][0] - outer[i][0];
    const dy = outer[j][1] - outer[i][1];
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const a = v(outer[i][0], outer[i][1], halfD, nx, ny, 0);
    const b = v(outer[j][0], outer[j][1], halfD, nx, ny, 0);
    const c = v(outer[j][0], outer[j][1], -halfD, nx, ny, 0);
    const d = v(outer[i][0], outer[i][1], -halfD, nx, ny, 0);
    ids.push(a, b, c, a, c, d);
  }

  // Inner side faces (inward normals, toward frame center)
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const dx = inner[j][0] - inner[i][0];
    const dy = inner[j][1] - inner[i][1];
    const len = Math.hypot(dx, dy) || 1;
    const nx = dy / len;
    const ny = -dx / len;
    const a = v(inner[i][0], inner[i][1], halfD, nx, ny, 0);
    const b = v(inner[j][0], inner[j][1], halfD, nx, ny, 0);
    const c = v(inner[j][0], inner[j][1], -halfD, nx, ny, 0);
    const d = v(inner[i][0], inner[i][1], -halfD, nx, ny, 0);
    ids.push(a, d, c, a, c, b);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  geo.setIndex(ids);
  return geo;
}
