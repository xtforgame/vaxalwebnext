import * as THREE from 'three';

/**
 * Create a regular hexagon THREE.Shape (flat-top orientation).
 * Vertices at angles: i * 60° + 30° for flat-bottom, i * 60° for pointy-top.
 * We use flat-top: angle = i * 60°
 */
export function createHexagonShape(radius: number): THREE.Shape {
  const shape = new THREE.Shape();
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI) / 3; // 0, 60, 120, 180, 240, 300 degrees
    const x = radius * Math.cos(angle);
    const y = radius * Math.sin(angle);
    if (i === 0) {
      shape.moveTo(x, y);
    } else {
      shape.lineTo(x, y);
    }
  }
  shape.closePath();
  return shape;
}

/**
 * Create a hexagonal ring shape (outer hex minus inner hex) for the frame border.
 */
export function createHexagonRingShape(
  outerRadius: number,
  innerRadius: number
): THREE.Shape {
  const outer = new THREE.Shape();
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI) / 3;
    const x = outerRadius * Math.cos(angle);
    const y = outerRadius * Math.sin(angle);
    if (i === 0) outer.moveTo(x, y);
    else outer.lineTo(x, y);
  }
  outer.closePath();

  // Inner hole (wound in reverse for subtraction)
  const hole = new THREE.Path();
  for (let i = 5; i >= 0; i--) {
    const angle = (i * Math.PI) / 3;
    const x = innerRadius * Math.cos(angle);
    const y = innerRadius * Math.sin(angle);
    if (i === 5) hole.moveTo(x, y);
    else hole.lineTo(x, y);
  }
  hole.closePath();
  outer.holes.push(hole);

  return outer;
}

/**
 * Create a wall geometry (large rectangle) with hexagonal holes at each frame position.
 * The holes use innerRadius so the frame border ring covers the gap to outerRadius.
 */
export function createWallWithHoles(
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
    const hole = new THREE.Path();
    // Wind in reverse (clockwise) for proper hole subtraction
    for (let i = 5; i >= 0; i--) {
      const angle = (i * Math.PI) / 3;
      const x = position.x + innerRadius * Math.cos(angle);
      const y = position.y + innerRadius * Math.sin(angle);
      if (i === 5) hole.moveTo(x, y);
      else hole.lineTo(x, y);
    }
    hole.closePath();
    wallShape.holes.push(hole);
  }

  return new THREE.ShapeGeometry(wallShape);
}

/**
 * Create an extruded hexagonal frame geometry (ring with depth).
 */
export function createFrameGeometry(
  outerRadius: number,
  innerRadius: number,
  depth: number
): THREE.ExtrudeGeometry {
  const ring = createHexagonRingShape(outerRadius, innerRadius);
  const geometry = new THREE.ExtrudeGeometry(ring, {
    depth,
    bevelEnabled: false,
  });
  // Center the extrusion along Z
  geometry.translate(0, 0, -depth / 2);
  geometry.computeVertexNormals();
  return geometry;
}
