'use client';

import { Suspense, useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, extend } from '@react-three/fiber';
import { Text, shaderMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { useWebGLRecovery } from '@/hooks/useWebGLRecovery';

// ============ Constants ============

const OFFSCREEN_X = 15;
const FONT_SIZE = 2.0;
const LINE_GAP = 1.4;
const LETTER_SPACING = 0.12;
const TOP_TEXT = 'BEYOND';
const BOT_TEXT = 'LIMITS';

const FONT_URL = '/fonts/Inter-Bold.ttf';

// ============ Easing ============

/** Seconds the text spends in the slow center crawl.
 *  Adjust freely — entry/exit speed stays the same.
 *  e.g. 0.5 (brief flash), 1.5 (readable), 3.0 (long linger) */
const SLOW_ZONE = 4.0;

const FAST_DURATION = 0.4; // seconds per fast phase (entry or exit)
const FAST_POWER = 8;      // steepness of acceleration/deceleration
const CRAWL_RANGE = 0.02;  // fraction of total travel covered during crawl (smaller = slower crawl)

// Derived
const LOOP_DURATION = 4 * FAST_DURATION + SLOW_ZONE;
const _pA = 0.5 - CRAWL_RANGE / 2;
const _pB = 0.5 + CRAWL_RANGE / 2;
// Linear blend for C1 speed matching at phase boundaries
const _alpha = Math.min(0.5, CRAWL_RANGE * FAST_DURATION / (Math.max(0.001, SLOW_ZONE) * _pA));
const _beta = Math.min(0.5, CRAWL_RANGE * FAST_DURATION / (Math.max(0.001, SLOW_ZONE) * (1 - _pB)));

function fastSlowFast(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  const sec = c * LOOP_DURATION;

  if (sec < FAST_DURATION) {
    // Fast entry — power ease-out + linear blend for smooth handoff
    const p = sec / FAST_DURATION;
    const curve = 1 - Math.pow(1 - p, FAST_POWER);
    return _pA * ((1 - _alpha) * curve + _alpha * p);
  } else if (sec < FAST_DURATION + SLOW_ZONE) {
    // Slow center crawl — linear
    const p = (sec - FAST_DURATION) / SLOW_ZONE;
    return _pA + CRAWL_RANGE * p;
  } else {
    // Fast exit — power ease-in + linear blend for smooth handoff
    const p = (sec - FAST_DURATION - SLOW_ZONE) / FAST_DURATION;
    const curve = Math.pow(p, FAST_POWER);
    return _pB + (1 - _pB) * ((1 - _beta) * curve + _beta * p);
  }
}

// ============ Gradient Material ============

const GradientTextMaterial = shaderMaterial(
  {
    uColor1: new THREE.Color('#FFD700'),
    uColor2: new THREE.Color('#FFFFFF'),
    uOpacity: 1.0,
  },
  /* glsl vertex */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  /* glsl fragment */ `
    uniform vec3 uColor1;
    uniform vec3 uColor2;
    uniform float uOpacity;
    varying vec2 vUv;
    void main() {
      vec3 col = mix(uColor1, uColor2, vUv.x);
      // Boost brightness for HDR glow feel
      col *= 1.3;
      gl_FragColor = vec4(col, uOpacity);
    }
  `
);

extend({ GradientTextMaterial });

// Declare JSX type for the custom material
declare global {
  namespace JSX {
    interface IntrinsicElements {
      gradientTextMaterial: React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        uColor1?: THREE.Color;
        uColor2?: THREE.Color;
        uOpacity?: number;
        transparent?: boolean;
        toneMapped?: boolean;
        side?: THREE.Side;
      };
    }
  }
}

// ============ Text Effect (inner) ============

function TextEffect() {
  const topRef = useRef<THREE.Mesh>(null);
  const botRef = useRef<THREE.Mesh>(null);
  const topMatRef = useRef<THREE.ShaderMaterial>(null);
  const botMatRef = useRef<THREE.ShaderMaterial>(null);

  // Create materials — set uniforms via .uniforms.xxx.value (not constructor)
  const topMat = useMemo(() => {
    const m = new GradientTextMaterial();
    m.uniforms.uColor1.value = new THREE.Color('#FFD700');
    m.uniforms.uColor2.value = new THREE.Color('#FFF8E1');
    m.uniforms.uOpacity.value = 1.0;
    m.toneMapped = false;
    m.transparent = true;
    return m;
  }, []);
  const botMat = useMemo(() => {
    const m = new GradientTextMaterial();
    m.uniforms.uColor1.value = new THREE.Color('#00E5FF');
    m.uniforms.uColor2.value = new THREE.Color('#AA00FF');
    m.uniforms.uOpacity.value = 1.0;
    m.toneMapped = false;
    m.transparent = true;
    return m;
  }, []);

  // Store refs + cleanup
  useEffect(() => {
    topMatRef.current = topMat;
    botMatRef.current = botMat;
    return () => {
      topMat.dispose();
      botMat.dispose();
    };
  }, [topMat, botMat]);

  useFrame((state) => {
    const elapsed = state.clock.elapsedTime;
    const t = (elapsed % LOOP_DURATION) / LOOP_DURATION;
    const e = fastSlowFast(t);

    // Top line: left → right
    if (topRef.current) {
      topRef.current.position.x = -OFFSCREEN_X + e * 2 * OFFSCREEN_X;
    }
    // Bottom line: right → left
    if (botRef.current) {
      botRef.current.position.x = OFFSCREEN_X - e * 2 * OFFSCREEN_X;
    }
  });

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.2} />
      <pointLight position={[0, 0, 8]} intensity={2} color="#ffffff" />
      <pointLight position={[5, 3, 3]} intensity={0.8} color="#FFD700" />
      <pointLight position={[-5, -3, 3]} intensity={0.8} color="#00E5FF" />

      {/* Top line — left to right */}
      <Text
        ref={topRef}
        position={[-OFFSCREEN_X, LINE_GAP / 2, 0]}
        fontSize={FONT_SIZE}
        font={FONT_URL}
        anchorX="center"
        anchorY="middle"
        letterSpacing={LETTER_SPACING}
        material={topMat}
      >
        {TOP_TEXT}
      </Text>

      {/* Bottom line — right to left */}
      <Text
        ref={botRef}
        position={[OFFSCREEN_X, -LINE_GAP / 2, 0]}
        fontSize={FONT_SIZE}
        font={FONT_URL}
        anchorX="center"
        anchorY="middle"
        letterSpacing={LETTER_SPACING}
        material={botMat}
      >
        {BOT_TEXT}
      </Text>
    </>
  );
}

// ============ Exported Component ============

export default function TextSlowCutInScene() {
  const { contextLost, canvasKey, handleCreated } =
    useWebGLRecovery('TextSlowCutIn');

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
        <div className="w-12 h-12 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mb-4" />
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
            <div className="w-12 h-12 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="font-medium">Loading Scene...</p>
          </div>
        }
      >
        <Canvas
          key={canvasKey}
          style={{ height: '100%', width: '100%', display: 'block' }}
          camera={{ position: [0, 0, 10], fov: 50 }}
          gl={{ antialias: true, alpha: false }}
          frameloop="always"
          dpr={[1, 2]}
          onCreated={handleCreated}
        >
          <TextEffect />
        </Canvas>
      </Suspense>
    </div>
  );
}
