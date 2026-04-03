'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CRYSTAL_THEME_MAP, type GlowColors } from './crystal-themes';

const OUTLINE_N = 48;

const GLOW_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

const GLOW_FRAGMENT = /* glsl */ `
uniform float uTime;
uniform float uChargeLevel;
uniform float uAspect;
uniform mat4 uCrystalMatrix;   // crystal's matrixWorld
uniform mat4 uProjMatrix;      // camera.projectionMatrix (stable between frames)
// viewMatrix — built-in, set by Three.js at gl.render() time
uniform vec3 uOutlineLocal[${OUTLINE_N}]; // constant local-space outline points
uniform vec3 uGlowColor;
uniform vec3 uHighlightColor;
uniform vec3 uStarColor;

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

  // ── Effect logic ─────────────────────────────────────────────────
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

  vec3 warmColor = mix(uGlowColor, uHighlightColor, clamp(m * 2.0, 0.0, 1.0));

  vec3 col = warmColor * m + uStarColor * star;

  float vignette = 1.0 - smoothstep(0.4, 0.85, length(vUv - 0.5) * 1.5);
  col *= vignette;

  gl_FragColor = vec4(col, 1.0);
}`;

interface ScreenGlowProps {
  targetRef: React.RefObject<THREE.Object3D | null>;
  outlinePoints: THREE.Vector3[];
  chargeLevelRef: React.RefObject<number>;
  enabled: boolean;
  colors?: GlowColors;
}

export function ScreenGlow({
  targetRef,
  outlinePoints,
  chargeLevelRef,
  enabled,
  colors = CRYSTAL_THEME_MAP.amber.glowColors,
}: ScreenGlowProps) {
  const glowMatRef = useRef<THREE.ShaderMaterial>(null);

  // Stable uniforms — colors updated in useFrame, not as useMemo deps
  const glowUniforms = useMemo(() => ({
    uTime: { value: 0 },
    uChargeLevel: { value: 0 },
    uAspect: { value: 1 },
    uCrystalMatrix: { value: new THREE.Matrix4() },
    uProjMatrix: { value: new THREE.Matrix4() },
    uOutlineLocal: { value: outlinePoints },
    uGlowColor: { value: new THREE.Vector3(...CRYSTAL_THEME_MAP.amber.glowColors.glow) },
    uHighlightColor: { value: new THREE.Vector3(...CRYSTAL_THEME_MAP.amber.glowColors.highlight) },
    uStarColor: { value: new THREE.Vector3(...CRYSTAL_THEME_MAP.amber.glowColors.star) },
  }), [outlinePoints]);

  useFrame((state) => {
    const mat = glowMatRef.current;
    if (!mat) return;

    mat.uniforms.uTime.value = state.clock.elapsedTime;
    mat.uniforms.uChargeLevel.value = enabled ? chargeLevelRef.current : 0;
    mat.uniforms.uAspect.value = state.size.width / state.size.height;
    mat.uniforms.uProjMatrix.value.copy(state.camera.projectionMatrix);

    // Update colors every frame (allows smooth theme switching)
    mat.uniforms.uGlowColor.value.set(...colors.glow);
    mat.uniforms.uHighlightColor.value.set(...colors.highlight);
    mat.uniforms.uStarColor.value.set(...colors.star);

    if (targetRef.current) {
      mat.uniforms.uCrystalMatrix.value.copy(targetRef.current.matrixWorld);
    }
  });

  return (
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
  );
}

export default ScreenGlow;
