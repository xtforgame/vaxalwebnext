'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Suspense, useEffect, useRef, useMemo, useCallback, useState } from 'react';
import * as THREE from 'three';
import WallScene from './WallScene';
import { CameraDirector, IMMERSED_Z, VIEWPORT_DIST, RESTING_Z } from './CameraDirector';
import { TransitionController } from './TransitionController';
import { FrameSceneManager } from './SceneManager';
import type { FrameConfig, TransitionPhase } from './types';

/** Frame configurations — two hexagonal frames on the wall */
const FRAMES: FrameConfig[] = [
  {
    id: 'bigbuckbunny',
    wallPosition: new THREE.Vector3(-3.5, 0, 0),
    radius: 2.8,
    borderWidth: 0.25,
    frameDepth: 0.3,
    videoSrc: '/video/BigBuckBunny.mp4',
    staticSrc: '/video/BigBuckBunny.jpg',
  },
  {
    id: 'elephantsdream',
    wallPosition: new THREE.Vector3(3.5, 0, 0),
    radius: 2.8,
    borderWidth: 0.25,
    frameDepth: 0.3,
    videoSrc: '/video/ElephantsDream.mp4',
    staticSrc: '/video/ElephantsDream.jpg',
  },
];

/**
 * Compute the Z position for a video plane based on current phase and camera Z.
 *
 * During exiting/entering: the active video moves WITH the camera (camera.z - VIEWPORT_DIST),
 * clamped so it never goes past the resting position at the wall.
 * Otherwise: resting at RESTING_Z.
 */
function computeContentZ(
  frameIndex: number,
  phase: TransitionPhase,
  fromFrame: number,
  toFrame: number,
  cameraZ: number
): number {
  if (phase === 'immersed') {
    return frameIndex === fromFrame
      ? cameraZ - VIEWPORT_DIST
      : RESTING_Z;
  }

  if (phase === 'exiting' && frameIndex === fromFrame) {
    return Math.min(cameraZ - VIEWPORT_DIST, RESTING_Z);
  }

  if (phase === 'entering' && frameIndex === toFrame) {
    return Math.min(cameraZ - VIEWPORT_DIST, RESTING_Z);
  }

  return RESTING_Z;
}

/**
 * Inner scene component — runs inside Canvas context.
 */
function GalleryScene({
  onPhaseChange,
}: {
  onPhaseChange?: (phase: TransitionPhase) => void;
}) {
  const { camera } = useThree();
  const textureLoader = useMemo(() => new THREE.TextureLoader(), []);

  const sceneManagers = useMemo(
    () =>
      FRAMES.map(
        (f) => new FrameSceneManager(f.videoSrc, f.staticSrc, textureLoader)
      ),
    [textureLoader]
  );

  const transitionRef = useRef(new TransitionController(0));
  const cameraDirectorRef = useRef<CameraDirector | null>(null);

  // Ref-based content Z — updated every frame, no React state lag
  const contentZRefs = useRef(
    FRAMES.map((_, i) => ({
      current: i === 0 ? IMMERSED_Z - VIEWPORT_DIST : RESTING_Z,
    }))
  );

  useEffect(() => {
    transitionRef.current.onPhaseChange = (phase: TransitionPhase) => {
      onPhaseChange?.(phase);
    };
  }, [onPhaseChange]);

  // Start first video (immersed in frame 0, behind wall)
  useEffect(() => {
    sceneManagers[0].play();

    // Camera behind wall, facing -Z (never rotates)
    const posA = FRAMES[0].wallPosition;
    camera.position.set(posA.x, posA.y, IMMERSED_Z);
    camera.rotation.set(0, 0, 0);

    return () => {
      sceneManagers.forEach((m) => m.dispose());
    };
  }, [sceneManagers, camera]);

  // Auto-start transition after delay
  useEffect(() => {
    const timer = setTimeout(() => {
      // Start video 2 early so it's ready when we enter
      sceneManagers[1].play();

      cameraDirectorRef.current = new CameraDirector(FRAMES[0], FRAMES[1]);
      transitionRef.current.startTransition(1);
    }, 3000);
    return () => clearTimeout(timer);
  }, [sceneManagers]);

  useFrame((_, delta) => {
    const tc = transitionRef.current;
    const cd = cameraDirectorRef.current;

    tc.update(delta);
    const { phase, progress, fromFrame, toFrame } = tc.state;

    // Camera management — always faces -Z, only position changes
    if (phase === 'immersed') {
      const fp = FRAMES[fromFrame].wallPosition;
      camera.position.set(fp.x, fp.y, IMMERSED_Z);
    } else if (cd) {
      const animPhase = phase as 'exiting' | 'overview' | 'panning' | 'entering';
      const globalT = CameraDirector.phaseToGlobal(animPhase, progress);
      const { position } = cd.evaluate(globalT);
      camera.position.copy(position);
    }

    // Camera always faces -Z — no rotation ever
    camera.rotation.set(0, 0, 0);

    // Update content Z refs directly (no React state, no lag)
    const cameraZ = camera.position.z;
    for (let i = 0; i < FRAMES.length; i++) {
      contentZRefs.current[i].current = computeContentZ(
        i, phase, fromFrame, toFrame, cameraZ
      );
    }
  });

  // Stable — only depends on sceneManagers (created once)
  const sceneTextures = useMemo(
    () =>
      sceneManagers.map((mgr, i) => ({
        videoTexture: mgr.videoTexture as THREE.Texture,
        contentZRef: contentZRefs.current[i],
      })),
    [sceneManagers]
  );

  return (
    <>
      <ambientLight intensity={0.6} />
      <pointLight position={[0, 5, 8]} intensity={1.0} />
      <WallScene frames={FRAMES} sceneTextures={sceneTextures} />
    </>
  );
}

export default function FrameGallery() {
  const [phase, setPhase] = useState<TransitionPhase>('immersed');

  const handlePhaseChange = useCallback((p: TransitionPhase) => {
    setPhase(p);
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: '#0a0a1a',
        zIndex: 100,
        overflow: 'hidden',
      }}
    >
      <Suspense
        fallback={
          <div className="flex flex-col items-center justify-center w-full h-full text-slate-400">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="font-medium">Loading Gallery...</p>
          </div>
        }
      >
        <Canvas
          gl={{
            antialias: true,
            stencil: true,
            alpha: false,
            powerPreference: 'high-performance',
          }}
          camera={{
            position: [FRAMES[0].wallPosition.x, 0, IMMERSED_Z],
            fov: 50,
            near: 0.01,
            far: 100,
          }}
          dpr={[1, 1.5]}
          style={{ width: '100%', height: '100%' }}
          frameloop="always"
        >
          <GalleryScene onPhaseChange={handlePhaseChange} />
        </Canvas>
      </Suspense>

      {/* Phase indicator */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[110] pointer-events-none">
        <div className="px-4 py-2 bg-black/40 backdrop-blur-md rounded-full text-white/70 text-xs font-mono uppercase tracking-wider">
          {phase === 'immersed' && 'Watching'}
          {phase === 'exiting' && 'Pulling back...'}
          {phase === 'overview' && 'Gallery view'}
          {phase === 'panning' && 'Moving to next...'}
          {phase === 'entering' && 'Entering...'}
        </div>
      </div>
    </div>
  );
}
