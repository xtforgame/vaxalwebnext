'use client';

import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, useTexture } from '@react-three/drei';
import { Suspense, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { CrystalWithGlow } from '@/components/3d/CrystalWithGlow';
import { CRYSTAL_THEMES, CRYSTAL_THEME_MAP, DEFAULT_THEME_KEY } from '@/components/3d/crystal-themes';
import { useWebGLRecovery } from '@/hooks/useWebGLRecovery';

// ─── Environment ─────────���──────────────────────────────────────────
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
  accentColor,
  accentBorder,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  accentColor?: string;
  accentBorder?: string;
}) {
  const ac = accentColor || '#ffb347';
  const ab = accentBorder || 'rgba(255,154,22,0.5)';
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px',
        borderRadius: 6,
        border: `1px solid ${active ? ab : 'rgba(255,255,255,0.15)'}`,
        background: active ? `${ac}22` : 'rgba(255,255,255,0.05)',
        color: active ? ac : 'rgba(255,255,255,0.5)',
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
        border: `1px solid ${active ? ac : 'rgba(255,255,255,0.3)'}`,
        background: active ? ac : 'transparent',
        display: 'inline-block',
      }} />
      {label}
    </button>
  );
}

// ─── Color Swatch Button ────────────────────────────────────────────
function SwatchButton({
  color,
  active,
  onClick,
  label,
}: {
  color: string;
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      style={{
        width: 22,
        height: 22,
        borderRadius: 4,
        border: `2px solid ${active ? '#fff' : 'rgba(255,255,255,0.2)'}`,
        background: color,
        cursor: 'pointer',
        transition: 'all 0.2s',
        boxShadow: active ? `0 0 8px ${color}88` : 'none',
      }}
    />
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
  const [themeKey, setThemeKey] = useState(DEFAULT_THEME_KEY);
  const theme = CRYSTAL_THEME_MAP[themeKey];

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
            border: `1px solid ${theme.accentBorder}`,
            background: theme.accentBg,
            color: theme.accent,
            fontSize: 14,
            cursor: 'pointer',
            backdropFilter: 'blur(8px)',
            transition: 'all 0.3s',
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
        gap: 6,
        padding: '8px 10px',
        borderRadius: 8,
        border: '1px solid rgba(255,255,255,0.1)',
        background: 'rgba(0,0,0,0.4)',
        backdropFilter: 'blur(12px)',
      }}>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 2 }}>Effects</span>
        <ToggleButton
          label="Shine"
          active={showShine}
          onClick={() => setShowShine(v => !v)}
          accentColor={theme.accent}
          accentBorder={theme.accentBorder}
        />

        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 4, marginBottom: 2 }}>Theme</span>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {CRYSTAL_THEMES.map((t) => (
            <SwatchButton
              key={t.key}
              color={t.swatch}
              active={themeKey === t.key}
              onClick={() => setThemeKey(t.key)}
              label={t.label}
            />
          ))}
        </div>
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
            background: `linear-gradient(90deg, ${theme.gradientFrom}, ${theme.gradientTo})`,
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
            theme={theme}
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
