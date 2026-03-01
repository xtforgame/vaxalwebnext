'use client';

import { useRef, useEffect, useMemo } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import {
  TIMELINE,
  EASING_MAP,
  VIDEO_SRC,
  VIDEO_ASPECT,
  type TimelineAction,
  type EasingFn,
} from './timelineData';

// ─── Cursor constants ────────────────────────────────────────────
const RIPPLE_DURATION = 0.6; // seconds
const RIPPLE_MAX_SCALE = 4;

// ─── Gear shape (adapted from gear.tsx) ──────────────────────────
const GEAR_SPEED = 0.015;
const GEAR1 = { count: 8, outR: 4, inR: 3.2, holeR: 1.3 };
const GEAR2 = { count: 7, outR: 3.741657, inR: 2.941657, holeR: 1 };
const GEAR_DISTANCE = GEAR1.outR + GEAR2.inR; // centres apart
const GEAR2_INIT_ROT = (-(Math.PI * 2) / GEAR2.count) * 1.05;

function createGearShape(
  count: number,
  outRadius: number,
  inRadius: number,
  holeRadius: number,
): THREE.Shape {
  const shape = new THREE.Shape();
  const outDeg = (Math.PI * 2) / count;
  const step = 30;
  const degStep = outDeg / step;
  let theta = 0;
  let first = false;

  for (let i = 0; i < count; i++) {
    for (let j = 0; j < step; j++) {
      theta += degStep;
      const inside = (theta % outDeg) > (outDeg * 2) / 3;
      let radius = inside ? inRadius : outRadius;
      if (!inside) {
        const value = theta % outDeg;
        const radiusDiff = outRadius - inRadius;
        const left = ((outDeg * 2) / 3) / 3;
        const right = (((outDeg * 2) / 3) * 2) / 3;
        if (value <= left) {
          radius -= (-(value / left) + 1) * radiusDiff;
        } else if (value > right) {
          radius -= ((value - right) / left) * radiusDiff;
        }
      }
      const x = radius * Math.sin(theta);
      const y = radius * Math.cos(theta);
      if (!first) { shape.moveTo(x, y); first = true; }
      else { shape.lineTo(x, y); }
    }
  }
  shape.closePath();

  const hole = new THREE.EllipseCurve(0, 0, holeRadius, holeRadius, 0, Math.PI * 2, false, 0);
  shape.holes = [new THREE.Path(hole.getPoints(60))];
  return shape;
}

// ─── Zoom helper ─────────────────────────────────────────────────
function applyZoom(
  camera: THREE.OrthographicCamera,
  scale: number,
  focal: [number, number],
  pw: number,
  ph: number,
) {
  camera.zoom = scale;
  camera.position.x = (focal[0] - 0.5) * pw;
  camera.position.y = (0.5 - focal[1]) * ph;
  camera.updateProjectionMatrix();
}

// ─── Inner scene (runs inside Canvas) ────────────────────────────
function VideoScene() {
  const { viewport } = useThree();

  // Responsive plane: fill viewport while keeping 16:9
  const viewAspect = viewport.width / viewport.height;
  const planeWidth =
    viewAspect > VIDEO_ASPECT
      ? viewport.height * VIDEO_ASPECT
      : viewport.width;
  const planeHeight =
    viewAspect > VIDEO_ASPECT
      ? viewport.height
      : viewport.width / VIDEO_ASPECT;

  // ── Video + texture (created in useEffect for Strict Mode safety) ─
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const textureRef = useRef<THREE.VideoTexture | null>(null);
  const videoMaterial = useMemo(
    () => new THREE.MeshBasicMaterial({ toneMapped: false }),
    [],
  );

  useEffect(() => {
    const video = document.createElement('video');
    video.src = VIDEO_SRC;
    video.crossOrigin = 'anonymous';
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    videoRef.current = video;

    const texture = new THREE.VideoTexture(video);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    textureRef.current = texture;

    return () => {
      video.pause();
      video.removeAttribute('src');
      video.load();
      texture.dispose();
      videoMaterial.map = null;
      videoMaterial.needsUpdate = true;
      videoRef.current = null;
      textureRef.current = null;
    };
  }, [videoMaterial]);

  // ── Sorted timeline ────────────────────────────────────────────
  const sortedTimeline = useMemo(
    () => [...TIMELINE].sort((a, b) => a.time - b.time),
    [],
  );

  // ── Timeline state (all refs — no re-renders) ──────────────────
  const elapsedRef = useRef(0);
  const nextActionRef = useRef(0);

  const currentZoomScaleRef = useRef(1);
  const currentFocalRef = useRef<[number, number]>([0.5, 0.5]);
  const currentSpeedRef = useRef(1);

  const activeZoomRef = useRef<{
    startScale: number;
    endScale: number;
    startFocal: [number, number];
    endFocal: [number, number];
    startTime: number;
    duration: number;
    easing: EasingFn;
  } | null>(null);

  const activeSpeedRef = useRef<{
    startRate: number;
    endRate: number;
    startTime: number;
    duration: number;
    easing: EasingFn;
  } | null>(null);

  // ── Cursor state ─────────────────────────────────────────────
  const cursorGroupRef = useRef<THREE.Group>(null!);
  const rippleMeshRef = useRef<THREE.Mesh>(null!);
  const rippleMaterialRef = useRef<THREE.MeshBasicMaterial>(null!);

  const currentCursorPosRef = useRef<[number, number]>([0.5, 0.5]);

  const activeCursorMoveRef = useRef<{
    startPos: [number, number];
    endPos: [number, number];
    startTime: number;
    duration: number;
    easing: EasingFn;
  } | null>(null);

  const activeRippleRef = useRef<{ startTime: number } | null>(null);

  // ── Overlay state ──────────────────────────────────────────────
  const overlayGroupRef = useRef<THREE.Group>(null!);
  const gearSubGroupRef = useRef<THREE.Group>(null!);
  const gear1Ref = useRef<THREE.Mesh>(null!);
  const gear2Ref = useRef<THREE.Mesh>(null!);
  const overlayTextRef = useRef('');
  const textMeshRef = useRef<THREE.Object3D>(null!);

  const gearData = useMemo(() => {
    const geo1 = new THREE.ExtrudeGeometry(
      createGearShape(GEAR1.count, GEAR1.outR, GEAR1.inR, GEAR1.holeR),
      { steps: 1, depth: 0.01, bevelEnabled: false },
    );
    const geo2 = new THREE.ExtrudeGeometry(
      createGearShape(GEAR2.count, GEAR2.outR, GEAR2.inR, GEAR2.holeR),
      { steps: 1, depth: 0.01, bevelEnabled: false },
    );
    return { geo1, geo2 };
  }, []);

  useEffect(() => {
    return () => { gearData.geo1.dispose(); gearData.geo2.dispose(); videoMaterial.dispose(); };
  }, [gearData, videoMaterial]);

  // ── Frame loop ─────────────────────────────────────────────────
  useFrame((state, delta) => {
    const video = videoRef.current;
    const texture = textureRef.current;
    if (!video) return; // wait for useEffect init

    const elapsed = (elapsedRef.current += delta);
    const camera = state.camera as THREE.OrthographicCamera;

    // 1. Process actions that reached their trigger time
    while (nextActionRef.current < sortedTimeline.length) {
      const action = sortedTimeline[nextActionRef.current];
      if (action.time > elapsed) break;

      switch (action.type) {
        case 'play':
          video.play().catch(() => {});
          break;

        case 'pause':
          video.pause();
          break;

        case 'seek':
          video.currentTime = action.to;
          break;

        case 'speed':
          if (action.duration && action.duration > 0) {
            activeSpeedRef.current = {
              startRate: currentSpeedRef.current,
              endRate: action.rate,
              startTime: action.time,
              duration: action.duration,
              easing: EASING_MAP[action.easing ?? 'easeInCubic'],
            };
          } else {
            video.playbackRate = action.rate;
            currentSpeedRef.current = action.rate;
            activeSpeedRef.current = null;
          }
          break;

        case 'zoom':
          activeZoomRef.current = {
            startScale: currentZoomScaleRef.current,
            endScale: action.scale,
            startFocal: [...currentFocalRef.current],
            endFocal: action.focal,
            startTime: action.time,
            duration: action.duration,
            easing: EASING_MAP[action.easing ?? 'easeInCubic'],
          };
          break;

        case 'cursor-show':
          currentCursorPosRef.current = [...action.position];
          cursorGroupRef.current.visible = true;
          break;

        case 'cursor-hide':
          cursorGroupRef.current.visible = false;
          activeCursorMoveRef.current = null;
          break;

        case 'cursor-move':
          activeCursorMoveRef.current = {
            startPos: [...currentCursorPosRef.current],
            endPos: action.to,
            startTime: action.time,
            duration: action.duration,
            easing: EASING_MAP[action.easing ?? 'easeInOutCubic'],
          };
          break;

        case 'cursor-click': {
          activeRippleRef.current = { startTime: elapsed };
          const [rx, ry] = currentCursorPosRef.current;
          rippleMeshRef.current.position.x = (rx - 0.5) * planeWidth;
          rippleMeshRef.current.position.y = (0.5 - ry) * planeHeight;
          rippleMeshRef.current.visible = true;
          rippleMeshRef.current.scale.setScalar(1);
          rippleMaterialRef.current.opacity = 0.5;
          break;
        }

        case 'overlay-show':
          overlayGroupRef.current.visible = true;
          gear1Ref.current.rotation.z = 0;
          gear2Ref.current.rotation.z = GEAR2_INIT_ROT;
          overlayTextRef.current = action.text ?? '';
          if ((textMeshRef.current as any)?.text !== undefined) {
            (textMeshRef.current as any).text = overlayTextRef.current;
          }
          break;

        case 'overlay-hide':
          overlayGroupRef.current.visible = false;
          break;
      }

      nextActionRef.current++;
    }

    // 2. Update active interpolations

    // Speed
    if (activeSpeedRef.current) {
      const s = activeSpeedRef.current;
      const rawT = Math.min(1, (elapsed - s.startTime) / s.duration);
      const t = s.easing(rawT);
      const rate = s.startRate + (s.endRate - s.startRate) * t;
      video.playbackRate = rate;
      currentSpeedRef.current = rate;
      if (rawT >= 1) activeSpeedRef.current = null;
    }

    // Zoom
    if (activeZoomRef.current) {
      const z = activeZoomRef.current;
      const rawT = Math.min(1, (elapsed - z.startTime) / z.duration);
      const t = z.easing(rawT);
      const scale = z.startScale + (z.endScale - z.startScale) * t;
      const fx = z.startFocal[0] + (z.endFocal[0] - z.startFocal[0]) * t;
      const fy = z.startFocal[1] + (z.endFocal[1] - z.startFocal[1]) * t;

      applyZoom(camera, scale, [fx, fy], planeWidth, planeHeight);

      currentZoomScaleRef.current = scale;
      currentFocalRef.current = [fx, fy];
      if (rawT >= 1) activeZoomRef.current = null;
    }

    // Cursor move
    if (activeCursorMoveRef.current) {
      const m = activeCursorMoveRef.current;
      const rawT = Math.min(1, (elapsed - m.startTime) / m.duration);
      const t = m.easing(rawT);
      const cx = m.startPos[0] + (m.endPos[0] - m.startPos[0]) * t;
      const cy = m.startPos[1] + (m.endPos[1] - m.startPos[1]) * t;
      currentCursorPosRef.current = [cx, cy];
      if (rawT >= 1) activeCursorMoveRef.current = null;
    }

    // Apply cursor world position
    if (cursorGroupRef.current.visible) {
      const [cx, cy] = currentCursorPosRef.current;
      cursorGroupRef.current.position.x = (cx - 0.5) * planeWidth;
      cursorGroupRef.current.position.y = (0.5 - cy) * planeHeight;
      // Keep cursor screen-size constant regardless of camera zoom
      const invZoom = 1 / camera.zoom;
      cursorGroupRef.current.scale.setScalar(invZoom);
    }

    // Ripple animation
    if (activeRippleRef.current) {
      const rawT = (elapsed - activeRippleRef.current.startTime) / RIPPLE_DURATION;
      if (rawT >= 1) {
        rippleMeshRef.current.visible = false;
        activeRippleRef.current = null;
      } else {
        const scale = (1 + rawT * RIPPLE_MAX_SCALE) / camera.zoom;
        rippleMeshRef.current.scale.setScalar(scale);
        rippleMaterialRef.current.opacity = 0.5 * (1 - rawT);
      }
    }

    // Overlay: follow camera + rotate gears (constant screen size)
    if (overlayGroupRef.current.visible) {
      overlayGroupRef.current.position.set(camera.position.x, camera.position.y, 0);
      // Scale so gears are ~15% of visible viewport height, independent of zoom
      const visH = state.viewport.height;
      const s = (visH * 0.15) / (GEAR1.outR * 2) / camera.zoom;
      gearSubGroupRef.current.scale.setScalar(s);
      // Rotate gears
      gear1Ref.current.rotation.z -= GEAR_SPEED;
      gear2Ref.current.rotation.z += (GEAR_SPEED * GEAR1.count) / GEAR2.count;
    }

    // 3. Texture: assign to material when video is ready, then update
    if (texture && video.readyState >= video.HAVE_CURRENT_DATA) {
      if (!videoMaterial.map) {
        videoMaterial.map = texture;
        videoMaterial.needsUpdate = true;
      }
      texture.needsUpdate = true;
    }
  });

  // ── Cursor size relative to plane ────────────────────────────
  const cursorRadius = planeHeight * 0.025;
  const outlineWidth = cursorRadius * 0.2;

  // ── Render ─────────────────────────────────────────────────────
  return (
    <>
      {/* Video plane */}
      <mesh>
        <planeGeometry
          key={`${planeWidth.toFixed(2)}-${planeHeight.toFixed(2)}`}
          args={[planeWidth, planeHeight]}
        />
        <primitive object={videoMaterial} attach="material" />
      </mesh>

      {/* Cursor dot + white outline */}
      <group ref={cursorGroupRef} visible={false}>
        {/* White outline ring (behind) */}
        <mesh position={[0, 0, 0.09]} renderOrder={2}>
          <ringGeometry
            key={`outline-${cursorRadius.toFixed(4)}`}
            args={[cursorRadius - outlineWidth * 0.3, cursorRadius + outlineWidth, 48]}
          />
          <meshBasicMaterial
            color="#ffffff"
            transparent
            opacity={0.85}
            depthTest={false}
            depthWrite={false}
          />
        </mesh>
        {/* Blue fill */}
        <mesh position={[0, 0, 0.1]} renderOrder={3}>
          <circleGeometry
            key={`cur-${cursorRadius.toFixed(4)}`}
            args={[cursorRadius, 48]}
          />
          <meshBasicMaterial
            color="#60a5fa"
            transparent
            opacity={0.7}
            depthTest={false}
            depthWrite={false}
          />
        </mesh>
      </group>

      {/* Click ripple ring */}
      <mesh ref={rippleMeshRef} position={[0, 0, 0.05]} visible={false} renderOrder={1}>
        <ringGeometry
          key={`rip-${cursorRadius.toFixed(4)}`}
          args={[cursorRadius * 0.85, cursorRadius, 48]}
        />
        <meshBasicMaterial
          ref={rippleMaterialRef}
          color="#93c5fd"
          transparent
          opacity={0.6}
          depthTest={false}
          depthWrite={false}
        />
      </mesh>

      {/* Gear overlay */}
      <group ref={overlayGroupRef} visible={false}>
        {/* Semi-transparent black backdrop */}
        <mesh position={[0, 0, 0.19]} renderOrder={10}>
          <planeGeometry args={[100000, 100000]} />
          <meshBasicMaterial
            color="#000000"
            transparent
            opacity={0.55}
            depthTest={false}
            depthWrite={false}
          />
        </mesh>

        {/* Gears + text sub-group (scaled in useFrame) */}
        <group ref={gearSubGroupRef}>
          {/* Gear 1 */}
          <mesh
            ref={gear1Ref}
            geometry={gearData.geo1}
            position={[-GEAR_DISTANCE / 2, 0.5, 0.2]}
            renderOrder={11}
          >
            <meshBasicMaterial
              color="#ffffff"
              transparent
              opacity={0.75}
              depthTest={false}
              depthWrite={false}
            />
          </mesh>

          {/* Gear 2 */}
          <mesh
            ref={gear2Ref}
            geometry={gearData.geo2}
            position={[GEAR_DISTANCE / 2, 0.5, 0.2]}
            rotation={[0, 0, GEAR2_INIT_ROT]}
            renderOrder={11}
          >
            <meshBasicMaterial
              color="#c7d2fe"
              transparent
              opacity={0.75}
              depthTest={false}
              depthWrite={false}
            />
          </mesh>

          {/* Text below gears */}
          <Text
            ref={textMeshRef}
            position={[0, -GEAR1.outR - 1.5, 0.2]}
            fontSize={1.8}
            color="#ffffff"
            anchorX="center"
            anchorY="top"
            renderOrder={12}
            material-depthTest={false}
          >
            {''}
          </Text>
        </group>
      </group>
    </>
  );
}

// ─── Top-level wrapper ───────────────────────────────────────────
export default function VideoFullyControlledScene() {
  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        backgroundColor: '#000',
        overflow: 'hidden',
      }}
    >
      <Canvas
        orthographic
        camera={{ position: [0, 0, 5], zoom: 1, near: 0.1, far: 100 }}
        frameloop="always"
        gl={{ antialias: true, alpha: false }}
        dpr={[1, 2]}
        style={{ width: '100%', height: '100%', display: 'block' }}
      >
        <VideoScene />
      </Canvas>
    </div>
  );
}
