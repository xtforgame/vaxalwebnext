'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GlassMaterial } from './GlassMaterial';
import { ScreenGlow } from './ScreenGlow';
import type { CrystalTheme } from './crystal-themes';
import { createRoundedBoxGeometry, generateOutlinePoints } from './utils/rounded-box';

// ─── Easing ─────────────────────────────────────────────────────────
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

// ─── Crystal + Glow: single component, single useFrame ─────────────
export interface CrystalWithGlowProps {
  showShine: boolean;
  chargingRef: React.RefObject<boolean>;
  chargeStartRef: React.RefObject<number>;
  chargeLevelRef: React.RefObject<number>;
  chargeDuration: number;
  setChargeLevel: (v: number) => void;
  theme: CrystalTheme;
}

export function CrystalWithGlow({
  showShine,
  chargingRef,
  chargeStartRef,
  chargeLevelRef,
  chargeDuration,
  setChargeLevel,
  theme,
}: CrystalWithGlowProps) {
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
          color={theme.lightColor}
          intensity={0}
          distance={15}
          decay={2}
        />
        <mesh geometry={geometry}>
          <GlassMaterial
            color={theme.glassColor}
            opacity={theme.opacity}
            ior={theme.ior}
            chromaticAberration={theme.chromaticAberration}
            reflectivity={1.0}
            envMapIntensity={theme.envMapIntensity}
            fresnelPower={theme.fresnelPower}
            thickness={DEPTH}
            absorption={theme.absorption}
            chargeLevel={chargeLevelRef.current}
            energyColor={theme.energyColor}
          />
        </mesh>
      </group>

      {/* Fullscreen glow — projection done in shader, not JS */}
      <ScreenGlow
        targetRef={groupRef}
        outlinePoints={outlineLocal}
        chargeLevelRef={chargeLevelRef}
        enabled={showShine}
        colors={theme.glowColors}
      />
    </>
  );
}

export default CrystalWithGlow;
