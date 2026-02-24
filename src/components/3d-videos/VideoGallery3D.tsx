'use client';

import { Canvas, useThree, useFrame, useLoader } from '@react-three/fiber';
import type { RootState } from '@react-three/fiber';
import { OrbitControls, useTexture } from '@react-three/drei';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { Suspense, useRef, useState, useCallback, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import VideoPlane from './VideoPlane';
import GlassVideoPanel from './GlassVideoPanel';

// ─── Video sources (only 2 unique videos) ────────────────────────
const VIDEO_SOURCES = [
  '/video/BigBuckBunny.mp4',
  '/video/ElephantsDream.mp4',
] as const;

// ─── Plane layout (scattered like memory fragments) ─────────────
const PLANES = [
  { id: '1', pos: [-10, 5, -3] as [number, number, number], rot: [0.25, 0.6, -0.15] as [number, number, number], videoIdx: 0 },
  { id: '2', pos: [8, 7, -8] as [number, number, number], rot: [-0.3, -0.45, 0.2] as [number, number, number], videoIdx: 1 },
  { id: '3', pos: [-3, -7, -2] as [number, number, number], rot: [0.4, 0.15, 0.35] as [number, number, number], videoIdx: 1 },
  { id: '4', pos: [12, -4, -6] as [number, number, number], rot: [-0.15, -0.7, -0.25] as [number, number, number], videoIdx: 0 },
  { id: '5', pos: [-13, -1, -10] as [number, number, number], rot: [0.5, 0.8, 0.1] as [number, number, number], videoIdx: 0 },
  { id: '6', pos: [4, 9, -11] as [number, number, number], rot: [-0.2, -0.35, 0.45] as [number, number, number], videoIdx: 1 },
  { id: '7', pos: [1, -9, -5] as [number, number, number], rot: [0.35, 0.1, -0.5] as [number, number, number], videoIdx: 0 },
  { id: '8', pos: [-7, 2, -12] as [number, number, number], rot: [-0.4, 0.55, 0.3] as [number, number, number], videoIdx: 1 },
];

// ─── Glass video panels (scattered) ─────────────────────────────
const GLASS_PANELS = [
  { id: 'g1', pos: [3, 1, 3] as [number, number, number], rot: [0.15, -0.4, 0.2] as [number, number, number], videoIdx: 0, w: 5, h: 3, color: '#fca5a5' },
  { id: 'g2', pos: [-9, 6, -6] as [number, number, number], rot: [-0.3, 0.5, -0.15] as [number, number, number], videoIdx: 1, w: 4, h: 2.5, color: '#bbf7d0' },
  { id: 'g3', pos: [10, -6, -1] as [number, number, number], rot: [0.2, -0.6, 0.35] as [number, number, number], videoIdx: 0, w: 4.5, h: 2.8, color: '#d8b4fe' },
];

// ─── All fragments in tour order ────────────────────────────────
type FragmentDef = { id: string; pos: [number, number, number]; rot: [number, number, number] };
const ALL_FRAGMENTS: FragmentDef[] = [...PLANES, ...GLASS_PANELS];

// ─── Fragment titles (random) ───────────────────────────────────
const FRAGMENT_META: Record<string, { title: string; subtitle: string }> = {
  '1': { title: 'Distant Echo', subtitle: 'A memory fading into silence' },
  '2': { title: 'Neon Drift', subtitle: 'Lights bleeding through the void' },
  '3': { title: 'Frozen Pulse', subtitle: 'Time suspended in crystal' },
  '4': { title: 'Solar Wind', subtitle: 'Particles dancing at light speed' },
  '5': { title: 'Deep Current', subtitle: 'Waves beneath the surface' },
  '6': { title: 'Ghost Signal', subtitle: 'Transmission from another world' },
  '7': { title: 'Void Bloom', subtitle: 'Flowers growing in zero gravity' },
  '8': { title: 'Static Dream', subtitle: 'Consciousness between channels' },
  'g1': { title: 'Crystal Memory', subtitle: 'Fragments preserved in glass' },
  'g2': { title: 'Emerald Gate', subtitle: 'Portal to forgotten realms' },
  'g3': { title: 'Amethyst Core', subtitle: 'Energy crystallized in time' },
};

const INITIAL_CAM_POS = new THREE.Vector3(0, 0, 20);
const INITIAL_LOOK_AT = new THREE.Vector3(0, 0, 0);
const LERP_SPEED = 3;
const TOUR_FLIGHT_DURATION = 2; // seconds per flight
const TOUR_DWELL_TIME = 2500; // ms — enough time to read the title
const TOUR_VIEW_DISTANCE = 5; // how far camera sits from fragment

type TourPhase = 'idle' | 'flying-to' | 'dwelling' | 'flying-back';

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// ─── Panorama background (same as 3d-viewer) ─────────────────────
function PanoramaEnvironment() {
  const { scene } = useThree();
  const texture = useTexture('/panas/scifi_dark_scary_laboratory_metallic_doors (4).jpg');

  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  scene.background = texture;

  // Use a cloned texture for environment to avoid WebGL
  // "textures can not be used with multiple targets" error
  // (background and environment conversions bind to different targets)
  const envTexture = useMemo(() => {
    const t = texture.clone();
    t.mapping = THREE.EquirectangularReflectionMapping;
    return t;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texture.id]);
  scene.environment = envTexture;

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
  targetUp: THREE.Vector3 | null;
  controlsRef: React.RefObject<typeof OrbitControls | null>;
  onAnimationEnd?: () => void;
}

function CameraController({ target, lookAt, targetUp, controlsRef, onAnimationEnd }: CameraControllerProps) {
  const { camera } = useThree();
  const currentLookAt = useRef(new THREE.Vector3(0, 0, 0));
  const isAnimating = useRef(false);

  useEffect(() => {
    isAnimating.current = true;
  }, [target]);

  // Priority -1: run BEFORE title useFrame (priority 0) so camera is updated first
  useFrame((_, delta) => {
    if (!isAnimating.current) return;

    const dest = target ?? INITIAL_CAM_POS;
    const look = lookAt ?? new THREE.Vector3(0, 0, 0);
    const up = targetUp ?? new THREE.Vector3(0, 1, 0);
    const t = Math.min(1, delta * LERP_SPEED);

    camera.position.lerp(dest, t);
    camera.up.lerp(up, t).normalize();
    currentLookAt.current.lerp(look, t);
    camera.lookAt(currentLookAt.current);

    // Check if close enough to stop
    if (camera.position.distanceTo(dest) < 0.01) {
      camera.position.copy(dest);
      camera.up.copy(up).normalize();
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
  }, -1);

  return null;
}

// ─── Tour camera controller ─────────────────────────────────────
interface TourCameraControllerProps {
  phase: TourPhase;
  targetPos: THREE.Vector3;
  targetLookAt: THREE.Vector3;
  targetUp: THREE.Vector3;
  controlsRef: React.RefObject<typeof OrbitControls | null>;
  onArrive: () => void;
  onMidpoint?: () => void;
}

function TourCameraController({ phase, targetPos, targetLookAt, targetUp, controlsRef, onArrive, onMidpoint }: TourCameraControllerProps) {
  const { camera } = useThree();
  const progress = useRef(0);
  const startPos = useRef(new THREE.Vector3());
  const startLookAt = useRef(new THREE.Vector3());
  const startUp = useRef(new THREE.Vector3(0, 1, 0));
  const currentLookAt = useRef(new THREE.Vector3());
  const prevTargetId = useRef('');
  const arrivedRef = useRef(false);
  const midpointFired = useRef(false);

  // Reset animation when target changes
  useEffect(() => {
    if (phase === 'idle' || phase === 'dwelling') return;
    const targetId = `${targetPos.x},${targetPos.y},${targetPos.z}`;
    if (targetId === prevTargetId.current) return;
    prevTargetId.current = targetId;

    startPos.current.copy(camera.position);
    startUp.current.copy(camera.up);
    // Derive current lookAt from camera direction
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    startLookAt.current.copy(camera.position).add(dir.multiplyScalar(10));
    currentLookAt.current.copy(startLookAt.current);
    progress.current = 0;
    arrivedRef.current = false;
    midpointFired.current = false;
  }, [phase, targetPos, camera]);

  // Priority -1: run BEFORE title useFrame (priority 0) so camera is updated first
  useFrame((_, delta) => {
    if (phase === 'idle' || phase === 'dwelling') return;
    if (arrivedRef.current) return;

    progress.current = Math.min(1, progress.current + delta / TOUR_FLIGHT_DURATION);
    const t = easeInOutCubic(progress.current);

    // Interpolate position
    camera.position.lerpVectors(startPos.current, targetPos, t);
    // Interpolate up vector to align with fragment
    camera.up.lerpVectors(startUp.current, targetUp, t).normalize();
    // Interpolate lookAt
    currentLookAt.current.lerpVectors(startLookAt.current, targetLookAt, t);
    camera.lookAt(currentLookAt.current);

    // Fire midpoint callback when easeIn transitions to easeOut
    if (!midpointFired.current && progress.current >= 0.5) {
      midpointFired.current = true;
      onMidpoint?.();
    }

    if (progress.current >= 1) {
      camera.position.copy(targetPos);
      camera.up.copy(targetUp).normalize();
      camera.lookAt(targetLookAt);
      arrivedRef.current = true;

      // Sync OrbitControls target
      if (controlsRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const controls = controlsRef.current as any;
        controls.target.copy(targetLookAt);
        controls.update();
      }
      onArrive();
    }
  }, -1);

  return null;
}

// ─── Compute camera position to face a fragment ─────────────────
function getFragmentCameraTarget(fragment: FragmentDef): { camPos: THREE.Vector3; lookAt: THREE.Vector3; up: THREE.Vector3 } {
  const pos = new THREE.Vector3(...fragment.pos);
  const euler = new THREE.Euler(...fragment.rot);
  const quat = new THREE.Quaternion().setFromEuler(euler);
  const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(quat);
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(quat);
  const camPos = pos.clone().add(normal.clone().multiplyScalar(TOUR_VIEW_DISTANCE));
  return { camPos, lookAt: pos, up };
}

// ─── 3D Fragment title (perspective depth like expect2.png) ─────
// Single Text mesh per line. The group follows camera position but is
// rotated relative to the camera view, so the text plane recedes into
// depth — left side near camera (big), right side far (small).

// ─── Title tunables (adjust these to reposition / restyle) ────
const TITLE_OFFSET_X = -2.8;   // camera-local X: negative = left
const TITLE_OFFSET_Y = 1.4;    // camera-local Y: positive = up
const TITLE_OFFSET_Z = -5.0;   // camera-local Z: negative = further from camera
const TITLE_ROTATE_Y = 0.8;    // radians – perspective depth
const TITLE_ROTATE_Z = 0.5;    // radians – diagonal tilt
const TITLE_ENTER_DURATION = 800; // ms
const TITLE_EXIT_DURATION = 600;
const TITLE_SLIDE_DISTANCE = 3; // local-X units along diagonal

const FONT_URL = '/fonts/MPLUSRounded1c-Regular.typeface.json';
const TITLE_FONT_SIZE = 0.8;
const SUBTITLE_FONT_SIZE = 0.22;

function FragmentTitle3D({ activeId }: { activeId: string | null }) {
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
    // Title will enter at flight midpoint via onMidpoint callback
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
      // Title is already showing (set at start of flight) — hold during dwell
      setTourPhase('dwelling');
      tourPhaseRef.current = 'dwelling';

      setTimeout(() => {
        if (tourPhaseRef.current !== 'dwelling') return;

        setTourIndex((prev) => {
          const next = prev + 1;
          if (next >= ALL_FRAGMENTS.length) {
            // Tour complete — exit title and fly back
            setActiveTitle(null);
            setTourPhase('flying-back');
            tourPhaseRef.current = 'flying-back';
            return prev;
          }
          tourIndexRef.current = next;
          // Exit old title now; new title enters at flight midpoint
          setActiveTitle(null);
          setTourPhase('flying-to');
          tourPhaseRef.current = 'flying-to';
          return next;
        });
      }, TOUR_DWELL_TIME);
    }
  }, []);

  const handleTourMidpoint = useCallback(() => {
    // New title enters at the easeIn→easeOut inflection point
    if (tourPhaseRef.current === 'flying-to' && tourIndexRef.current < ALL_FRAGMENTS.length) {
      setActiveTitle(ALL_FRAGMENTS[tourIndexRef.current].id);
    }
  }, []);

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
    // Ignore clicks during tour
    if (tourPhaseRef.current !== 'idle') return;

    setFocusedId(id);
    focusedIdRef.current = id;
    setControlsEnabled(false);
    // Show title at start of flight (easeIn)
    setActiveTitle(id);
    const camPos = planePos.clone().add(planeNormal.clone().multiplyScalar(5));
    setCameraTarget(camPos);
    setCameraLookAt(planePos.clone());

    // Compute up vector from fragment's rotation
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

          <FragmentTitle3D activeId={activeTitle} />

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
