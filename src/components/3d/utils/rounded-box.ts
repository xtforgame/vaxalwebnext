import * as THREE from 'three';

export function createRoundedBoxGeometry(
  width: number,
  height: number,
  depth: number,
  radius: number,
  segments = 8
): THREE.BufferGeometry {
  const r = Math.min(radius, Math.min(width, height, depth) / 2);
  const shape = new THREE.Shape();
  const w = width / 2 - r;
  const h = height / 2 - r;

  shape.moveTo(-w, -height / 2);
  shape.lineTo(w, -height / 2);
  shape.quadraticCurveTo(width / 2, -height / 2, width / 2, -h);
  shape.lineTo(width / 2, h);
  shape.quadraticCurveTo(width / 2, height / 2, w, height / 2);
  shape.lineTo(-w, height / 2);
  shape.quadraticCurveTo(-width / 2, height / 2, -width / 2, h);
  shape.lineTo(-width / 2, -h);
  shape.quadraticCurveTo(-width / 2, -height / 2, -w, -height / 2);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: depth - r * 2,
    bevelEnabled: true,
    bevelThickness: r,
    bevelSize: r,
    bevelOffset: 0,
    bevelSegments: segments,
    curveSegments: segments,
  });
  geo.translate(0, 0, -(depth - r * 2) / 2);
  geo.computeVertexNormals();
  return geo;
}

export function generateOutlinePoints(
  width: number,
  height: number,
  radius: number,
  count = 48
): THREE.Vector3[] {
  const hw = width / 2;
  const hh = height / 2;
  const r = Math.min(radius, Math.min(width, height) / 2);
  const wr = hw - r;
  const hr = hh - r;

  const arcLen = r * Math.PI / 2;

  const segments: { length: number; sample: (t: number) => [number, number] }[] = [
    { length: 2 * wr, sample: (t) => [-wr + t * 2 * wr, -hh] },
    { length: arcLen, sample: (t) => [
      wr + r * Math.cos(-Math.PI / 2 + t * Math.PI / 2),
      -hr + r * Math.sin(-Math.PI / 2 + t * Math.PI / 2),
    ]},
    { length: 2 * hr, sample: (t) => [hw, -hr + t * 2 * hr] },
    { length: arcLen, sample: (t) => [
      wr + r * Math.cos(t * Math.PI / 2),
      hr + r * Math.sin(t * Math.PI / 2),
    ]},
    { length: 2 * wr, sample: (t) => [wr - t * 2 * wr, hh] },
    { length: arcLen, sample: (t) => [
      -wr + r * Math.cos(Math.PI / 2 + t * Math.PI / 2),
      hr + r * Math.sin(Math.PI / 2 + t * Math.PI / 2),
    ]},
    { length: 2 * hr, sample: (t) => [-hw, hr - t * 2 * hr] },
    { length: arcLen, sample: (t) => [
      -wr + r * Math.cos(Math.PI + t * Math.PI / 2),
      -hr + r * Math.sin(Math.PI + t * Math.PI / 2),
    ]},
  ];

  const totalLength = segments.reduce((s, seg) => s + seg.length, 0);
  const points: THREE.Vector3[] = [];

  for (let i = 0; i < count; i++) {
    const targetDist = (i / count) * totalLength;
    let accumulated = 0;
    for (const seg of segments) {
      if (accumulated + seg.length > targetDist) {
        const localT = (targetDist - accumulated) / seg.length;
        const [x, y] = seg.sample(localT);
        points.push(new THREE.Vector3(x, y, 0));
        break;
      }
      accumulated += seg.length;
    }
  }

  return points;
}
