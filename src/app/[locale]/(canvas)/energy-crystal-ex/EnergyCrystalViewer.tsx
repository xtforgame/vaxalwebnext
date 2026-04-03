'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, useTexture } from '@react-three/drei';
import { Suspense, useRef, useMemo, useState, useCallback } from 'react';
import * as THREE from 'three';
import { EnergyCrystalMaterial } from '@/components/3d/EnergyCrystalMaterial';
import { useWebGLRecovery } from '@/hooks/useWebGLRecovery';

// ─── Easing ─────────────────────────────────────────────────────────
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

// ─── Rounded-box geometry ───────────────────────────────────────────
function createRoundedBoxGeometry(
  width: number,
  height: number,
  depth: number,
  radius: number,
  segments = 8
): THREE.BufferGeometry {
  const r = Math.min(radius, Math.min(width, height, depth) / 2);
  const shape = new THREE.Shape();
  const w = width / 2 - r;
  const h = height / 2 - r;

  shape.moveTo(-w, -height / 2);
  shape.lineTo(w, -height / 2);
  shape.quadraticCurveTo(width / 2, -height / 2, width / 2, -h);
  shape.lineTo(width / 2, h);
  shape.quadraticCurveTo(width / 2, height / 2, w, height / 2);
  shape.lineTo(-w, height / 2);
  shape.quadraticCurveTo(-width / 2, height / 2, -width / 2, h);
  shape.lineTo(-width / 2, -h);
  shape.quadraticCurveTo(-width / 2, -height / 2, -w, -height / 2);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: depth - r * 2,
    bevelEnabled: true,
    bevelThickness: r,
    bevelSize: r,
    bevelOffset: 0,
    bevelSegments: segments,
    curveSegments: segments,
  });
  geo.translate(0, 0, -(depth - r * 2) / 2);
  geo.computeVertexNormals();
  return geo;
}

// ─── Outline sampling ───────────────────────────────────────────────
const OUTLINE_N = 48;

function generateOutlinePoints(
  width: number, height: number, radius: number
): THREE.Vector3[] {
  const hw = width / 2;
  const hh = height / 2;
  const r = Math.min(radius, Math.min(width, height) / 2);
  const wr = hw - r;
  const hr = hh - r;

  const arcLen = r * Math.PI / 2;

  const segments: { length: number; sample: (t: number) => [number, number] }[] = [
    { length: 2 * wr, sample: (t) => [-wr + t * 2 * wr, -hh] },
    { length: arcLen, sample: (t) => [
      wr + r * Math.cos(-Math.PI / 2 + t * Math.PI / 2),
      -hr + r * Math.sin(-Math.PI / 2 + t * Math.PI / 2),
    ]},
    { length: 2 * hr, sample: (t) => [hw, -hr + t * 2 * hr] },
    { length: arcLen, sample: (t) => [
      wr + r * Math.cos(t * Math.PI / 2),
      hr + r * Math.sin(t * Math.PI / 2),
    ]},
    { length: 2 * wr, sample: (t) => [wr - t * 2 * wr, hh] },
    { length: arcLen, sample: (t) => [
      -wr + r * Math.cos(Math.PI / 2 + t * Math.PI / 2),
      hr + r * Math.sin(Math.PI / 2 + t * Math.PI / 2),
    ]},
    { length: 2 * hr, sample: (t) => [-hw, hr - t * 2 * hr] },
    { length: arcLen, sample: (t) => [
      -wr + r * Math.cos(Math.PI + t * Math.PI / 2),
      -hr + r * Math.sin(Math.PI + t * Math.PI / 2),
    ]},
  ];

  const totalLength = segments.reduce((s, seg) => s + seg.length, 0);
  const points: THREE.Vector3[] = [];

  for (let i = 0; i < OUTLINE_N; i++) {
    const targetDist = (i / OUTLINE_N) * totalLength;
    let accumulated = 0;
    for (const seg of segments) {
      if (accumulated + seg.length > targetDist) {
        const localT = (targetDist - accumulated) / seg.length;
        const [x, y] = seg.sample(localT);
        points.push(new THREE.Vector3(x, y, 0));
        break;
      }
      accumulated += seg.length;
    }
  }

  return points;
}

// ─── Glow shaders ───────────────────────────────────────────────────
// Vertex: fullscreen quad, bypasses camera
const GLOW_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

// Fragment: projects outline points ON THE GPU using render-time camera matrices.
// "viewMatrix" is a built-in uniform injected by Three.js at render time,
// so it always reflects the camera's final state (post-OrbitControls).
// This guarantees the glow and the crystal use the EXACT same camera.
const GLOW_FRAGMENT = /* glsl */ `
uniform float uTime;
uniform float uChargeLevel;
uniform float uAspect;
uniform mat4 uCrystalMatrix;   // crystal's matrixWorld
uniform mat4 uProjMatrix;      // camera.projectionMatrix (stable between frames)
// viewMatrix — built-in, set by Three.js at gl.render() time
uniform vec3 uOutlineLocal[${OUTLINE_N}]; // constant local-space outline points

varying vec2 vUv;

#define POLY_N ${OUTLINE_N}
#define MOD3 vec3(.1031,.11369,.13787)

vec3 hash33(vec3 p3) {
  p3 = fract(p3 * MOD3);
  p3 += dot(p3, p3.yxz + 19.19);
  return -1.0 + 2.0 * fract(vec3(
    (p3.x + p3.y) * p3.z,
    (p3.x + p3.z) * p3.y,
    (p3.y + p3.z) * p3.x
  ));
}

float simplex_noise(vec3 p) {
  const float K1 = 0.333333333;
  const float K2 = 0.166666667;
  vec3 i = floor(p + (p.x + p.y + p.z) * K1);
  vec3 d0 = p - (i - (i.x + i.y + i.z) * K2);
  vec3 e = step(vec3(0.0), d0 - d0.yzx);
  vec3 i1 = e * (1.0 - e.zxy);
  vec3 i2 = 1.0 - e.zxy * (1.0 - e);
  vec3 d1 = d0 - (i1 - K2);
  vec3 d2 = d0 - (i2 - 2.0 * K2);
  vec3 d3 = d0 - (1.0 - 3.0 * K2);
  vec4 h = max(0.6 - vec4(dot(d0,d0), dot(d1,d1), dot(d2,d2), dot(d3,d3)), 0.0);
  vec4 n = h * h * h * h * vec4(
    dot(d0, hash33(i)),
    dot(d1, hash33(i + i1)),
    dot(d2, hash33(i + i2)),
    dot(d3, hash33(i + 1.0))
  );
  return dot(vec4(31.316), n);
}

float happy_star(vec2 uv, float anim) {
  uv = abs(uv);
  vec2 pos = min(uv.xy / uv.yx, anim);
  float p = (2.0 - pos.x - pos.y);
  return (2.0 + p * (p * p - 1.5)) / (uv.x + uv.y);
}

void main() {
  vec2 pos = (vUv - 0.5) * vec2(uAspect, 1.0);

  // ── GPU-side projection ──────────────────────────────────────────
  // viewMatrix is the built-in set at render time → same camera state as crystal mesh
  mat4 mvp = uProjMatrix * viewMatrix * uCrystalMatrix;

  vec2 proj[POLY_N];
  vec2 center = vec2(0.0);
  for (int i = 0; i < POLY_N; i++) {
    vec4 clip = mvp * vec4(uOutlineLocal[i], 1.0);
    proj[i] = vec2(clip.x / clip.w * 0.5 * uAspect, clip.y / clip.w * 0.5);
    center += proj[i];
  }
  center /= float(POLY_N);

  float avgRadius = 0.0;
  for (int i = 0; i < POLY_N; i++) {
    avgRadius += length(proj[i] - center);
  }
  avgRadius /= float(POLY_N);

  // ── Polygon SDF using projected points ───────────────────────────
  float sdfDist = 1e10;
  float sdfSign = 1.0;
  int j = POLY_N - 1;
  for (int i = 0; i < POLY_N; i++) {
    vec2 vi = proj[i];
    vec2 vj = proj[j];
    vec2 e = vj - vi;
    vec2 w = pos - vi;
    vec2 b = w - e * clamp(dot(w, e) / dot(e, e), 0.0, 1.0);
    sdfDist = min(sdfDist, dot(b, b));
    bvec3 cond = bvec3(pos.y >= vi.y, pos.y < vj.y, e.x * w.y > e.y * w.x);
    if (all(cond) || all(not(cond))) sdfSign *= -1.0;
    j = i;
  }
  float sdf = sdfSign * sqrt(sdfDist);

  // ── Effect logic (unchanged) ─────────────────────────────────────
  vec2 uv = pos - center;

  float l = sdf / (avgRadius * 2.5) + 0.3;
  l = max(l, 0.0);

  float a = sin(atan(uv.y, uv.x));
  float am = abs(a - 0.5) / 4.0;

  float m1 = clamp(0.1 / smoothstep(0.0, 1.75, l), 0.0, 1.0);
  float m2 = clamp(0.1 / smoothstep(0.42, 0.0, l), 0.0, 1.0);

  float s1 = simplex_noise(vec3(uv * 2.0, 1.0 + uTime * 0.525))
             * max(1.0 - l * 1.75, 0.0) + 0.9;
  float s2 = simplex_noise(vec3(uv * 1.0, 15.0 + uTime * 0.525))
             * max(l * 1.0, 0.025) + 1.25;
  float s3 = simplex_noise(vec3(vec2(am, am * 100.0 + uTime * 3.0) * 0.15, 30.0 + uTime * 0.525))
             * max(l * 1.0, 0.25) + 1.5;
  s3 *= smoothstep(0.0, 0.3345, l);

  float sh = smoothstep(0.15, 0.35, l);
  float sh2 = smoothstep(1.2, 0.35, l);

  float m = m1 * m1 * m2 * (s1 * s2 * s3) * (1.0 - l) * sh * sh2;
  m = max(m, 0.0);

  float chargeIntensity = smoothstep(0.3, 0.8, uChargeLevel);
  m *= chargeIntensity * 1.5;

  float starAnim = sin(uTime * 8.0) * 0.08 + 1.0;
  float star = happy_star(uv / avgRadius * 0.6, starAnim);
  star = clamp(star * 0.06 * chargeIntensity, 0.0, 0.4);

  vec3 warmColor = mix(
    vec3(1.0, 0.65, 0.15),
    vec3(1.0, 0.85, 0.45),
    clamp(m * 2.0, 0.0, 1.0)
  );

  vec3 starColor = vec3(1.0, 0.8, 0.5);
  vec3 col = warmColor * m + starColor * star;

  float vignette = 1.0 - smoothstep(0.4, 0.85, length(vUv - 0.5) * 1.5);
  col *= vignette;

  gl_FragColor = vec4(col, 1.0);
}`;

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
  const glowMatRef = useRef<THREE.ShaderMaterial>(null);

  const geometry = useMemo(
    () => createRoundedBoxGeometry(WIDTH, HEIGHT, DEPTH, RADIUS, 6),
    []
  );

  // Local-space outline points (constant, never changes)
  const outlineLocal = useMemo(
    () => generateOutlinePoints(WIDTH, HEIGHT, RADIUS),
    []
  );

  const glowUniforms = useMemo(() => ({
    uTime: { value: 0 },
    uChargeLevel: { value: 0 },
    uAspect: { value: 1 },
    uCrystalMatrix: { value: new THREE.Matrix4() },
    uProjMatrix: { value: new THREE.Matrix4() },
    uOutlineLocal: { value: outlineLocal },
  }), [outlineLocal]);

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

    // ── Step 3: Update glow uniforms ──
    // Only uCrystalMatrix, uProjMatrix, uTime, uChargeLevel, uAspect
    // The actual outline projection happens IN THE SHADER using
    // the built-in viewMatrix (set at render time by Three.js).
    const mat = glowMatRef.current;
    if (mat) {
      mat.uniforms.uTime.value = t;
      mat.uniforms.uChargeLevel.value = showShine ? charge : 0;
      mat.uniforms.uAspect.value = state.size.width / state.size.height;
      mat.uniforms.uCrystalMatrix.value.copy(groupRef.current.matrixWorld);
      mat.uniforms.uProjMatrix.value.copy(state.camera.projectionMatrix);
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
          <EnergyCrystalMaterial
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
      <mesh frustumCulled={false} renderOrder={999}>
        <planeGeometry args={[2, 2]} />
        <shaderMaterial
          ref={glowMatRef}
          vertexShader={GLOW_VERTEX}
          fragmentShader={GLOW_FRAGMENT}
          uniforms={glowUniforms}
          transparent={true}
          depthTest={false}
          depthWrite={false}
          blending={THREE.CustomBlending}
          blendSrc={THREE.OneFactor}
          blendDst={THREE.OneMinusSrcColorFactor}
          blendEquation={THREE.AddEquation}
        />
      </mesh>
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
