'use client';

import { Canvas } from '@react-three/fiber';
import type { RootState } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Suspense, useRef, useState, useCallback, useEffect, useMemo } from 'react';
import * as THREE from 'three';

import GalleryScene from './GalleryScene';
import CameraController from './CameraController';
import TourCameraController from './TourCameraController';
import RingTitle3D from './RingTitle3D';
import {
  ALL_FRAGMENTS,
  INITIAL_CAM_POS,
  INITIAL_LOOK_AT,
  TOUR_DWELL_TIME,
  type TourPhase,
  getFragmentCameraTarget,
} from './galleryData';

export default function VideoGallery3D() {
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const focusedIdRef = useRef<string | null>(null);
  const [cameraTarget, setCameraTarget] = useState<THREE.Vector3 | null>(null);
  const [cameraLookAt, setCameraLookAt] = useState<THREE.Vector3 | null>(null);
  const [cameraUp, setCameraUp] = useState<THREE.Vector3 | null>(null);
  const [controlsEnabled, setControlsEnabled] = useState(true);
  const controlsRef = useRef(null);

  // ─── Title overlay ─────────────────────────────────────────────
  const [activeTitle, setActiveTitle] = useState<string | null>(null);

  // ─── Tour state ───────────────────────────────────────────────
  const [tourPhase, setTourPhase] = useState<TourPhase>('idle');
  const [tourIndex, setTourIndex] = useState(0);
  const tourPhaseRef = useRef<TourPhase>('idle');
  const tourIndexRef = useRef(0);

  const tourTarget = useMemo(() => {
    if (tourPhase === 'flying-back') {
      return { camPos: INITIAL_CAM_POS.clone(), lookAt: INITIAL_LOOK_AT.clone(), up: new THREE.Vector3(0, 1, 0) };
    }
    if (tourPhase === 'flying-to' && tourIndex < ALL_FRAGMENTS.length) {
      return getFragmentCameraTarget(ALL_FRAGMENTS[tourIndex]);
    }
    return { camPos: INITIAL_CAM_POS.clone(), lookAt: INITIAL_LOOK_AT.clone(), up: new THREE.Vector3(0, 1, 0) };
  }, [tourPhase, tourIndex]);

  const handleStartTour = useCallback(() => {
    setFocusedId(null);
    focusedIdRef.current = null;
    setControlsEnabled(false);
    setTourIndex(0);
    tourIndexRef.current = 0;
    setTourPhase('flying-to');
    tourPhaseRef.current = 'flying-to';
  }, []);

  const handleCancelTour = useCallback(() => {
    setActiveTitle(null);
    setTourPhase('flying-back');
    tourPhaseRef.current = 'flying-back';
  }, []);

  const handleTourArrive = useCallback(() => {
    const phase = tourPhaseRef.current;
    if (phase === 'flying-back') {
      setTourPhase('idle');
      tourPhaseRef.current = 'idle';
      setControlsEnabled(true);
      return;
    }

    if (phase === 'flying-to') {
      setTourPhase('dwelling');
      tourPhaseRef.current = 'dwelling';

      setTimeout(() => {
        if (tourPhaseRef.current !== 'dwelling') return;

        setTourIndex((prev) => {
          const next = prev + 1;
          if (next >= ALL_FRAGMENTS.length) {
            setActiveTitle(null);
            setTourPhase('flying-back');
            tourPhaseRef.current = 'flying-back';
            return prev;
          }
          tourIndexRef.current = next;
          setActiveTitle(null);
          setTourPhase('flying-to');
          tourPhaseRef.current = 'flying-to';
          return next;
        });
      }, TOUR_DWELL_TIME);
    }
  }, []);

  const handleTourMidpoint = useCallback(() => {
    if (tourPhaseRef.current === 'flying-to' && tourIndexRef.current < ALL_FRAGMENTS.length) {
      setActiveTitle(ALL_FRAGMENTS[tourIndexRef.current].id);
    }
  }, []);

  // ─── WebGL context recovery ───────────────────────────────────
  const [contextLost, setContextLost] = useState(false);
  const [canvasKey, setCanvasKey] = useState(0);

  const handleCreated = useCallback((state: RootState) => {
    const canvas = state.gl.domElement;

    const handleContextLost = (event: Event) => {
      event.preventDefault();
      console.warn('[VideoGallery] WebGL context lost. Recovering...');
      setContextLost(true);
    };

    const handleContextRestored = () => {
      console.log('[VideoGallery] WebGL context restored.');
      setContextLost(false);
    };

    canvas.addEventListener('webglcontextlost', handleContextLost);
    canvas.addEventListener('webglcontextrestored', handleContextRestored);
  }, []);

  useEffect(() => {
    if (contextLost) {
      const timer = setTimeout(() => {
        setCanvasKey((prev) => prev + 1);
        setContextLost(false);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [contextLost]);

  // ─── Focus / back handlers ────────────────────────────────────
  const handleFocus = useCallback((id: string, planePos: THREE.Vector3, planeNormal: THREE.Vector3) => {
    if (tourPhaseRef.current !== 'idle') return;

    setFocusedId(id);
    focusedIdRef.current = id;
    setControlsEnabled(false);
    setActiveTitle(id);
    const camPos = planePos.clone().add(planeNormal.clone().multiplyScalar(5));
    setCameraTarget(camPos);
    setCameraLookAt(planePos.clone());

    const fragment = ALL_FRAGMENTS.find((f) => f.id === id);
    if (fragment) {
      const euler = new THREE.Euler(...fragment.rot);
      const quat = new THREE.Quaternion().setFromEuler(euler);
      const up = new THREE.Vector3(0, 1, 0).applyQuaternion(quat);
      setCameraUp(up);
    }
  }, []);

  const handleBack = useCallback(() => {
    setActiveTitle(null);
    setFocusedId(null);
    focusedIdRef.current = null;
    setCameraTarget(null);
    setCameraLookAt(null);
    setCameraUp(null);
  }, []);

  const handleAnimationEnd = useCallback(() => {
    if (focusedIdRef.current === null) {
      setControlsEnabled(true);
    }
  }, []);

  const isTourActive = tourPhase !== 'idle';

  // ─── Context-lost fallback ────────────────────────────────────
  if (contextLost) {
    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: '#0a0a0a',
          zIndex: 100,
        }}
        className="flex flex-col items-center justify-center text-white/40"
      >
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="font-medium">Recovering 3D Engine...</p>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────
  return (
    <>
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: '#0a0a0a',
        zIndex: 100,
        overflow: 'hidden',
      }}
    >
      <Suspense
        fallback={
          <div className="flex flex-col items-center justify-center w-full h-full text-white/40">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="font-medium">Loading 3D Video Gallery...</p>
          </div>
        }
      >
        <Canvas
          key={canvasKey}
          style={{ height: '100%', width: '100%', display: 'block' }}
          camera={{ position: [0, 0, 20], fov: 50, near: 0.01, far: 200 }}
          gl={{
            antialias: true,
            alpha: false,
            powerPreference: 'high-performance',
            failIfMajorPerformanceCaveat: false,
          }}
          dpr={[1, 1.5]}
          frameloop="always"
          onCreated={handleCreated}
        >
          <GalleryScene onFocus={handleFocus} />

          {/* Manual focus camera (click-to-zoom) */}
          {!isTourActive && (
            <CameraController
              target={cameraTarget}
              lookAt={cameraLookAt}
              targetUp={cameraUp}
              controlsRef={controlsRef}
              onAnimationEnd={handleAnimationEnd}
            />
          )}

          {/* Tour camera */}
          {isTourActive && (
            <TourCameraController
              phase={tourPhase}
              targetPos={tourTarget.camPos}
              targetLookAt={tourTarget.lookAt}
              targetUp={tourTarget.up}
              controlsRef={controlsRef}
              onArrive={handleTourArrive}
              onMidpoint={handleTourMidpoint}
            />
          )}

          <RingTitle3D activeId={activeTitle} />

          <OrbitControls
            ref={controlsRef}
            makeDefault
            enableDamping
            enabled={controlsEnabled}
          />
        </Canvas>
      </Suspense>
    </div>

    {/* UI overlay — own stacking context above everything (z-200) */}
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 200,
        pointerEvents: 'none',
      }}
    >
      {/* Back button (manual focus, not during tour) */}
      {focusedId !== null && !isTourActive && (
        <button
          onClick={handleBack}
          style={{ pointerEvents: 'auto' }}
          className="absolute top-8 right-8 px-5 py-2.5 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 text-white text-sm font-bold tracking-wide hover:bg-white/20 transition-colors cursor-pointer"
        >
          Back to Overview
        </button>
      )}

      {/* Start Tour button */}
      {!isTourActive && focusedId === null && (
        <button
          onClick={handleStartTour}
          style={{ pointerEvents: 'auto' }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 text-white text-sm font-bold tracking-wide hover:bg-white/20 transition-colors cursor-pointer"
        >
          Start Tour
        </button>
      )}

      {/* Cancel Tour button + progress */}
      {isTourActive && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
          <span className="text-white/50 text-xs font-mono" style={{ pointerEvents: 'none' }}>
            {tourPhase === 'flying-back' ? 'Returning...' : `${Math.min(tourIndex + 1, ALL_FRAGMENTS.length)} / ${ALL_FRAGMENTS.length}`}
          </span>
          <button
            onClick={handleCancelTour}
            style={{ pointerEvents: 'auto' }}
            className="px-6 py-3 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 text-white text-sm font-bold tracking-wide hover:bg-white/20 transition-colors cursor-pointer"
          >
            Cancel Tour
          </button>
        </div>
      )}
    </div>
    </>
  );
}
