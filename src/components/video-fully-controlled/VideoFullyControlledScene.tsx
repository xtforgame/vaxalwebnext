'use client';

import { useRef, useEffect, useMemo } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
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

  // ── Video + texture (lazy init) ────────────────────────────────
  const videoRef = useRef<HTMLVideoElement>(null!);
  const textureRef = useRef<THREE.VideoTexture>(null!);

  if (!videoRef.current) {
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
  }

  useEffect(() => {
    return () => {
      const video = videoRef.current;
      if (video) {
        video.pause();
        video.removeAttribute('src');
        video.load();
      }
      textureRef.current?.dispose();
    };
  }, []);

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

  // ── Frame loop ─────────────────────────────────────────────────
  useFrame((state, delta) => {
    const elapsed = (elapsedRef.current += delta);
    const video = videoRef.current;
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

    // 3. Texture update guard
    if (video.readyState >= video.HAVE_CURRENT_DATA) {
      textureRef.current!.needsUpdate = true;
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
        <meshBasicMaterial map={textureRef.current} toneMapped={false} />
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
        gl={{ antialias: false, alpha: false }}
        dpr={[1, 1]}
        style={{ width: '100%', height: '100%', display: 'block' }}
      >
        <VideoScene />
      </Canvas>
    </div>
  );
}
