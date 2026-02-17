'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Suspense, useEffect, useRef, useMemo, useCallback, useState } from 'react';
import * as THREE from 'three';
import WallScene from './WallScene';
import { CameraDirector, IMMERSED_Z } from './CameraDirector';
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

  // Per-frame blend tracking
  const blendFactorsRef = useRef<number[]>(FRAMES.map(() => 0));
  const [blendFactors, setBlendFactors] = useState<number[]>(FRAMES.map(() => 0));

  // Per-frame content visibility tracking
  const contentVisibleRef = useRef<boolean[]>([true, false]);
  const [contentVisible, setContentVisible] = useState<boolean[]>([true, false]);

  useEffect(() => {
    transitionRef.current.onPhaseChange = (phase: TransitionPhase) => {
      onPhaseChange?.(phase);
    };
  }, [onPhaseChange]);

  // Start first video (immersed in frame 0, behind wall)
  useEffect(() => {
    sceneManagers[0].play();
    sceneManagers[0].blendFactor = 1;
    blendFactorsRef.current = [1, 0];
    setBlendFactors([1, 0]);

    // Camera behind wall, content fills viewport
    const posA = FRAMES[0].wallPosition;
    camera.position.set(posA.x, posA.y, IMMERSED_Z);
    camera.lookAt(posA.x, posA.y, 0);

    return () => {
      sceneManagers.forEach((m) => m.dispose());
    };
  }, [sceneManagers, camera]);

  // Auto-start transition after delay
  useEffect(() => {
    const timer = setTimeout(() => {
      cameraDirectorRef.current = new CameraDirector(FRAMES[0], FRAMES[1]);
      transitionRef.current.startTransition(1);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  useFrame((_, delta) => {
    const tc = transitionRef.current;
    const cd = cameraDirectorRef.current;

    tc.update(delta);
    const { phase, progress, fromFrame, toFrame } = tc.state;

    if (phase === 'exiting') {
      sceneManagers[fromFrame].fadeToStatic(progress);
    } else if (phase === 'entering') {
      sceneManagers[toFrame].fadeToVideo(progress);
    }

    // Batch blend factor updates — only when changed
    const newBlends = FRAMES.map((_, i) => sceneManagers[i].blendFactor);
    const blendsChanged = newBlends.some(
      (b, i) => Math.abs(b - blendFactorsRef.current[i]) > 0.01
    );
    if (blendsChanged) {
      blendFactorsRef.current = [...newBlends];
      setBlendFactors([...newBlends]);
    }

    // Camera management
    if (phase === 'immersed') {
      // Clamp camera to immersed position behind wall
      const fp = FRAMES[fromFrame].wallPosition;
      camera.position.set(fp.x, fp.y, IMMERSED_Z);
      camera.lookAt(fp.x, fp.y, 0);
    } else if (cd) {
      // Animate camera along spline (crosses Z=0 wall plane)
      const animPhase = phase as 'exiting' | 'overview' | 'panning' | 'entering';
      const globalT = CameraDirector.phaseToGlobal(animPhase, progress);
      const { position, lookAt } = cd.evaluate(globalT);
      camera.position.copy(position);
      camera.lookAt(lookAt);
    }

    // Content visibility: hide inactive frames when camera is behind wall
    const cameraZ = camera.position.z;
    let newVisible: boolean[];
    if (cameraZ >= 0) {
      // In front of wall — all content visible (wall hexagonal holes mask it)
      newVisible = FRAMES.map(() => true);
    } else {
      // Behind wall — only active frame's content visible
      const activeIdx = phase === 'entering' ? toFrame : fromFrame;
      newVisible = FRAMES.map((_, i) => i === activeIdx);
    }

    const visChanged = newVisible.some(
      (v, i) => v !== contentVisibleRef.current[i]
    );
    if (visChanged) {
      contentVisibleRef.current = newVisible;
      setContentVisible([...newVisible]);
    }
  });

  const sceneTextures = useMemo(
    () =>
      sceneManagers.map((mgr, i) => ({
        videoTexture: mgr.videoTexture as THREE.Texture,
        staticTexture: mgr.staticTexture as THREE.Texture,
        blendFactor: blendFactors[i],
        contentVisible: contentVisible[i],
      })),
    [sceneManagers, blendFactors, contentVisible]
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
