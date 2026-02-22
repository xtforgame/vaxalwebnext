'use client';

import { Canvas, useThree, useFrame } from '@react-three/fiber';
import type { RootState } from '@react-three/fiber';
import { OrbitControls, useTexture } from '@react-three/drei';
import { Suspense, useRef, useState, useCallback, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import VideoPlane from './VideoPlane';
import GlassVideoPanel from './GlassVideoPanel';

// ─── Video sources (only 2 unique videos) ────────────────────────
const VIDEO_SOURCES = [
  '/video/BigBuckBunny.mp4',
  '/video/ElephantsDream.mp4',
] as const;

// ─── Plane layout ────────────────────────────────────────────────
const PLANES = [
  { id: '1', pos: [-6, 3, -2] as [number, number, number], rot: [0, 0.3, 0] as [number, number, number], videoIdx: 0 },
  { id: '2', pos: [5, 4, -4] as [number, number, number], rot: [0, -0.2, 0] as [number, number, number], videoIdx: 1 },
  { id: '3', pos: [-4, -3, -1] as [number, number, number], rot: [0, 0.15, 0] as [number, number, number], videoIdx: 1 },
  { id: '4', pos: [7, -2, -3] as [number, number, number], rot: [0, -0.35, 0] as [number, number, number], videoIdx: 0 },
  { id: '5', pos: [-8, 0, -5] as [number, number, number], rot: [0, 0.4, 0] as [number, number, number], videoIdx: 0 },
  { id: '6', pos: [3, 6, -6] as [number, number, number], rot: [0, -0.1, 0] as [number, number, number], videoIdx: 1 },
  { id: '7', pos: [0, -5, -3] as [number, number, number], rot: [0, 0.05, 0] as [number, number, number], videoIdx: 0 },
  { id: '8', pos: [-2, 1, -8] as [number, number, number], rot: [0, 0.2, 0] as [number, number, number], videoIdx: 1 },
];

// ─── Glass video panels ──────────────────────────────────────────
const GLASS_PANELS = [
  { id: 'g1', pos: [2, 0, 2] as [number, number, number], rot: [0, -0.15, 0] as [number, number, number], videoIdx: 0, w: 5, h: 3, color: '#fca5a5' },
  { id: 'g2', pos: [-5, 4, -3] as [number, number, number], rot: [0, 0.25, 0] as [number, number, number], videoIdx: 1, w: 4, h: 2.5, color: '#bbf7d0' },
  { id: 'g3', pos: [6, -4, 0] as [number, number, number], rot: [0, -0.3, 0] as [number, number, number], videoIdx: 0, w: 4.5, h: 2.8, color: '#d8b4fe' },
];

const INITIAL_CAM_POS = new THREE.Vector3(0, 0, 20);
const LERP_SPEED = 3;

// ─── Panorama background (same as 3d-viewer) ─────────────────────
function PanoramaEnvironment() {
  const { scene } = useThree();
  const texture = useTexture('/panas/scifi_dark_scary_laboratory_metallic_doors (4).jpg');

  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  scene.background = texture;
  scene.environment = texture;

  return null;
}

// ─── Shared video textures (only 2 decoders) ─────────────────────
function useSharedVideoTextures() {
  const resourcesRef = useRef<
    { video: HTMLVideoElement; texture: THREE.VideoTexture; material: THREE.MeshBasicMaterial }[]
  >([]);

  // Create video elements + textures once after mount
  if (resourcesRef.current.length === 0) {
    resourcesRef.current = VIDEO_SOURCES.map((src) => {
      const video = document.createElement('video');
      video.src = src;
      video.crossOrigin = 'anonymous';
      video.loop = true;
      video.muted = true;
      video.playsInline = true;
      video.preload = 'auto';

      const texture = new THREE.VideoTexture(video);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;

      const material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });

      return { video, texture, material };
    });
  }

  // Start playback after mount (not during render)
  useEffect(() => {
    resourcesRef.current.forEach(({ video }) => {
      video.play().catch(() => {});
    });

    return () => {
      resourcesRef.current.forEach(({ video, texture, material }) => {
        video.pause();
        video.removeAttribute('src');
        video.load();
        texture.dispose();
        material.dispose();
      });
    };
  }, []);

  // Only update texture when video actually has decoded frames
  // readyState >= HAVE_CURRENT_DATA means at least one frame is available
  useFrame(() => {
    resourcesRef.current.forEach(({ video, texture }) => {
      if (video.readyState >= video.HAVE_CURRENT_DATA) {
        texture.needsUpdate = true;
      }
    });
  });

  return resourcesRef.current.map((r) => r.material);
}

// ─── Camera controller ───────────────────────────────────────────
interface CameraControllerProps {
  target: THREE.Vector3 | null;
  lookAt: THREE.Vector3 | null;
  controlsRef: React.RefObject<typeof OrbitControls | null>;
  onAnimationEnd?: () => void;
}

function CameraController({ target, lookAt, controlsRef, onAnimationEnd }: CameraControllerProps) {
  const { camera } = useThree();
  const currentLookAt = useRef(new THREE.Vector3(0, 0, 0));
  const isAnimating = useRef(false);

  useEffect(() => {
    isAnimating.current = true;
  }, [target]);

  useFrame((_, delta) => {
    if (!isAnimating.current) return;

    const dest = target ?? INITIAL_CAM_POS;
    const look = lookAt ?? new THREE.Vector3(0, 0, 0);

    camera.position.lerp(dest, Math.min(1, delta * LERP_SPEED));
    currentLookAt.current.lerp(look, Math.min(1, delta * LERP_SPEED));
    camera.lookAt(currentLookAt.current);

    // Check if close enough to stop
    if (camera.position.distanceTo(dest) < 0.01) {
      camera.position.copy(dest);
      currentLookAt.current.copy(look);
      camera.lookAt(look);
      isAnimating.current = false;

      // Re-sync OrbitControls target, then notify parent
      if (controlsRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const controls = controlsRef.current as any;
        controls.target.copy(look);
        controls.update();
      }
      onAnimationEnd?.();
    }
  });

  return null;
}

// ─── Scene (inside Canvas) ───────────────────────────────────────
function GalleryScene({
  onFocus,
}: {
  onFocus: (id: string, pos: THREE.Vector3, normal: THREE.Vector3) => void;
}) {
  const materials = useSharedVideoTextures();

  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={0.6} />

      <PanoramaEnvironment />

      {PLANES.map((p) => (
        <VideoPlane
          key={p.id}
          id={p.id}
          position={p.pos}
          rotation={p.rot}
          material={materials[p.videoIdx]}
          onFocus={onFocus}
        />
      ))}

      {GLASS_PANELS.map((g) => (
        <GlassVideoPanel
          key={g.id}
          id={g.id}
          position={g.pos}
          rotation={g.rot}
          width={g.w}
          height={g.h}
          color={g.color}
          material={materials[g.videoIdx]}
          onFocus={onFocus}
        />
      ))}
    </>
  );
}

// ─── Main component ──────────────────────────────────────────────
export default function VideoGallery3D() {
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const focusedIdRef = useRef<string | null>(null);
  const [cameraTarget, setCameraTarget] = useState<THREE.Vector3 | null>(null);
  const [cameraLookAt, setCameraLookAt] = useState<THREE.Vector3 | null>(null);
  const [controlsEnabled, setControlsEnabled] = useState(true);
  const controlsRef = useRef(null);

  // ─── WebGL context recovery (same pattern as GlassViewer) ──────
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

  // Force re-mount canvas when context is lost
  useEffect(() => {
    if (contextLost) {
      const timer = setTimeout(() => {
        setCanvasKey((prev) => prev + 1);
        setContextLost(false);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [contextLost]);

  const handleFocus = useCallback((id: string, planePos: THREE.Vector3, planeNormal: THREE.Vector3) => {
    setFocusedId(id);
    focusedIdRef.current = id;
    setControlsEnabled(false);
    const camPos = planePos.clone().add(planeNormal.clone().multiplyScalar(5));
    setCameraTarget(camPos);
    setCameraLookAt(planePos.clone());
  }, []);

  const handleBack = useCallback(() => {
    setFocusedId(null);
    focusedIdRef.current = null;
    // Controls stay disabled — CameraController re-enables via onAnimationEnd
    setCameraTarget(null);
    setCameraLookAt(null);
  }, []);

  const handleAnimationEnd = useCallback(() => {
    // Re-enable controls only when returning to overview (no focused video)
    if (focusedIdRef.current === null) {
      setControlsEnabled(true);
    }
  }, []);

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

          <CameraController
            target={cameraTarget}
            lookAt={cameraLookAt}
            controlsRef={controlsRef}
            onAnimationEnd={handleAnimationEnd}
          />

          <OrbitControls
            ref={controlsRef}
            makeDefault
            enableDamping
            enabled={controlsEnabled}
          />
        </Canvas>
      </Suspense>
    </div>

    {/* Back button — own stacking context above everything (z-[200]) */}
    {focusedId !== null && (
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
        <button
          onClick={handleBack}
          style={{ pointerEvents: 'auto' }}
          className="absolute top-8 right-8 px-5 py-2.5 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 text-white text-sm font-bold tracking-wide hover:bg-white/20 transition-colors cursor-pointer"
        >
          Back to Overview
        </button>
      </div>
    )}
    </>
  );
}
