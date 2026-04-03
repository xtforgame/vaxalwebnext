'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, useTexture } from '@react-three/drei';
import { Suspense, useRef, useMemo, useState, useCallback } from 'react';
import * as THREE from 'three';
import { GlassMaterial } from '@/components/3d/GlassMaterial';
import { createRoundedBoxGeometry } from '@/components/3d/utils/rounded-box';
import { useWebGLRecovery } from '@/hooks/useWebGLRecovery';

// ─── Easing ─────────────────────────────────────────────────────────
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

// ─── Energy Crystal Panel ───────────────────────────────────────────
function EnergyCrystalPanel({ chargeLevel }: { chargeLevel: number }) {
  const width = 4.2;
  const height = 5.6;
  const depth = 0.2;
  const radius = 0.1;
  const groupRef = useRef<THREE.Group>(null);
  const lightRef = useRef<THREE.PointLight>(null);

  const geometry = useMemo(
    () => createRoundedBoxGeometry(width, height, depth, radius, 6),
    []
  );

  // Gentle floating animation
  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.rotation.x = Math.cos(t / 2.5) / 20;
    groupRef.current.rotation.y = Math.sin(t / 2) / 12;
    groupRef.current.position.y = Math.sin(t / 2) / 25;

    // Dynamic point light intensity follows charge
    if (lightRef.current) {
      const pulse = Math.sin(t * 3) * 0.15 + 0.85;
      lightRef.current.intensity = chargeLevel * 3.0 * pulse;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Internal point light — casts warm light outward through the glass */}
      <pointLight
        ref={lightRef}
        color="#ff9a16"
        intensity={0}
        distance={15}
        decay={2}
      />

      {/* Crystal body */}
      <mesh geometry={geometry}>
        <GlassMaterial
          color="#fde8cd"
          opacity={0.12}
          ior={1.5}
          chromaticAberration={0.6}
          reflectivity={1.0}
          envMapIntensity={1.0}
          fresnelPower={1.2}
          thickness={depth}
          absorption={2.5}
          chargeLevel={chargeLevel}
          energyColor="#ff9a16"
        />
      </mesh>
    </group>
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

// ─── Charge animation hook ──────────────────────────────────────────
function useChargeAnimation() {
  const [chargeLevel, setChargeLevel] = useState(0);
  const chargingRef = useRef(false);
  const startTimeRef = useRef(0);
  const durationRef = useRef(4); // seconds to fully charge

  const startCharging = useCallback(() => {
    chargingRef.current = true;
    startTimeRef.current = 0; // will be set on first frame
    setChargeLevel(0);
  }, []);

  const reset = useCallback(() => {
    chargingRef.current = false;
    setChargeLevel(0);
  }, []);

  // This must be called from within the Canvas via a component
  const ChargeAnimator = () => {
    useFrame((state) => {
      if (!chargingRef.current) return;

      if (startTimeRef.current === 0) {
        startTimeRef.current = state.clock.elapsedTime;
      }

      const elapsed = state.clock.elapsedTime - startTimeRef.current;
      const t = Math.min(elapsed / durationRef.current, 1);
      const eased = easeOutCubic(t);

      setChargeLevel(eased);

      if (t >= 1) {
        chargingRef.current = false;
      }
    });
    return null;
  };

  return { chargeLevel, startCharging, reset, ChargeAnimator };
}

// ─── Main Viewer ────────────────────────────────────────────────────
export default function EnergyCrystalViewer() {
  const { contextLost, canvasKey, handleCreated } = useWebGLRecovery('EnergyCrystal');
  const { chargeLevel, startCharging, reset, ChargeAnimator } = useChargeAnimation();

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
      {/* Controls */}
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

          <ChargeAnimator />
          <EnergyCrystalPanel chargeLevel={chargeLevel} />

          {/* Test cube — to observe light cast from the crystal */}
          <mesh position={[4, 0, 0]}>
            <boxGeometry args={[1.5, 1.5, 1.5]} />
            <meshStandardMaterial color="#cccccc" roughness={0.6} />
          </mesh>

          <OrbitControls
            makeDefault
            enableDamping
            minPolarAngle={Math.PI / 4}
            maxPolarAngle={Math.PI / 1.5}
          />

          <PanoramaEnvironment />
        </Canvas>
      </Suspense>
    </div>
  );
}
