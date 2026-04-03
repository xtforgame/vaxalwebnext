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

  void main() {
    vUv = uv;

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
    // ENERGY CHARGING EFFECT
    // ============================================================

    // A. Internal radial glow — expands from center as charge increases
    float distFromCenter = length(vUv - 0.5) * 2.0; // 0 = center, 1 = edge
    float energyRadius = uChargeLevel * 1.4; // overshoots 1.0 so it fills edges
    float energyMask = smoothstep(energyRadius, max(energyRadius - 0.4, 0.0), distFromCenter);

    // B. Breathing pulse
    float pulse = sin(uTime * 3.0) * 0.15 + 0.85;
    float fastPulse = sin(uTime * 7.0) * 0.05;

    // C. Emissive from internal glow
    vec3 emissive = uEnergyColor * energyMask * uChargeLevel * pulse;

    // D. Edge glow intensifies with charge — energy bleeding through edges
    float chargedEdgeGlow = pow(1.0 - NdotV, 2.5) * uChargeLevel * 0.8;
    emissive += uEnergyColor * chargedEdgeGlow * (pulse + fastPulse);

    // E. At high charge, the whole body glows subtly
    float bodyGlow = uChargeLevel * uChargeLevel * 0.3; // quadratic ramp
    emissive += uEnergyColor * bodyGlow * pulse;

    glassColor += emissive;

    // ============================================================

    // Alpha — more opaque when charged (energy fills the volume)
    float absorptionAlpha = 1.0 - (absorption.r + absorption.g + absorption.b) / 3.0;
    float baseAlpha = mix(uOpacity, 0.8, absorptionAlpha * 0.5 + fresnelTerm * 0.3);
    float chargeAlpha = uChargeLevel * 0.3 * energyMask;
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

  const envMap = useMemo(() => {
    return scene.environment as THREE.CubeTexture | null;
  }, [scene.environment]);

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
      uHasEnvMap={envMap ? 1 : 0}
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
