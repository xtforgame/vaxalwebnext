'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, useTexture } from '@react-three/drei';
import { Suspense, useRef, useMemo, useState, useCallback } from 'react';
import * as THREE from 'three';
import { GlassMaterial } from '@/components/3d/GlassMaterial';
import { ScreenGlow } from '@/components/3d/ScreenGlow';
import { createRoundedBoxGeometry, generateOutlinePoints } from '@/components/3d/utils/rounded-box';
import { useWebGLRecovery } from '@/hooks/useWebGLRecovery';

// ─── Easing ─────────────────────────────────────────────────────────
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

// ─── Crystal + Glow: single component, single useFrame ─────────────
function CrystalWithGlow({
  showShine,
  chargingRef,
  chargeStartRef,
  chargeLevelRef,
  chargeDuration,
  setChargeLevel,
}: {
  showShine: boolean;
  chargingRef: React.RefObject<boolean>;
  chargeStartRef: React.RefObject<number>;
  chargeLevelRef: React.RefObject<number>;
  chargeDuration: number;
  setChargeLevel: (v: number) => void;
}) {
  const WIDTH = 4.2;
  const HEIGHT = 5.6;
  const DEPTH = 0.2;
  const RADIUS = 0.1;

  const groupRef = useRef<THREE.Group>(null);
  const lightRef = useRef<THREE.PointLight>(null);

  const geometry = useMemo(
    () => createRoundedBoxGeometry(WIDTH, HEIGHT, DEPTH, RADIUS, 6),
    []
  );

  // Local-space outline points (constant, never changes)
  const outlineLocal = useMemo(
    () => generateOutlinePoints(WIDTH, HEIGHT, RADIUS),
    []
  );

  // ═══ ONE useFrame — all per-frame logic ═══
  useFrame((state) => {
    const t = state.clock.elapsedTime;

    // ── Step 1: Charge animation ──
    if (chargingRef.current) {
      if (chargeStartRef.current === 0) chargeStartRef.current = t;
      const progress = Math.min((t - chargeStartRef.current) / chargeDuration, 1);
      const eased = easeOutCubic(progress);
      chargeLevelRef.current = eased;
      setChargeLevel(eased);
      if (progress >= 1) chargingRef.current = false;
    }

    const charge = chargeLevelRef.current;

    // ── Step 2: Crystal transform ──
    if (!groupRef.current) return;
    groupRef.current.rotation.x = Math.cos(t / 2.5) / 20;
    groupRef.current.rotation.y = Math.sin(t / 2) / 12;
    groupRef.current.position.y = Math.sin(t / 2) / 25;
    groupRef.current.updateMatrixWorld();

    if (lightRef.current) {
      const pulse = Math.sin(t * 3) * 0.15 + 0.85;
      lightRef.current.intensity = charge * 3.0 * pulse;
    }
  });

  return (
    <>
      {/* Crystal */}
      <group ref={groupRef}>
        <pointLight
          ref={lightRef}
          color="#ff9a16"
          intensity={0}
          distance={15}
          decay={2}
        />
        <mesh geometry={geometry}>
          <GlassMaterial
            color="#fde8cd"
            opacity={0.12}
            ior={1.5}
            chromaticAberration={0.6}
            reflectivity={1.0}
            envMapIntensity={1.0}
            fresnelPower={1.2}
            thickness={DEPTH}
            absorption={2.5}
            chargeLevel={chargeLevelRef.current}
            energyColor="#ff9a16"
          />
        </mesh>
      </group>

      {/* Fullscreen glow — projection done in shader, not JS */}
      <ScreenGlow
        targetRef={groupRef}
        outlinePoints={outlineLocal}
        chargeLevelRef={chargeLevelRef}
        enabled={showShine}
      />
    </>
  );
}

// ─── Environment ────────────────────────────────────────────────────
function PanoramaEnvironment() {
  const { scene } = useThree();
  const texture = useTexture('/panas/scifi_dark_scary_laboratory_metallic_doors (4).jpg');

  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  scene.background = texture;
  scene.environment = texture;

  return null;
}

// ─── Toggle Button ──────────────────────────────────────────────────
function ToggleButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px',
        borderRadius: 6,
        border: `1px solid ${active ? 'rgba(255,154,22,0.5)' : 'rgba(255,255,255,0.15)'}`,
        background: active ? 'rgba(255,154,22,0.15)' : 'rgba(255,255,255,0.05)',
        color: active ? '#ffb347' : 'rgba(255,255,255,0.5)',
        fontSize: 12,
        cursor: 'pointer',
        backdropFilter: 'blur(8px)',
        transition: 'all 0.2s',
      }}
    >
      <span style={{
        width: 10,
        height: 10,
        borderRadius: 2,
        border: `1px solid ${active ? '#ffb347' : 'rgba(255,255,255,0.3)'}`,
        background: active ? '#ff9a16' : 'transparent',
        display: 'inline-block',
      }} />
      {label}
    </button>
  );
}

// ─── Main Viewer ────────────────────────────────────────────────────
export default function EnergyCrystalViewer() {
  const { contextLost, canvasKey, handleCreated } = useWebGLRecovery('EnergyCrystal');

  const [chargeLevel, setChargeLevel] = useState(0);
  const chargingRef = useRef(false);
  const chargeStartRef = useRef(0);
  const chargeLevelRef = useRef(0);

  const [showShine, setShowShine] = useState(true);

  const startCharging = useCallback(() => {
    chargingRef.current = true;
    chargeStartRef.current = 0;
    chargeLevelRef.current = 0;
    setChargeLevel(0);
  }, []);

  const reset = useCallback(() => {
    chargingRef.current = false;
    chargeLevelRef.current = 0;
    setChargeLevel(0);
  }, []);

  if (contextLost) {
    return (
      <div className="w-full h-screen bg-slate-100 flex items-center justify-center text-slate-400">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="font-medium">Recovering 3D Engine...</p>
      </div>
    );
  }

  return (
    <div style={{ width: '100vw', height: '100vh', backgroundColor: '#0a0a0f', overflow: 'hidden', position: 'relative' }}>
      {/* Action Controls */}
      <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 10, display: 'flex', gap: 8 }}>
        <button
          onClick={startCharging}
          style={{
            padding: '8px 20px',
            borderRadius: 8,
            border: '1px solid rgba(255,154,22,0.4)',
            background: 'rgba(255,154,22,0.15)',
            color: '#ffb347',
            fontSize: 14,
            cursor: 'pointer',
            backdropFilter: 'blur(8px)',
            transition: 'background 0.2s',
          }}
        >
          Charge
        </button>
        <button
          onClick={reset}
          style={{
            padding: '8px 20px',
            borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.2)',
            background: 'rgba(255,255,255,0.1)',
            color: '#fff',
            fontSize: 14,
            cursor: 'pointer',
            backdropFilter: 'blur(8px)',
            transition: 'background 0.2s',
          }}
        >
          Reset
        </button>
      </div>

      {/* Effects Toggle Panel */}
      <div style={{
        position: 'absolute',
        top: 16,
        left: 16,
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        padding: '8px 10px',
        borderRadius: 8,
        border: '1px solid rgba(255,255,255,0.1)',
        background: 'rgba(0,0,0,0.4)',
        backdropFilter: 'blur(12px)',
      }}>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 2 }}>Effects</span>
        <ToggleButton label="Shine" active={showShine} onClick={() => setShowShine(v => !v)} />
      </div>

      {/* Charge level indicator */}
      <div style={{
        position: 'absolute',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10,
        width: 200,
      }}>
        <div style={{
          height: 4,
          borderRadius: 2,
          background: 'rgba(255,255,255,0.1)',
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${chargeLevel * 100}%`,
            background: 'linear-gradient(90deg, #ff9a16, #ffcc00)',
            borderRadius: 2,
            transition: 'width 0.1s',
          }} />
        </div>
        <p style={{
          textAlign: 'center',
          color: 'rgba(255,255,255,0.4)',
          fontSize: 12,
          marginTop: 6,
        }}>
          {Math.round(chargeLevel * 100)}%
        </p>
      </div>

      <Suspense
        fallback={
          <div className="flex items-center justify-center w-full h-full text-slate-400">
            <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="font-medium">Loading...</p>
          </div>
        }
      >
        <Canvas
          key={canvasKey}
          shadows
          style={{ height: '100%', width: '100%', display: 'block' }}
          camera={{ position: [0, 0, 10], fov: 35 }}
          gl={{
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance',
          }}
          dpr={[1, 1.5]}
          onCreated={handleCreated}
          frameloop="always"
        >
          <ambientLight intensity={0.4} />
          <spotLight position={[5, 8, 10]} angle={0.3} penumbra={1} intensity={1.2} castShadow />
          <pointLight position={[-8, -5, -5]} intensity={0.6} color="#3DB5E6" />

          <OrbitControls
            makeDefault
            enableDamping
            minPolarAngle={Math.PI / 4}
            maxPolarAngle={Math.PI / 1.5}
          />

          <CrystalWithGlow
            showShine={showShine}
            chargingRef={chargingRef}
            chargeStartRef={chargeStartRef}
            chargeLevelRef={chargeLevelRef}
            chargeDuration={4}
            setChargeLevel={setChargeLevel}
          />

          <mesh position={[4, 0, 0]}>
            <boxGeometry args={[1.5, 1.5, 1.5]} />
            <meshStandardMaterial color="#cccccc" roughness={0.6} />
          </mesh>

          <PanoramaEnvironment />
        </Canvas>
      </Suspense>
    </div>
  );
}
