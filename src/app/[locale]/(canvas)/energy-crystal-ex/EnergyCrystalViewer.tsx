'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, useTexture } from '@react-three/drei';
import { Suspense, useRef, useMemo, useState, useCallback, useEffect } from 'react';
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
// Sample N points along the rounded-rect perimeter at equal arc-length
const OUTLINE_N = 48;

function generateOutlinePoints(
  width: number, height: number, radius: number
): THREE.Vector3[] {
  const hw = width / 2;
  const hh = height / 2;
  const r = Math.min(radius, Math.min(width, height) / 2);
  const wr = hw - r; // inner half-width
  const hr = hh - r; // inner half-height

  const arcLen = r * Math.PI / 2;

  // Define perimeter segments in order (CCW starting bottom-left)
  const segments: { length: number; sample: (t: number) => [number, number] }[] = [
    // Bottom edge: (-wr, -hh) → (wr, -hh)
    { length: 2 * wr, sample: (t) => [-wr + t * 2 * wr, -hh] },
    // Bottom-right corner arc: center (wr, -hr)
    { length: arcLen, sample: (t) => [
      wr + r * Math.cos(-Math.PI / 2 + t * Math.PI / 2),
      -hr + r * Math.sin(-Math.PI / 2 + t * Math.PI / 2),
    ]},
    // Right edge: (hw, -hr) → (hw, hr)
    { length: 2 * hr, sample: (t) => [hw, -hr + t * 2 * hr] },
    // Top-right corner arc: center (wr, hr)
    { length: arcLen, sample: (t) => [
      wr + r * Math.cos(t * Math.PI / 2),
      hr + r * Math.sin(t * Math.PI / 2),
    ]},
    // Top edge: (wr, hh) → (-wr, hh)
    { length: 2 * wr, sample: (t) => [wr - t * 2 * wr, hh] },
    // Top-left corner arc: center (-wr, hr)
    { length: arcLen, sample: (t) => [
      -wr + r * Math.cos(Math.PI / 2 + t * Math.PI / 2),
      hr + r * Math.sin(Math.PI / 2 + t * Math.PI / 2),
    ]},
    // Left edge: (-hw, hr) → (-hw, -hr)
    { length: 2 * hr, sample: (t) => [-hw, hr - t * 2 * hr] },
    // Bottom-left corner arc: center (-wr, -hr)
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

// ─── Screen-space crystal tracking data ─────────────────────────────
interface CrystalScreenData {
  // Center in aspect-corrected space (centered at screen 0.5)
  centerX: number;
  centerY: number;
  avgRadius: number;
  // Outline points in aspect-corrected space, flat [x0,y0,x1,y1,...]
  outline: Float32Array;
}

// ─── WebGL Shine Overlay ────────────────────────────────────────────
const SHINE_VERTEX = `#version 300 es
in vec2 aPosition;
out vec2 vUv;
void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

const SHINE_FRAGMENT = `#version 300 es
precision highp float;

uniform float uTime;
uniform float uChargeLevel;
uniform vec2 uResolution;
uniform vec2 uCenter;       // crystal center in aspect-corrected space
uniform float uAvgRadius;   // average projected radius for scaling
#define OUTLINE_N ${OUTLINE_N}
uniform vec2 uOutline[OUTLINE_N];

in vec2 vUv;
out vec4 fragColor;

// ─── Simplex Noise ──────────────────────────────────────────────────
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

// ─── Happy Star ─────────────────────────────────────────────────────
float happy_star(vec2 uv, float anim) {
  uv = abs(uv);
  vec2 pos = min(uv.xy / uv.yx, anim);
  float p = (2.0 - pos.x - pos.y);
  return (2.0 + p * (p * p - 1.5)) / (uv.x + uv.y);
}

// ─── Polygon signed distance field ──────────────────────────────────
// Returns negative inside, positive outside
float polygonSDF(vec2 p) {
  float d = 1e10;
  float s = 1.0;
  int j = OUTLINE_N - 1;
  for (int i = 0; i < OUTLINE_N; i++) {
    vec2 vi = uOutline[i];
    vec2 vj = uOutline[j];
    vec2 e = vj - vi;
    vec2 w = p - vi;
    vec2 b = w - e * clamp(dot(w, e) / dot(e, e), 0.0, 1.0);
    d = min(d, dot(b, b));
    bvec3 cond = bvec3(p.y >= vi.y, p.y < vj.y, e.x * w.y > e.y * w.x);
    if (all(cond) || all(not(cond))) s *= -1.0;
    j = i;
  }
  return s * sqrt(d);
}

void main() {
  // Aspect-corrected space centered at screen center
  float aspect = uResolution.x / uResolution.y;
  vec2 pos = (vUv - 0.5) * vec2(aspect, 1.0);

  // Relative to crystal center (for angular coordinate / noise)
  vec2 uv = pos - uCenter;

  // Signed distance to the crystal's projected outline
  float sdf = polygonSDF(pos);

  // Map SDF → normalized distance l
  // sdf=0 at crystal edge → l≈0.3 (where the original ring starts)
  // Scale by avgRadius so glow extent is proportional to crystal size
  float l = sdf / (uAvgRadius * 2.5) + 0.3;
  l = max(l, 0.0);

  // Angular coordinate (relative to crystal center)
  float a = sin(atan(uv.y, uv.x));
  float am = abs(a - 0.5) / 4.0;

  // ─── Dual distance masks (Type 1-1) ──────────────────────────────
  float m1 = clamp(0.1 / smoothstep(0.0, 1.75, l), 0.0, 1.0);
  float m2 = clamp(0.1 / smoothstep(0.42, 0.0, l), 0.0, 1.0);

  // ─── Three-layer simplex noise ────────────────────────────────────
  float s1 = simplex_noise(vec3(uv * 2.0, 1.0 + uTime * 0.525))
             * max(1.0 - l * 1.75, 0.0) + 0.9;
  float s2 = simplex_noise(vec3(uv * 1.0, 15.0 + uTime * 0.525))
             * max(l * 1.0, 0.025) + 1.25;
  float s3 = simplex_noise(vec3(vec2(am, am * 100.0 + uTime * 3.0) * 0.15, 30.0 + uTime * 0.525))
             * max(l * 1.0, 0.25) + 1.5;
  s3 *= smoothstep(0.0, 0.3345, l);

  // Inner ring cutoff / outer ring fade
  float sh = smoothstep(0.15, 0.35, l);
  float sh2 = smoothstep(1.2, 0.35, l);

  // ─── Combine ─────────────────────────────────────────────────────
  float m = m1 * m1 * m2 * (s1 * s2 * s3) * (1.0 - l) * sh * sh2;
  m = max(m, 0.0);

  float chargeIntensity = smoothstep(0.3, 0.8, uChargeLevel);
  m *= chargeIntensity * 1.5;

  // ─── Happy Star cross-flare ───────────────────────────────────────
  float starAnim = sin(uTime * 8.0) * 0.08 + 1.0;
  float star = happy_star(uv * 3.5, starAnim);
  star = clamp(star * 0.06 * chargeIntensity, 0.0, 0.4);

  // ─── Warm amber coloring ─────────────────────────────────────────
  vec3 warmColor = mix(
    vec3(1.0, 0.65, 0.15),
    vec3(1.0, 0.85, 0.45),
    clamp(m * 2.0, 0.0, 1.0)
  );

  vec3 starColor = vec3(1.0, 0.8, 0.5);
  vec3 col = warmColor * m + starColor * star;

  // Soft vignette fade at screen edges
  float vignette = 1.0 - smoothstep(0.4, 0.85, length(vUv - 0.5) * 1.5);
  col *= vignette;

  fragColor = vec4(col, 1.0);
}`;

function ShineOverlay({
  chargeLevel,
  active,
  screenDataRef,
}: {
  chargeLevel: number;
  active: boolean;
  screenDataRef: React.RefObject<CrystalScreenData>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGL2RenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const frameRef = useRef(0);
  const uniformsRef = useRef<Record<string, WebGLUniformLocation | null>>({});
  const chargeLevelRef = useRef(0);
  const activeRef = useRef(active);
  chargeLevelRef.current = chargeLevel;
  activeRef.current = active;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = Math.min(window.devicePixelRatio, 2);
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;

    const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: false });
    if (!gl) {
      console.warn('[ShineOverlay] WebGL2 not available');
      return;
    }
    glRef.current = gl;

    // Compile shaders
    const vs = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(vs, SHINE_VERTEX);
    gl.compileShader(vs);
    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
      console.error('[ShineOverlay] Vertex shader:', gl.getShaderInfoLog(vs));
      return;
    }

    const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(fs, SHINE_FRAGMENT);
    gl.compileShader(fs);
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
      console.error('[ShineOverlay] Fragment shader:', gl.getShaderInfoLog(fs));
      return;
    }

    const program = gl.createProgram()!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('[ShineOverlay] Link:', gl.getProgramInfoLog(program));
      return;
    }
    programRef.current = program;

    // Fullscreen quad
    const verts = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(program, 'aPosition');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    // Get uniform locations
    uniformsRef.current = {
      uTime: gl.getUniformLocation(program, 'uTime'),
      uChargeLevel: gl.getUniformLocation(program, 'uChargeLevel'),
      uResolution: gl.getUniformLocation(program, 'uResolution'),
      uCenter: gl.getUniformLocation(program, 'uCenter'),
      uAvgRadius: gl.getUniformLocation(program, 'uAvgRadius'),
      uOutline: gl.getUniformLocation(program, 'uOutline'),
    };

    gl.useProgram(program);

    // Enable blending for transparent overlay
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const startTime = performance.now() / 1000;

    const draw = () => {
      if (!glRef.current || !programRef.current) return;

      const w = canvas.width;
      const h = canvas.height;
      gl.viewport(0, 0, w, h);

      const effectiveCharge = activeRef.current ? chargeLevelRef.current : 0;
      const time = performance.now() / 1000 - startTime;

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(programRef.current);
      gl.uniform1f(uniformsRef.current.uTime!, time);
      gl.uniform1f(uniformsRef.current.uChargeLevel!, effectiveCharge);
      gl.uniform2f(uniformsRef.current.uResolution!, w, h);

      // Pass crystal's screen-space projection
      const sd = screenDataRef.current;
      gl.uniform2f(uniformsRef.current.uCenter!, sd.centerX, sd.centerY);
      gl.uniform1f(uniformsRef.current.uAvgRadius!, sd.avgRadius);
      gl.uniform2fv(uniformsRef.current.uOutline!, sd.outline);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      frameRef.current = requestAnimationFrame(draw);
    };

    frameRef.current = requestAnimationFrame(draw);

    const onResize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener('resize', onResize);
      if (gl && program) {
        gl.deleteProgram(program);
      }
      if (gl) {
        const ext = gl.getExtension('WEBGL_lose_context');
        if (ext) ext.loseContext();
      }
      glRef.current = null;
      programRef.current = null;
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 5,
        width: '100%',
        height: '100%',
        mixBlendMode: 'screen',
      }}
    />
  );
}

// ─── Energy Crystal Panel ───────────────────────────────────────────
function EnergyCrystalPanel({
  chargeLevel,
  screenDataRef,
}: {
  chargeLevel: number;
  screenDataRef: React.MutableRefObject<CrystalScreenData>;
}) {
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

  // Sample outline points along the rounded-rect perimeter (local XY, Z=0)
  const outlineLocal = useMemo(
    () => generateOutlinePoints(width, height, radius),
    []
  );

  // Reusable projection buffer
  const projBuf = useMemo(() => new Float32Array(OUTLINE_N * 2), []);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.rotation.x = Math.cos(t / 2.5) / 20;
    groupRef.current.rotation.y = Math.sin(t / 2) / 12;
    groupRef.current.position.y = Math.sin(t / 2) / 25;

    if (lightRef.current) {
      const pulse = Math.sin(t * 3) * 0.15 + 0.85;
      lightRef.current.intensity = chargeLevel * 3.0 * pulse;
    }

    // Project outline points to aspect-corrected screen space
    const camera = state.camera;
    const aspect = state.size.width / state.size.height;
    groupRef.current.updateMatrixWorld();

    const v = new THREE.Vector3();
    let sumX = 0, sumY = 0;

    for (let i = 0; i < outlineLocal.length; i++) {
      v.copy(outlineLocal[i])
        .applyMatrix4(groupRef.current.matrixWorld)
        .project(camera);
      // NDC → UV → aspect-corrected centered space
      const uvX = (v.x + 1) / 2;
      const uvY = (v.y + 1) / 2;
      const acX = (uvX - 0.5) * aspect;
      const acY = uvY - 0.5;
      projBuf[i * 2] = acX;
      projBuf[i * 2 + 1] = acY;
      sumX += acX;
      sumY += acY;
    }

    const cx = sumX / OUTLINE_N;
    const cy = sumY / OUTLINE_N;

    // Average radius = mean distance from center to outline
    let sumDist = 0;
    for (let i = 0; i < OUTLINE_N; i++) {
      const dx = projBuf[i * 2] - cx;
      const dy = projBuf[i * 2 + 1] - cy;
      sumDist += Math.sqrt(dx * dx + dy * dy);
    }

    screenDataRef.current = {
      centerX: cx,
      centerY: cy,
      avgRadius: sumDist / OUTLINE_N,
      outline: projBuf,
    };
  });

  return (
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
  const durationRef = useRef(4);

  const startCharging = useCallback(() => {
    chargingRef.current = true;
    startTimeRef.current = 0;
    setChargeLevel(0);
  }, []);

  const reset = useCallback(() => {
    chargingRef.current = false;
    setChargeLevel(0);
  }, []);

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

// ─── Main Viewer ─────��──────────────────────────────────────────────
export default function EnergyCrystalViewer() {
  const { contextLost, canvasKey, handleCreated } = useWebGLRecovery('EnergyCrystal');
  const { chargeLevel, startCharging, reset, ChargeAnimator } = useChargeAnimation();

  const [showShine, setShowShine] = useState(true);
  const crystalScreenRef = useRef<CrystalScreenData>({
    centerX: 0,
    centerY: 0,
    avgRadius: 0.15,
    outline: new Float32Array(OUTLINE_N * 2),
  });

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

      {/* WebGL Shine overlay */}
      <ShineOverlay chargeLevel={chargeLevel} active={showShine} screenDataRef={crystalScreenRef} />

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
          <EnergyCrystalPanel chargeLevel={chargeLevel} screenDataRef={crystalScreenRef} />

          {/* Test cube */}
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
