'use client';

import { useRef, useState, useEffect, useMemo } from 'react';
import { useThree, useFrame, useLoader } from '@react-three/fiber';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import * as THREE from 'three';
import { FRAGMENT_META } from './galleryData';

// ─── Ring tunables (adjust these to reposition / restyle) ─────
const RING_RADIUS       = 4.0;       // distance from camera to text surface
const RING_OFFSET_X     = 0.0;       // center X offset from camera (+ = right)
const RING_OFFSET_Y     = 0.0;       // center Y offset from camera (+ = up)
const RING_OFFSET_Z     = 0.0;       // center Z offset from camera (+ = forward)
const RING_TILT_X       = 0.0;       // radians — pitch tilt (lean forward/back)
const RING_TILT_Z       = 0.0;       // radians — roll tilt (lean sideways)
const SUBTITLE_Y_OFFSET = -0.35;     // Y gap between title and subtitle on ring
const ENTER_START_ANGLE = -Math.PI;  // radians — text starts behind camera (opposite side)
const EXIT_END_ANGLE    = Math.PI;   // radians — text exits past front to behind (opposite side)
const ENTER_DURATION    = 1000;      // ms
const EXIT_DURATION     = 800;       // ms
const OPACITY_RAMP      = 0.2;       // fraction of animation for opacity fade

const FONT_URL          = '/fonts/MPLUSRounded1c-Regular.typeface.json';
const TITLE_FONT_SIZE   = 0.8;
const SUBTITLE_FONT_SIZE = 0.22;

// ─── Bend flat text geometry onto a cylinder's inner surface ──
function bendGeometryOntoRing(
  flatGeo: THREE.ShapeGeometry,
  radius: number,
  yOffset: number = 0,
): THREE.BufferGeometry {
  const geo = flatGeo.clone();
  const posAttr = geo.getAttribute('position') as THREE.BufferAttribute;
  const positions = posAttr.array as Float32Array;

  geo.computeBoundingBox();
  const bb = geo.boundingBox!;
  const centerX = (bb.min.x + bb.max.x) / 2;

  for (let i = 0; i < posAttr.count; i++) {
    const x = positions[i * 3 + 0];
    const y = positions[i * 3 + 1];

    // Map X to angle on ring. Text center → (0, y, -R) = in front of camera (-Z).
    // Positive theta so left-to-right reading is preserved from camera's view.
    const theta = (x - centerX) / radius;

    positions[i * 3 + 0] = radius * Math.sin(theta);
    positions[i * 3 + 1] = y + yOffset;
    positions[i * 3 + 2] = -radius * Math.cos(theta);
  }

  posAttr.needsUpdate = true;
  geo.computeBoundingBox();
  geo.computeVertexNormals();
  return geo;
}

// ─── Component ────────────────────────────────────────────────
export default function RingTitle3D({ activeId }: { activeId: string | null }) {
  const ringGroupRef = useRef<THREE.Group>(null!);
  const titleMatRef = useRef<THREE.MeshBasicMaterial>(null!);
  const subtitleMatRef = useRef<THREE.MeshBasicMaterial>(null!);
  const { camera } = useThree();

  const font = useLoader(FontLoader, FONT_URL);

  const [displayId, setDisplayId] = useState<string | null>(null);
  const displayIdRef = useRef<string | null>(null);

  // Animation state
  const animProgress = useRef(0);
  const animPhase = useRef<'idle' | 'entering' | 'exiting'>('idle');
  const animStartTime = useRef(0);

  // Pre-allocate reusable objects
  const tiltQuat = useRef(
    new THREE.Quaternion().setFromEuler(new THREE.Euler(RING_TILT_X, 0, RING_TILT_Z))
  );
  const offsetVec = useRef(new THREE.Vector3());
  const yRotQuat = useRef(new THREE.Quaternion());
  const yAxis = useRef(new THREE.Vector3(0, 1, 0));

  // ── State machine (same as FragmentTitle3D) ──
  useEffect(() => {
    if (activeId) {
      displayIdRef.current = activeId;
      setDisplayId(activeId);
      animProgress.current = 0;
      animPhase.current = 'entering';
      animStartTime.current = performance.now();
    } else if (displayIdRef.current) {
      animPhase.current = 'exiting';
      animStartTime.current = performance.now();
    }
  }, [activeId]);

  const meta = displayId ? FRAGMENT_META[displayId] : null;

  // ── Bend text geometries onto ring ──
  const titleGeo = useMemo(() => {
    if (!meta) return null;
    const shapes = font.generateShapes(meta.title, TITLE_FONT_SIZE);
    const flatGeo = new THREE.ShapeGeometry(shapes);
    return bendGeometryOntoRing(flatGeo, RING_RADIUS, 0);
  }, [font, meta]);

  const subtitleGeo = useMemo(() => {
    if (!meta) return null;
    const shapes = font.generateShapes(meta.subtitle, SUBTITLE_FONT_SIZE);
    const flatGeo = new THREE.ShapeGeometry(shapes);
    return bendGeometryOntoRing(flatGeo, RING_RADIUS, SUBTITLE_Y_OFFSET);
  }, [font, meta]);

  // ── Animation loop (priority 0 — after camera controllers at -1) ──
  useFrame(() => {
    if (!ringGroupRef.current) return;

    // 1. Update animation progress
    const elapsed = performance.now() - animStartTime.current;

    if (animPhase.current === 'entering') {
      const t = Math.min(1, elapsed / ENTER_DURATION);
      animProgress.current = 1 - Math.pow(1 - t, 3); // easeOutCubic
      if (t >= 1) animPhase.current = 'idle';
    } else if (animPhase.current === 'exiting') {
      const t = Math.min(1, elapsed / EXIT_DURATION);
      animProgress.current = 1 - t * t * t; // easeInCubic (1→0)
      if (t >= 1) {
        animPhase.current = 'idle';
        animProgress.current = 0;
        displayIdRef.current = null;
        setDisplayId(null);
      }
    }

    // 2. Position ring centered on camera (+ offset)
    offsetVec.current
      .set(RING_OFFSET_X, RING_OFFSET_Y, RING_OFFSET_Z)
      .applyQuaternion(camera.quaternion);
    ringGroupRef.current.position.copy(camera.position).add(offsetVec.current);

    // 3. Compute Y rotation from animation progress
    let yAngle: number;
    if (animPhase.current === 'exiting') {
      // Exit: 0 → EXIT_END_ANGLE (same spin direction, continues past)
      yAngle = EXIT_END_ANGLE * (1 - animProgress.current);
    } else {
      // Enter / idle: ENTER_START_ANGLE → 0
      yAngle = ENTER_START_ANGLE * (1 - animProgress.current);
    }

    // 4. Compose orientation: camera × tilt × Y-spin
    yRotQuat.current.setFromAxisAngle(yAxis.current, yAngle);
    ringGroupRef.current.quaternion
      .copy(camera.quaternion)
      .multiply(tiltQuat.current)
      .multiply(yRotQuat.current);

    // 5. Opacity ramp (fade in near end of enter, fade out near end of exit)
    let opacity: number;
    if (animPhase.current === 'idle' && animProgress.current === 0) {
      opacity = 0;
    } else if (animPhase.current === 'idle' && animProgress.current >= 1) {
      opacity = 1;
    } else if (animPhase.current === 'entering') {
      // Ramp from 0 to 1 during the last OPACITY_RAMP fraction
      opacity = Math.min(1, animProgress.current / (1 - OPACITY_RAMP));
    } else {
      // Exiting: ramp from 1 to 0 during the last OPACITY_RAMP fraction
      opacity = Math.min(1, animProgress.current / OPACITY_RAMP);
    }

    if (titleMatRef.current) titleMatRef.current.opacity = opacity;
    if (subtitleMatRef.current) subtitleMatRef.current.opacity = opacity * 0.85;
  });

  if (!meta || !titleGeo) return null;

  return (
    <group ref={ringGroupRef}>
      <mesh geometry={titleGeo} renderOrder={10000}>
        <meshBasicMaterial
          ref={titleMatRef}
          color="white"
          side={THREE.DoubleSide}
          transparent
          opacity={0}
          depthTest={false}
          depthWrite={false}
        />
      </mesh>
      {subtitleGeo && (
        <mesh geometry={subtitleGeo} renderOrder={10000}>
          <meshBasicMaterial
            ref={subtitleMatRef}
            color="white"
            side={THREE.DoubleSide}
            transparent
            opacity={0}
            depthTest={false}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  );
}
