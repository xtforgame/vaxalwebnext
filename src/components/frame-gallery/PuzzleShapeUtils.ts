import * as THREE from 'three';

// ============================================================
// SVG path data from /public/Puzzle-1x.svg (hardcoded for SSR safety)
// ============================================================

const PUZZLE_PATH_D =
  'm100.07 882.64c2.9345-0.10743 5.8265 3.0297 4.2363 5.6974-1.3922 2.3355-2.939 4.7579-2.1324 7.6561 0.78521 2.8216 3.2862 4.8967 6.2829 4.8967s5.4974-2.0802 6.2829-4.9025c0.80687-2.899-0.74023-5.3149-2.1324-7.6504-1.5903-2.6677 1.3018-5.8049 4.2362-5.6974 6.6638 0.24396 13.191 1.8264 19.772 2.7738 0.93465-6.6276 2.5107-13.201 2.7527-19.912 0.10661-2.957-3.0066-5.8712-5.654-4.2688-2.3177 1.4029-4.7216 2.9615-7.5978 2.1488-2.8001-0.79125-4.8594-3.3115-4.8594-6.3311 0-3.0197 2.0643-5.5396 4.8651-6.3311 2.8769-0.81309 5.2744 0.7459 7.5921 2.1488 2.6474 1.6025 5.7606-1.3118 5.654-4.2688-0.2421-6.715-1.8125-13.292-2.7498-19.927-6.5838 0.94452-13.111 2.5327-19.775 2.7767-2.9345 0.10742-5.8265-3.0297-4.2362-5.6974 1.3922-2.3355 2.9393-4.7572 2.1324-7.6561-0.78556-2.8223-3.2862-4.9025-6.2829-4.9025s-5.4977 2.0809-6.2829 4.9025c-0.80657 2.8982 0.74022 5.3206 2.1324 7.6561 1.5902 2.6677-1.3018 5.8049-4.2363 5.6974-6.6601-0.24383-13.183-1.832-19.763-2.7767-0.93733 6.6343-2.5135 13.212-2.7556 19.927-0.10662 2.957 3.0066 5.8712 5.654 4.2688 2.3177-1.4029 4.7209-2.9619 7.5978-2.1488 2.8008 0.79157 4.8651 3.3115 4.8651 6.3311 0 3.0197-2.065 5.5399-4.8651 6.3311-2.8762 0.81275-5.2801-0.7459-7.5978-2.1488-2.6474-1.6025-5.7607 1.3118-5.654 4.2688 0.24197 6.7112 1.818 13.285 2.7556 19.915 6.58-0.94471 13.103-2.5329 19.763-2.7767z';

// SVG <g> transform applied to all path coordinates
const GROUP_TX = -77.091;
const GROUP_TY = -812.75;

// ============================================================
// SVG Path Parser (m/c/s/z only, no DOMParser needed)
// ============================================================

interface PathCmd {
  type: 'm' | 'c' | 's' | 'z';
  values: number[];
}

const ARGS_PER_CMD: Record<string, number> = { m: 2, c: 6, s: 4, z: 0 };

function parseSvgPath(d: string): PathCmd[] {
  const re = /([mcszMCSZ])|([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)/gi;
  const tokens: (string | number)[] = [];
  let match: RegExpExecArray | null;
  while ((match = re.exec(d)) !== null) {
    if (match[1]) tokens.push(match[1].toLowerCase());
    else tokens.push(parseFloat(match[2]));
  }

  const commands: PathCmd[] = [];
  let cmd = '';
  let values: number[] = [];

  function flush() {
    if (!cmd) return;
    if (cmd === 'z') {
      commands.push({ type: 'z', values: [] });
    } else {
      const n = ARGS_PER_CMD[cmd];
      for (let i = 0; i + n <= values.length; i += n) {
        commands.push({ type: cmd as PathCmd['type'], values: values.slice(i, i + n) });
      }
    }
  }

  for (const tok of tokens) {
    if (typeof tok === 'string') {
      flush();
      cmd = tok;
      values = [];
    } else {
      values.push(tok);
    }
  }
  flush();

  return commands;
}

// ============================================================
// Build raw shape (for bbox computation only)
// ============================================================

function buildRawShape(commands: PathCmd[]): THREE.Shape {
  const shape = new THREE.Shape();
  let cx = 0,
    cy = 0;
  let prevCp2x = 0,
    prevCp2y = 0;
  let hasPrevCurve = false;

  for (const cmd of commands) {
    switch (cmd.type) {
      case 'm': {
        cx = cmd.values[0] + GROUP_TX;
        cy = cmd.values[1] + GROUP_TY;
        shape.moveTo(cx, cy);
        hasPrevCurve = false;
        break;
      }
      case 'c': {
        const [dx1, dy1, dx2, dy2, dx, dy] = cmd.values;
        const cp1x = cx + dx1,
          cp1y = cy + dy1;
        const cp2x = cx + dx2,
          cp2y = cy + dy2;
        const endx = cx + dx,
          endy = cy + dy;
        shape.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endx, endy);
        prevCp2x = cp2x;
        prevCp2y = cp2y;
        cx = endx;
        cy = endy;
        hasPrevCurve = true;
        break;
      }
      case 's': {
        const [dx2, dy2, dx, dy] = cmd.values;
        const cp1x = hasPrevCurve ? 2 * cx - prevCp2x : cx;
        const cp1y = hasPrevCurve ? 2 * cy - prevCp2y : cy;
        const cp2x = cx + dx2,
          cp2y = cy + dy2;
        const endx = cx + dx,
          endy = cy + dy;
        shape.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endx, endy);
        prevCp2x = cp2x;
        prevCp2y = cp2y;
        cx = endx;
        cy = endy;
        hasPrevCurve = true;
        break;
      }
      case 'z': {
        shape.closePath();
        break;
      }
    }
  }
  return shape;
}

// ============================================================
// Transform params (cached)
// ============================================================

interface TransformParams {
  centerX: number;
  centerY: number;
  scale: number;
}

let _rawShape: THREE.Shape | null = null;
function getRawShape(): THREE.Shape {
  if (!_rawShape) {
    _rawShape = buildRawShape(parseSvgPath(PUZZLE_PATH_D));
  }
  return _rawShape;
}

const _paramCache = new Map<number, TransformParams>();

function getTransformParams(size: number): TransformParams {
  const cached = _paramCache.get(size);
  if (cached) return cached;

  const pts = getRawShape().getPoints(16);
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
  for (const p of pts) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }

  const params: TransformParams = {
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
    scale: size / Math.max((maxX - minX) / 2, (maxY - minY) / 2),
  };
  _paramCache.set(size, params);
  return params;
}

// ============================================================
// Build shape with ACTUAL BEZIER CURVES (transformed coords)
// ============================================================
//
// Key difference from the old approach: we DON'T pre-linearize at
// high resolution (16 divisions/curve). Instead we keep the bezier
// curve objects in the Shape and let ExtrudeGeometry/ShapeGeometry
// sample them via curveSegments.
//
// Why this matters: ExtrudeGeometry generates side wall quads for
// each sampled point. With 16 divisions × ~32 curves = ~512 quads,
// each quad is SUB-PIXEL wide at the curved tab areas. Sub-pixel
// quads render inconsistently, creating shimmer/gaps that shift
// as the camera moves. With curveSegments=4, we get ~128 quads
// with each quad ~4 pixels wide — no rasterization issues.

// curveSegments for ExtrudeGeometry / ShapeGeometry.
// Controls side-wall resolution and cap sampling alike.
const CURVE_SEGMENTS = 24;

function buildBezierShape(size: number): THREE.Shape {
  const { centerX, centerY, scale } = getTransformParams(size);

  // Transform raw SVG coord → centered, Y-flipped, scaled
  const t = (x: number, y: number): [number, number] => [
    (x - centerX) * scale,
    -(y - centerY) * scale,
  ];

  const commands = parseSvgPath(PUZZLE_PATH_D);
  const shape = new THREE.Shape();
  let cx = 0,
    cy = 0;
  let prevCp2x = 0,
    prevCp2y = 0;
  let hasPrevCurve = false;

  for (const cmd of commands) {
    switch (cmd.type) {
      case 'm': {
        cx = cmd.values[0] + GROUP_TX;
        cy = cmd.values[1] + GROUP_TY;
        const [mx, my] = t(cx, cy);
        shape.moveTo(mx, my);
        hasPrevCurve = false;
        break;
      }
      case 'c': {
        const [dx1, dy1, dx2, dy2, dx, dy] = cmd.values;
        const cp1x = cx + dx1,
          cp1y = cy + dy1;
        const cp2x = cx + dx2,
          cp2y = cy + dy2;
        const endx = cx + dx,
          endy = cy + dy;
        const [t1x, t1y] = t(cp1x, cp1y);
        const [t2x, t2y] = t(cp2x, cp2y);
        const [tex, tey] = t(endx, endy);
        shape.bezierCurveTo(t1x, t1y, t2x, t2y, tex, tey);
        prevCp2x = cp2x;
        prevCp2y = cp2y;
        cx = endx;
        cy = endy;
        hasPrevCurve = true;
        break;
      }
      case 's': {
        const [dx2, dy2, dx, dy] = cmd.values;
        const cp1x = hasPrevCurve ? 2 * cx - prevCp2x : cx;
        const cp1y = hasPrevCurve ? 2 * cy - prevCp2y : cy;
        const cp2x = cx + dx2,
          cp2y = cy + dy2;
        const endx = cx + dx,
          endy = cy + dy;
        const [t1x, t1y] = t(cp1x, cp1y);
        const [t2x, t2y] = t(cp2x, cp2y);
        const [tex, tey] = t(endx, endy);
        shape.bezierCurveTo(t1x, t1y, t2x, t2y, tex, tey);
        prevCp2x = cp2x;
        prevCp2y = cp2y;
        cx = endx;
        cy = endy;
        hasPrevCurve = true;
        break;
      }
      case 'z': {
        shape.closePath();
        break;
      }
    }
  }

  return shape;
}

// ============================================================
// Get linearized points (for holes — need reversed winding)
// ============================================================

function getLinearPoints(size: number): THREE.Vector2[] {
  const shape = buildBezierShape(size);
  const pts = shape.getPoints(CURVE_SEGMENTS);

  // Remove near-duplicate closure point
  if (
    pts.length > 3 &&
    pts[pts.length - 1].distanceTo(pts[0]) < size * 0.001
  ) {
    pts.pop();
  }

  // Ensure CCW
  if (THREE.ShapeUtils.isClockWise(pts)) {
    pts.reverse();
  }

  return pts;
}

// ============================================================
// Public API
// ============================================================

/**
 * Create a puzzle piece THREE.Shape with bezier curves,
 * centered at origin, Y-up.
 */
export function createPuzzleShape(size: number): THREE.Shape {
  return buildBezierShape(size);
}

/**
 * Create an extruded puzzle frame geometry (ring with depth).
 *
 * Uses manual triangle-strip triangulation instead of ExtrudeGeometry
 * because earcut (used internally by THREE.js) fails at the concave
 * socket areas of puzzle-shaped holes, creating incorrect triangles.
 *
 * Since outer and inner contours are the same puzzle shape at different
 * scales, their vertices match 1:1, allowing clean quad strips.
 */
export function createPuzzleFrameGeometry(
  outerSize: number,
  innerSize: number,
  depth: number
): THREE.BufferGeometry {
  const outerPts = getLinearPoints(outerSize);
  const innerPts = getLinearPoints(innerSize);
  const N = Math.min(outerPts.length, innerPts.length);
  const halfD = depth / 2;

  // Vertex layout — separate vertices per face for correct normals:
  //   Front cap:   2N (outer+inner at z=+halfD)
  //   Back cap:    2N (outer+inner at z=-halfD)
  //   Outer walls: 2N (front+back per point)
  //   Inner walls: 2N (front+back per point)
  const pos = new Float32Array(N * 8 * 3);
  const nrm = new Float32Array(N * 8 * 3);
  const idx: number[] = [];
  let vi = 0;

  function addVert(x: number, y: number, z: number, nx: number, ny: number, nz: number): number {
    const i3 = vi * 3;
    pos[i3] = x; pos[i3 + 1] = y; pos[i3 + 2] = z;
    nrm[i3] = nx; nrm[i3 + 1] = ny; nrm[i3 + 2] = nz;
    return vi++;
  }

  // ── Front cap (z = +halfD, normal +Z) ──
  const fc = vi;
  for (let i = 0; i < N; i++) {
    addVert(outerPts[i].x, outerPts[i].y, halfD, 0, 0, 1);
    addVert(innerPts[i].x, innerPts[i].y, halfD, 0, 0, 1);
  }
  for (let i = 0; i < N; i++) {
    const n = (i + 1) % N;
    const oi = fc + i * 2, ii = fc + i * 2 + 1;
    const on = fc + n * 2, in_ = fc + n * 2 + 1;
    idx.push(oi, on, ii);
    idx.push(ii, on, in_);
  }

  // ── Back cap (z = -halfD, normal -Z) ──
  const bc = vi;
  for (let i = 0; i < N; i++) {
    addVert(outerPts[i].x, outerPts[i].y, -halfD, 0, 0, -1);
    addVert(innerPts[i].x, innerPts[i].y, -halfD, 0, 0, -1);
  }
  for (let i = 0; i < N; i++) {
    const n = (i + 1) % N;
    const oi = bc + i * 2, ii = bc + i * 2 + 1;
    const on = bc + n * 2, in_ = bc + n * 2 + 1;
    idx.push(oi, ii, on);
    idx.push(ii, in_, on);
  }

  // ── Outer side walls (outward normals) ──
  const os = vi;
  for (let i = 0; i < N; i++) {
    const prev = (i - 1 + N) % N;
    const next = (i + 1) % N;
    const dx = outerPts[next].x - outerPts[prev].x;
    const dy = outerPts[next].y - outerPts[prev].y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = dy / len, ny = -dx / len;
    addVert(outerPts[i].x, outerPts[i].y, halfD, nx, ny, 0);
    addVert(outerPts[i].x, outerPts[i].y, -halfD, nx, ny, 0);
  }
  for (let i = 0; i < N; i++) {
    const n = (i + 1) % N;
    const fi = os + i * 2, bi = os + i * 2 + 1;
    const fn = os + n * 2, bn = os + n * 2 + 1;
    idx.push(fi, bi, fn);
    idx.push(bi, bn, fn);
  }

  // ── Inner side walls (inward normals — facing hole center) ──
  const is_ = vi;
  for (let i = 0; i < N; i++) {
    const prev = (i - 1 + N) % N;
    const next = (i + 1) % N;
    const dx = innerPts[next].x - innerPts[prev].x;
    const dy = innerPts[next].y - innerPts[prev].y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = -dy / len, ny = dx / len;
    addVert(innerPts[i].x, innerPts[i].y, halfD, nx, ny, 0);
    addVert(innerPts[i].x, innerPts[i].y, -halfD, nx, ny, 0);
  }
  for (let i = 0; i < N; i++) {
    const n = (i + 1) % N;
    const fi = is_ + i * 2, bi = is_ + i * 2 + 1;
    const fn = is_ + n * 2, bn = is_ + n * 2 + 1;
    idx.push(fi, fn, bi);
    idx.push(bi, fn, bn);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  geo.setIndex(idx);
  return geo;
}

/**
 * Create a wall with puzzle-shaped holes at each frame position.
 */
export function createWallWithPuzzleHoles(
  wallWidth: number,
  wallHeight: number,
  holeConfigs: { position: THREE.Vector3; innerRadius: number }[]
): THREE.ShapeGeometry {
  const hw = wallWidth / 2;
  const hh = wallHeight / 2;

  const wallShape = new THREE.Shape();
  wallShape.moveTo(-hw, -hh);
  wallShape.lineTo(hw, -hh);
  wallShape.lineTo(hw, hh);
  wallShape.lineTo(-hw, hh);
  wallShape.closePath();

  for (const { position, innerRadius } of holeConfigs) {
    const pts = getLinearPoints(innerRadius);
    const hole = new THREE.Path();
    const last = pts.length - 1;
    hole.moveTo(position.x + pts[last].x, position.y + pts[last].y);
    for (let i = last - 1; i >= 0; i--) {
      hole.lineTo(position.x + pts[i].x, position.y + pts[i].y);
    }
    hole.closePath();
    wallShape.holes.push(hole);
  }

  return new THREE.ShapeGeometry(wallShape);
}
