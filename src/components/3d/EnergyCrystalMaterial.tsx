'use client';

import { shaderMaterial } from '@react-three/drei';
import { extend, useFrame, useThree } from '@react-three/fiber';
import { useRef, useMemo } from 'react';
import * as THREE from 'three';

const vertexShader = /* glsl */ `
  varying vec3 vWorldPosition;
  varying vec3 vWorldNormal;
  varying vec3 vViewDirection;
  varying vec2 vUv;
  varying vec3 vLocalPosition;

  void main() {
    vUv = uv;
    vLocalPosition = position; // object-space position for volumetric sampling

    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;

    vWorldNormal = normalize(mat3(modelMatrix) * normal);

    vViewDirection = normalize(cameraPosition - worldPosition.xyz);

    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const fragmentShader = /* glsl */ `
  // --- Base glass uniforms ---
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uIor;
  uniform float uFresnelPower;
  uniform float uReflectivity;
  uniform float uChromaticAberration;
  uniform samplerCube uEnvMap;
  uniform float uEnvMapIntensity;
  uniform float uRoughness;
  uniform float uThickness;
  uniform float uAbsorption;
  uniform float uTime;
  uniform float uHasEnvMap;

  // --- Energy charging uniforms ---
  uniform float uChargeLevel;     // 0.0 → 1.0
  uniform vec3 uEnergyColor;      // warm amber: vec3(1.0, 0.6, 0.1)

  varying vec3 vWorldPosition;
  varying vec3 vWorldNormal;
  varying vec3 vViewDirection;
  varying vec2 vUv;
  varying vec3 vLocalPosition;

  #define PI 3.14159265359
  #ifndef saturate
    #define saturate(x) clamp(x, 0.0, 1.0)
  #endif

  float fresnel(float cosTheta, float f0) {
    return f0 + (1.0 - f0) * pow(1.0 - cosTheta, 5.0);
  }

  float iorToF0(float ior) {
    float r = (ior - 1.0) / (ior + 1.0);
    return r * r;
  }

  float distributionGGX(vec3 N, vec3 H, float roughness) {
    float a = roughness * roughness;
    float a2 = a * a;
    float NdotH = max(dot(N, H), 0.0);
    float NdotH2 = NdotH * NdotH;

    float num = a2;
    float denom = (NdotH2 * (a2 - 1.0) + 1.0);
    denom = PI * denom * denom;

    return num / denom;
  }

  vec3 beerLambertAbsorption(vec3 baseColor, float distance, float absorption) {
    vec3 absorptionCoeff = -log(max(baseColor, 0.001)) * absorption;
    return exp(-absorptionCoeff * distance);
  }

  vec3 sampleCubeMapSafe(vec3 dir) {
    if (uHasEnvMap < 0.5) return vec3(0.05);
    return textureCube(uEnvMap, dir).rgb;
  }

  // ── Box-folding fractal density (inspired by crystal2's approach) ──
  // Avoids sphere-inversion singularity at origin; produces vein-like patterns
  // that spread naturally across any coordinate range
  float fractalDensity(vec2 p, float time) {
    vec2 z = p;
    float density = 0.0;
    for (int i = 0; i < 4; i++) {
      // Box fold: reflect into [-1,1] then invert
      z = abs(mod(z, 4.0) - 2.0);
      // Scale + rotate to build complexity
      z = z * 1.8 - vec2(1.2, 0.9);
      // Slow drift
      z += vec2(sin(time * 0.12 + float(i)), cos(time * 0.09 + float(i) * 1.3)) * 0.3;
      density += exp(-1.5 * length(z));
    }
    return density / 4.0;
  }

  // ── Multi-layer parallax sampling for thin slab ──
  // Instead of ray marching (useless for 0.2-thick panel),
  // sample fractal at multiple XY layers with view-dependent offset
  float sampleCrystalEnergy(vec3 localPos, vec3 V, vec3 N, float time, float chargeLevel) {
    // Normalize position to panel bounds: x ∈ [-2.1, 2.1], y ∈ [-2.8, 2.8]
    vec2 panelUV = localPos.xy / vec2(2.1, 2.8); // → [-1, 1]

    // View-dependent parallax offset (gives depth illusion when rotating)
    vec3 viewLocal = normalize(V);
    vec2 parallax = viewLocal.xy / max(abs(viewLocal.z), 0.3) * 0.15;

    // Box-shaped distance to edge (0 = center, 1 = edge)
    vec2 edgeDist = abs(panelUV);
    float boxDist = max(edgeDist.x, edgeDist.y);

    // Energy expansion mask — rectangular, grows from center
    float energyRadius = chargeLevel * 1.3;
    float expansionMask = smoothstep(energyRadius, max(energyRadius - 0.4, 0.0), boxDist);

    // Sample 4 layers at different "depths" with parallax shift
    float accDensity = 0.0;
    for (int i = 0; i < 4; i++) {
      float depth = float(i) / 3.0; // 0.0 → 1.0
      vec2 offset = parallax * depth;
      vec2 sampleUV = panelUV + offset;

      // Different scale per layer → different vein sizes
      float scale = 1.5 + float(i) * 0.8;
      float d = fractalDensity(sampleUV * scale, time + float(i) * 2.0);

      // Deeper layers slightly fainter
      float layerWeight = 1.0 - depth * 0.3;
      accDensity += d * layerWeight;
    }
    accDensity /= 4.0;

    return accDensity * expansionMask;
  }

  vec3 sampleEnvMapChromatic(vec3 direction, float ior, float aberration) {
    vec3 color;
    vec3 refractR = refract(-vViewDirection, vWorldNormal, 1.0 / (ior - aberration * 0.02));
    color.r = sampleCubeMapSafe(refractR).r;
    vec3 refractG = refract(-vViewDirection, vWorldNormal, 1.0 / ior);
    color.g = sampleCubeMapSafe(refractG).g;
    vec3 refractB = refract(-vViewDirection, vWorldNormal, 1.0 / (ior + aberration * 0.02));
    color.b = sampleCubeMapSafe(refractB).b;
    return color;
  }

  void main() {
    vec3 N = normalize(vWorldNormal);
    vec3 V = normalize(vViewDirection);
    float NdotV = max(dot(N, V), 0.001);

    // --- Beer-Lambert with dynamic absorption (decreases when charging) ---
    float dynamicAbsorption = mix(uAbsorption, uAbsorption * 0.15, uChargeLevel);
    float pathLength = uThickness / NdotV;
    pathLength = min(pathLength, uThickness * 10.0);

    // Fresnel
    float f0 = iorToF0(uIor);
    float fresnelTerm = fresnel(NdotV, f0);
    fresnelTerm = pow(fresnelTerm, uFresnelPower);

    // Reflection
    vec3 reflectDir = reflect(-V, N);
    vec3 reflectedColor = sampleCubeMapSafe(reflectDir);

    // Refraction with chromatic aberration
    vec3 refractedColor;
    if (uChromaticAberration > 0.0) {
      refractedColor = sampleEnvMapChromatic(N, uIor, uChromaticAberration);
    } else {
      vec3 refractDir = refract(-V, N, 1.0 / uIor);
      refractedColor = sampleCubeMapSafe(refractDir);
    }

    // Apply absorption
    vec3 absorption = beerLambertAbsorption(uColor, pathLength, dynamicAbsorption);
    refractedColor *= absorption;

    vec3 reflectAbsorption = beerLambertAbsorption(uColor, pathLength * 0.3, dynamicAbsorption);
    reflectedColor *= mix(vec3(1.0), reflectAbsorption, 0.5);

    // Mix refraction and reflection
    vec3 glassColor = mix(refractedColor, reflectedColor, fresnelTerm * uReflectivity);

    // Specular (GGX)
    vec3 L = reflectDir;
    vec3 H = normalize(V + L);
    float specular = distributionGGX(N, H, max(uRoughness, 0.01)) * fresnelTerm;
    glassColor += vec3(1.0) * specular * 0.5;

    // Base edge highlight
    float edgeGlow = pow(1.0 - NdotV, 4.0) * 0.15;
    glassColor += uColor * edgeGlow;

    glassColor *= uEnvMapIntensity;

    // ============================================================
    // ENERGY CHARGING EFFECT — Multi-layer Fractal Glow
    // ============================================================

    // A. Breathing pulse
    float pulse = sin(uTime * 3.0) * 0.12 + 0.88;
    float fastPulse = sin(uTime * 7.0) * 0.04;

    // B. Multi-layer fractal sampling — veins spread across panel shape
    float volumetricDensity = sampleCrystalEnergy(
      vLocalPosition, V, N, uTime, uChargeLevel
    );

    // C. Emissive from fractal density — structured internal glow
    vec3 emissive = uEnergyColor * volumetricDensity * uChargeLevel * pulse * 2.0;

    // D. Edge glow — energy bleeding through thin edges
    float chargedEdgeGlow = pow(1.0 - NdotV, 2.5) * uChargeLevel * 0.6;
    emissive += uEnergyColor * chargedEdgeGlow * (pulse + fastPulse);

    // E. Fake transmission — thin viewing angles glow brighter
    float transmission = exp(-pathLength * dynamicAbsorption * 0.5);
    emissive *= mix(0.5, 1.2, transmission);

    // F. Subtle overall body glow at high charge
    float bodyGlow = uChargeLevel * uChargeLevel * 0.1;
    emissive += uEnergyColor * bodyGlow * pulse;

    glassColor += emissive;

    // ============================================================

    // Alpha — more opaque when charged (energy fills the volume)
    float absorptionAlpha = 1.0 - (absorption.r + absorption.g + absorption.b) / 3.0;
    float baseAlpha = mix(uOpacity, 0.8, absorptionAlpha * 0.5 + fresnelTerm * 0.3);
    float chargeAlpha = uChargeLevel * 0.3 * saturate(volumetricDensity);
    float alpha = min(baseAlpha + chargeAlpha, 0.95);

    gl_FragColor = vec4(glassColor, alpha);
  }
`;

const EnergyCrystalShaderMaterial = shaderMaterial(
  {
    uColor: new THREE.Color('#ffffff'),
    uOpacity: 0.15,
    uIor: 1.45,
    uFresnelPower: 1.0,
    uReflectivity: 1.0,
    uChromaticAberration: 0.5,
    uEnvMap: null,
    uHasEnvMap: 0,
    uEnvMapIntensity: 1.0,
    uRoughness: 0.0,
    uThickness: 0.1,
    uAbsorption: 2.0,
    uTime: 0,
    // Energy uniforms
    uChargeLevel: 0,
    uEnergyColor: new THREE.Color(1.0, 0.6, 0.1),
  },
  vertexShader,
  fragmentShader
);

extend({ EnergyCrystalShaderMaterial });

interface EnergyCrystalMaterialProps {
  color?: string;
  opacity?: number;
  ior?: number;
  fresnelPower?: number;
  reflectivity?: number;
  chromaticAberration?: number;
  envMapIntensity?: number;
  roughness?: number;
  thickness?: number;
  absorption?: number;
  chargeLevel?: number;
  energyColor?: string;
}

export function EnergyCrystalMaterial({
  color = '#ffffff',
  opacity = 0.15,
  ior = 1.45,
  fresnelPower = 1.0,
  reflectivity = 1.0,
  chromaticAberration = 0.5,
  envMapIntensity = 1.0,
  roughness = 0.0,
  thickness = 0.1,
  absorption = 2.0,
  chargeLevel = 0,
  energyColor = '#ff9a16',
}: EnergyCrystalMaterialProps) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const { scene } = useThree();

  const dummyCubeTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 1, 1);
    const faces = Array.from({ length: 6 }, () => canvas);
    const cube = new THREE.CubeTexture(faces);
    cube.needsUpdate = true;
    return cube;
  }, []);

  const envMap = useMemo(() => {
    const env = scene.environment;
    if (env && (env as THREE.CubeTexture).isCubeTexture) {
      return env as THREE.CubeTexture;
    }
    return dummyCubeTexture;
  }, [scene.environment, dummyCubeTexture]);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
      materialRef.current.uniforms.uChargeLevel.value = chargeLevel;
    }
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Material = 'energyCrystalShaderMaterial' as any;

  return (
    <Material
      ref={materialRef}
      key={EnergyCrystalShaderMaterial.key}
      uColor={new THREE.Color(color)}
      uOpacity={opacity}
      uIor={ior}
      uFresnelPower={fresnelPower}
      uReflectivity={reflectivity}
      uChromaticAberration={chromaticAberration}
      uEnvMap={envMap}
      uHasEnvMap={envMap !== dummyCubeTexture ? 1 : 0}
      uEnvMapIntensity={envMapIntensity}
      uRoughness={roughness}
      uThickness={thickness}
      uAbsorption={absorption}
      uChargeLevel={chargeLevel}
      uEnergyColor={new THREE.Color(energyColor)}
      transparent={true}
      depthWrite={false}
      side={THREE.DoubleSide}
    />
  );
}

export default EnergyCrystalMaterial;
