'use client';

import { useRef, useState, useEffect, useMemo } from 'react';
import { useThree, useFrame, useLoader } from '@react-three/fiber';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import * as THREE from 'three';
import { FRAGMENT_META } from './galleryData';

// ─── Title tunables (adjust these to reposition / restyle) ────
const TITLE_OFFSET_X = -3.8;   // camera-local X: negative = left
const TITLE_OFFSET_Y = 0.4;    // camera-local Y: positive = up
const TITLE_OFFSET_Z = -5.0;   // camera-local Z: negative = further from camera
const TITLE_ROTATE_Y = 0.8;    // radians – perspective depth
const TITLE_ROTATE_Z = 0.5;    // radians – diagonal tilt
const TITLE_ENTER_DURATION = 800; // ms
const TITLE_EXIT_DURATION = 600;
const TITLE_SLIDE_DISTANCE = 3; // local-X units along diagonal

const FONT_URL = '/fonts/MPLUSRounded1c-Regular.typeface.json';
const TITLE_FONT_SIZE = 0.8;
const SUBTITLE_FONT_SIZE = 0.22;

export default function FragmentTitle3D({ activeId }: { activeId: string | null }) {
  const groupRef = useRef<THREE.Group>(null!);
  const titleMatRef = useRef<THREE.MeshBasicMaterial>(null!);
  const subtitleMatRef = useRef<THREE.MeshBasicMaterial>(null!);
  const { camera } = useThree();

  // Load font via Three.js FontLoader (no troika — no GPOS/GSUB crashes)
  const font = useLoader(FontLoader, FONT_URL);

  const [displayId, setDisplayId] = useState<string | null>(null);
  const displayIdRef = useRef<string | null>(null);

  // Animation state
  const animProgress = useRef(0); // 0 = hidden (offset), 1 = visible (rest)
  const animPhase = useRef<'idle' | 'entering' | 'exiting'>('idle');
  const animStartTime = useRef(0);

  // Pre-allocate reusable objects
  const offsetVec = useRef(new THREE.Vector3());
  const slideVec = useRef(new THREE.Vector3());
  // Extra rotation: Y for perspective depth, Z for diagonal tilt
  const extraQuat = useRef(
    new THREE.Quaternion().setFromEuler(new THREE.Euler(0, TITLE_ROTATE_Y, TITLE_ROTATE_Z))
  );

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

  // Generate ShapeGeometry from font (native Three.js — no troika)
  const titleGeo = useMemo(() => {
    if (!meta) return null;
    const shapes = font.generateShapes(meta.title, TITLE_FONT_SIZE);
    const geo = new THREE.ShapeGeometry(shapes);
    geo.computeBoundingBox();
    return geo;
  }, [font, meta]);

  const subtitleGeo = useMemo(() => {
    if (!meta) return null;
    const shapes = font.generateShapes(meta.subtitle, SUBTITLE_FONT_SIZE);
    const geo = new THREE.ShapeGeometry(shapes);
    geo.computeBoundingBox();
    return geo;
  }, [font, meta]);

  // Priority 0 (default): runs AFTER camera controllers (priority -1),
  // so camera.position/quaternion are already up-to-date this frame.
  useFrame(() => {
    if (!groupRef.current) return;

    // ── Animation progress ──
    const elapsed = performance.now() - animStartTime.current;

    if (animPhase.current === 'entering') {
      const t = Math.min(1, elapsed / TITLE_ENTER_DURATION);
      animProgress.current = 1 - Math.pow(1 - t, 3); // easeOutCubic
      if (t >= 1) animPhase.current = 'idle';
    } else if (animPhase.current === 'exiting') {
      const t = Math.min(1, elapsed / TITLE_EXIT_DURATION);
      animProgress.current = 1 - t * t * t; // easeInCubic (reverse)
      if (t >= 1) {
        animPhase.current = 'idle';
        animProgress.current = 0;
        displayIdRef.current = null;
        setDisplayId(null);
      }
    }

    // ── Position: camera-relative, upper area ──
    offsetVec.current.set(TITLE_OFFSET_X, TITLE_OFFSET_Y, TITLE_OFFSET_Z).applyQuaternion(camera.quaternion);
    groupRef.current.position.copy(camera.position).add(offsetVec.current);

    // ── Orientation: camera + perspective rotation ──
    groupRef.current.quaternion.copy(camera.quaternion).multiply(extraQuat.current);

    // ── Slide: one-directional flow (like water) ──
    let slideX: number;
    if (animPhase.current === 'exiting') {
      slideX = -(1 - animProgress.current) * TITLE_SLIDE_DISTANCE;
    } else {
      slideX = (1 - animProgress.current) * TITLE_SLIDE_DISTANCE;
    }
    slideVec.current.set(slideX, 0, 0).applyQuaternion(groupRef.current.quaternion);
    groupRef.current.position.add(slideVec.current);

    // ── Update material opacity ──
    const opacity = animProgress.current;
    if (titleMatRef.current) titleMatRef.current.opacity = opacity;
    if (subtitleMatRef.current) subtitleMatRef.current.opacity = opacity * 0.85;
  });

  if (!meta || !titleGeo) return null;

  return (
    <group ref={groupRef}>
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
        <mesh geometry={subtitleGeo} position={[0, -0.3, 0]} renderOrder={10000}>
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
