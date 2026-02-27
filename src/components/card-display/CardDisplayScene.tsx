'use client';

import { Suspense, useRef, useEffect, useState, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { useWebGLRecovery } from '@/hooks/useWebGLRecovery';

// ============ Card dimensions ============
// ai-answer.png: 900×6000 — full image mapped 1:1, width halved
const CARD_WIDTH = 2.5;
const CARD_HEIGHT = CARD_WIDTH * (6000 / 900); // ~16.67
const H = CARD_HEIGHT / 2; // ~8.33, half-height for camera path offsets

// ============ Cinematic Presets ============

type CinematicPreset = {
  label: string;
  duration: number;
  positions: THREE.Vector3[];
  lookAts: THREE.Vector3[];
  linear?: boolean; // skip smoothstep, use constant speed
};

const PRESETS: Record<string, CinematicPreset> = {
  sweep: {
    label: 'SWEEP',
    duration: 7,
    positions: [
      new THREE.Vector3(0, H * 0.85, 3.5),
      new THREE.Vector3(0, H * 0.55, 3.2),
      new THREE.Vector3(0, H * 0.25, 3.2),
      new THREE.Vector3(0, 0, 3.2),
      new THREE.Vector3(0, -H * 0.25, 3.2),
      new THREE.Vector3(0, -H * 0.55, 3.2),
      new THREE.Vector3(0, -H * 0.85, 3.5),
    ],
    lookAts: [
      new THREE.Vector3(0, H * 0.75, 0),
      new THREE.Vector3(0, H * 0.45, 0),
      new THREE.Vector3(0, H * 0.15, 0),
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, -H * 0.15, 0),
      new THREE.Vector3(0, -H * 0.45, 0),
      new THREE.Vector3(0, -H * 0.75, 0),
    ],
  },
  diagonal: {
    label: 'DIAGONAL',
    duration: 7,
    positions: [
      new THREE.Vector3(-1.5, H * 0.8, 3.8),
      new THREE.Vector3(-1.0, H * 0.5, 3.2),
      new THREE.Vector3(-0.5, H * 0.2, 3.2),
      new THREE.Vector3(0, 0, 3.2),
      new THREE.Vector3(0.5, -H * 0.2, 3.2),
      new THREE.Vector3(1.0, -H * 0.5, 3.2),
      new THREE.Vector3(1.5, -H * 0.8, 3.8),
    ],
    lookAts: [
      new THREE.Vector3(0, H * 0.7, 0),
      new THREE.Vector3(0, H * 0.4, 0),
      new THREE.Vector3(0, H * 0.1, 0),
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, -H * 0.1, 0),
      new THREE.Vector3(0, -H * 0.4, 0),
      new THREE.Vector3(0, -H * 0.7, 0),
    ],
  },
  pan: {
    label: 'PAN',
    duration: 5,
    positions: [
      new THREE.Vector3(-3, H * 0.6, 3.2),
      new THREE.Vector3(-1.5, H * 0.6, 3.2),
      new THREE.Vector3(0, H * 0.6, 3.2),
      new THREE.Vector3(1.5, H * 0.6, 3.2),
      new THREE.Vector3(3, H * 0.6, 3.2),
    ],
    lookAts: [
      new THREE.Vector3(0, H * 0.6, 0),
      new THREE.Vector3(0, H * 0.6, 0),
      new THREE.Vector3(0, H * 0.6, 0),
      new THREE.Vector3(0, H * 0.6, 0),
      new THREE.Vector3(0, H * 0.6, 0),
    ],
  },
  orbit: {
    label: 'ORBIT',
    duration: 6,
    positions: (() => {
      const pts: THREE.Vector3[] = [];
      const steps = 12;
      for (let i = 0; i <= steps; i++) {
        const angle = (i / steps) * Math.PI * 2;
        pts.push(
          new THREE.Vector3(Math.sin(angle) * 4, 0, Math.cos(angle) * 4)
        );
      }
      return pts;
    })(),
    lookAts: (() => {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 12; i++) pts.push(new THREE.Vector3(0, 0, 0));
      return pts;
    })(),
  },
  closeup: {
    label: 'CLOSE-UP',
    duration: 6,
    positions: [
      new THREE.Vector3(0, -H * 0.45, 5),
      new THREE.Vector3(0, -H * 0.5, 3.5),
      new THREE.Vector3(0, -H * 0.55, 2.2),
      new THREE.Vector3(0, -H * 0.6, 2.2),
      new THREE.Vector3(0, -H * 0.65, 3.5),
      new THREE.Vector3(0, -H * 0.7, 5),
    ],
    lookAts: [
      new THREE.Vector3(0, -H * 0.5, 0),
      new THREE.Vector3(0, -H * 0.53, 0),
      new THREE.Vector3(0, -H * 0.56, 0),
      new THREE.Vector3(0, -H * 0.59, 0),
      new THREE.Vector3(0, -H * 0.62, 0),
      new THREE.Vector3(0, -H * 0.65, 0),
    ],
  },
  showcase: {
    label: 'SHOWCASE',
    duration: 18,
    linear: true,
    positions: [
      // — top: left → right, Y & Z constant —
      new THREE.Vector3(-3, H * 0.65, 3.2),
      new THREE.Vector3(-1.5, H * 0.65, 3.2),
      new THREE.Vector3(0, H * 0.65, 3.2),
      new THREE.Vector3(1.5, H * 0.65, 3.2),
      new THREE.Vector3(3, H * 0.65, 3.2),
      // — transition: ease down right side (4 pts) —
      new THREE.Vector3(3, H * 0.5, 3.2),
      new THREE.Vector3(2.8, H * 0.35, 3.2),
      new THREE.Vector3(2.5, H * 0.18, 3.2),
      new THREE.Vector3(2.2, 0, 3.2),
      // — mid: right → left, Y & Z constant —
      new THREE.Vector3(1.5, 0, 3.2),
      new THREE.Vector3(0, 0, 3.2),
      new THREE.Vector3(-1.5, 0, 3.2),
      new THREE.Vector3(-2.2, 0, 3.2),
      // — transition: ease down left side (4 pts) —
      new THREE.Vector3(-2.5, -H * 0.18, 3.2),
      new THREE.Vector3(-2.8, -H * 0.35, 3.2),
      new THREE.Vector3(-3, -H * 0.5, 3.2),
      // — bottom: left → right, Y & Z constant —
      new THREE.Vector3(-3, -H * 0.65, 3.2),
      new THREE.Vector3(-1.5, -H * 0.65, 3.2),
      new THREE.Vector3(0, -H * 0.65, 3.2),
      new THREE.Vector3(1.5, -H * 0.65, 3.2),
      new THREE.Vector3(3, -H * 0.65, 3.2),
    ],
    lookAts: [
      // — top —
      new THREE.Vector3(0, H * 0.65, 0),
      new THREE.Vector3(0, H * 0.65, 0),
      new THREE.Vector3(0, H * 0.65, 0),
      new THREE.Vector3(0, H * 0.65, 0),
      new THREE.Vector3(0, H * 0.65, 0),
      // — transition —
      new THREE.Vector3(0, H * 0.5, 0),
      new THREE.Vector3(0, H * 0.35, 0),
      new THREE.Vector3(0, H * 0.18, 0),
      new THREE.Vector3(0, 0, 0),
      // — mid —
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, 0),
      // — transition —
      new THREE.Vector3(0, -H * 0.18, 0),
      new THREE.Vector3(0, -H * 0.35, 0),
      new THREE.Vector3(0, -H * 0.5, 0),
      // — bottom —
      new THREE.Vector3(0, -H * 0.65, 0),
      new THREE.Vector3(0, -H * 0.65, 0),
      new THREE.Vector3(0, -H * 0.65, 0),
      new THREE.Vector3(0, -H * 0.65, 0),
      new THREE.Vector3(0, -H * 0.65, 0),
    ],
  },
};

function buildCurve(points: THREE.Vector3[], closed = false) {
  return new THREE.CatmullRomCurve3(points, closed, 'catmullrom', 0.35);
}

function smoothstep01(t: number) {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

// ============ Environment ============

function PanoramaEnvironment() {
  const { scene } = useThree();
  const texture = useTexture('/equirectangular-png_15019635.png');

  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  scene.background = texture;
  scene.environment = texture;
  scene.backgroundRotation = new THREE.Euler(0, Math.PI, 0);
  scene.environmentRotation = new THREE.Euler(0, Math.PI, 0);

  return null;
}

// ============ Card + Camera Controller ============

const DRAG_SENSITIVITY = 0.008;
const PAN_SENSITIVITY = 0.01;

type CinematicState = {
  active: boolean;
  t: number;
  posCurve: THREE.CatmullRomCurve3;
  lookCurve: THREE.CatmullRomCurve3;
  duration: number;
  linear: boolean;
};

function CardPlane({
  activeCinematic,
  onCinematicEnd,
}: {
  activeCinematic: string | null;
  onCinematicEnd: () => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const cardTexture = useTexture('/ai-answer.png');
  const { gl, camera } = useThree();

  cardTexture.colorSpace = THREE.SRGBColorSpace;

  // Interaction state
  const dragging = useRef(false);
  const panning = useRef(false);
  const prev = useRef({ x: 0, y: 0 });
  const velocity = useRef({ rx: 0, ry: 0 });
  const panVelocity = useRef({ x: 0, y: 0 });

  // Cinematic state
  const cinRef = useRef<CinematicState | null>(null);

  // Start cinematic when activeCinematic changes
  useEffect(() => {
    if (!activeCinematic) {
      if (cinRef.current) cinRef.current.active = false;
      return;
    }
    const preset = PRESETS[activeCinematic];
    if (!preset) return;

    // Reset card to origin
    if (groupRef.current) {
      groupRef.current.rotation.set(0, 0, 0);
      groupRef.current.position.set(0, 0, 0);
    }

    const closed = activeCinematic === 'orbit';
    cinRef.current = {
      active: true,
      t: 0,
      posCurve: buildCurve(preset.positions, closed),
      lookCurve: buildCurve(preset.lookAts, closed),
      duration: preset.duration,
      linear: preset.linear ?? false,
    };
  }, [activeCinematic]);

  // Pointer events for manual drag
  useEffect(() => {
    const canvas = gl.domElement;

    const onPointerDown = (e: PointerEvent) => {
      if (cinRef.current?.active) return;
      if (e.button === 2 || e.shiftKey) {
        panning.current = true;
      } else {
        dragging.current = true;
      }
      prev.current = { x: e.clientX, y: e.clientY };
      canvas.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (cinRef.current?.active) return;
      const dx = e.clientX - prev.current.x;
      const dy = e.clientY - prev.current.y;
      prev.current = { x: e.clientX, y: e.clientY };

      if (dragging.current) {
        velocity.current.ry = dx * DRAG_SENSITIVITY;
        velocity.current.rx = dy * DRAG_SENSITIVITY;
      } else if (panning.current) {
        panVelocity.current.x = dx * PAN_SENSITIVITY;
        panVelocity.current.y = -dy * PAN_SENSITIVITY;
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      dragging.current = false;
      panning.current = false;
      canvas.releasePointerCapture(e.pointerId);
    };

    const onContextMenu = (e: Event) => e.preventDefault();

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('contextmenu', onContextMenu);
    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('contextmenu', onContextMenu);
    };
  }, [gl]);

  useFrame((_, delta) => {
    const cin = cinRef.current;

    // Cinematic mode
    if (cin?.active) {
      cin.t = Math.min(cin.t + delta / cin.duration, 1);
      const t = cin.linear ? cin.t : smoothstep01(cin.t);
      camera.position.copy(cin.posCurve.getPointAt(t));
      camera.lookAt(cin.lookCurve.getPointAt(t));

      if (cin.t >= 1) {
        cin.active = false;
        onCinematicEnd();
      }
      return;
    }

    // Manual drag mode
    const g = groupRef.current;
    if (!g) return;

    if (dragging.current) {
      g.rotation.y += velocity.current.ry;
      g.rotation.x += velocity.current.rx;
      velocity.current.ry = 0;
      velocity.current.rx = 0;
    }

    if (panning.current) {
      g.position.x += panVelocity.current.x;
      g.position.y += panVelocity.current.y;
      panVelocity.current.x = 0;
      panVelocity.current.y = 0;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh castShadow>
        <planeGeometry args={[CARD_WIDTH, CARD_HEIGHT]} />
        <meshPhysicalMaterial
          map={cardTexture}
          transparent
          alphaTest={0.5}
          side={THREE.DoubleSide}
          roughness={0.35}
          metalness={0.1}
          clearcoat={0.6}
          clearcoatRoughness={0.15}
          reflectivity={0.4}
          envMapIntensity={0.8}
        />
      </mesh>
    </group>
  );
}

// ============ Exported Component ============

const PRESET_KEYS = Object.keys(PRESETS);

export default function CardDisplayScene() {
  const { contextLost, canvasKey, handleCreated } = useWebGLRecovery('CardDisplay');
  const [activeCinematic, setActiveCinematic] = useState<string | null>(null);

  const onCinematicEnd = useCallback(() => setActiveCinematic(null), []);

  const handlePresetClick = useCallback(
    (key: string) => {
      setActiveCinematic((prev) => (prev === key ? null : key));
    },
    []
  );

  if (contextLost) {
    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: '#000',
          zIndex: 100,
        }}
        className="flex flex-col items-center justify-center text-white/40"
      >
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="font-medium">Recovering 3D Engine...</p>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: '#000',
        zIndex: 100,
        overflow: 'hidden',
      }}
    >
      <Suspense
        fallback={
          <div className="flex flex-col items-center justify-center w-full h-full text-white/40">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="font-medium">Loading Scene...</p>
          </div>
        }
      >
        <Canvas
          key={canvasKey}
          shadows
          style={{ height: '100%', width: '100%', display: 'block' }}
          camera={{ position: [0, 0, 8], fov: 40 }}
          gl={{ antialias: true, alpha: false }}
          dpr={[1, 2]}
          onCreated={handleCreated}
        >
          <ambientLight intensity={1.0} />
          <spotLight
            position={[5, 8, 5]}
            angle={0.4}
            penumbra={1}
            intensity={3}
            castShadow
          />
          <pointLight position={[-5, -3, -5]} intensity={1.5} color="#3DB5E6" />
          <pointLight position={[5, 3, 5]} intensity={1} color="#ffffff" />

          <CardPlane
            activeCinematic={activeCinematic}
            onCinematicEnd={onCinematicEnd}
          />
          <PanoramaEnvironment />
        </Canvas>
      </Suspense>

      {/* Cinematic preset buttons */}
      <div
        style={{
          position: 'absolute',
          bottom: 32,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 200,
          display: 'flex',
          gap: 8,
        }}
      >
        {PRESET_KEYS.map((key) => {
          const active = activeCinematic === key;
          return (
            <button
              key={key}
              onClick={() => handlePresetClick(key)}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                border: active
                  ? '1px solid rgba(96,165,250,0.8)'
                  : '1px solid rgba(255,255,255,0.15)',
                backgroundColor: active
                  ? 'rgba(96,165,250,0.2)'
                  : 'rgba(255,255,255,0.06)',
                color: active ? '#93c5fd' : 'rgba(255,255,255,0.45)',
                fontSize: 11,
                fontFamily: 'monospace',
                fontWeight: 600,
                letterSpacing: '0.05em',
                cursor: 'pointer',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
              }}
            >
              {PRESETS[key].label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
