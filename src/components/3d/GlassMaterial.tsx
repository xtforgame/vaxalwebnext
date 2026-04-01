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

  varying vec3 vWorldPosition;
  varying vec3 vWorldNormal;
  varying vec3 vViewDirection;
  varying vec2 vUv;

  #define PI 3.14159265359
  #ifndef saturate
    #define saturate(x) clamp(x, 0.0, 1.0)
  #endif

  // Fresnel-Schlick approximation
  float fresnel(float cosTheta, float f0) {
    return f0 + (1.0 - f0) * pow(1.0 - cosTheta, 5.0);
  }

  // IOR to F0
  float iorToF0(float ior) {
    float r = (ior - 1.0) / (ior + 1.0);
    return r * r;
  }

  // GGX Distribution
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

  // Beer-Lambert absorption
  // Light traveling through colored glass gets absorbed based on distance
  vec3 beerLambertAbsorption(vec3 baseColor, float distance, float absorption) {
    // Convert color to absorption coefficient (darker color = more absorption)
    vec3 absorptionCoeff = -log(max(baseColor, 0.001)) * absorption;
    // Apply Beer-Lambert law: transmitted = exp(-coefficient * distance)
    return exp(-absorptionCoeff * distance);
  }

  // Sample environment with chromatic aberration
  vec3 sampleEnvMapChromatic(vec3 direction, float ior, float aberration) {
    vec3 color;

    // Red channel - lower IOR
    vec3 refractR = refract(-vViewDirection, vWorldNormal, 1.0 / (ior - aberration * 0.02));
    color.r = textureCube(uEnvMap, refractR).r;

    // Green channel - base IOR
    vec3 refractG = refract(-vViewDirection, vWorldNormal, 1.0 / ior);
    color.g = textureCube(uEnvMap, refractG).g;

    // Blue channel - higher IOR
    vec3 refractB = refract(-vViewDirection, vWorldNormal, 1.0 / (ior + aberration * 0.02));
    color.b = textureCube(uEnvMap, refractB).b;

    return color;
  }

  void main() {
    vec3 N = normalize(vWorldNormal);
    vec3 V = normalize(vViewDirection);

    float NdotV = max(dot(N, V), 0.001);

    // Calculate path length through glass (Beer-Lambert)
    // At grazing angles, light travels longer path through the material
    float pathLength = uThickness / NdotV;
    pathLength = min(pathLength, uThickness * 10.0); // Clamp to prevent infinity

    // Fresnel
    float f0 = iorToF0(uIor);
    float fresnelTerm = fresnel(NdotV, f0);
    fresnelTerm = pow(fresnelTerm, uFresnelPower);

    // Reflection
    vec3 reflectDir = reflect(-V, N);
    vec3 reflectedColor = textureCube(uEnvMap, reflectDir).rgb;

    // Refraction with chromatic aberration
    vec3 refractedColor;
    if (uChromaticAberration > 0.0) {
      refractedColor = sampleEnvMapChromatic(N, uIor, uChromaticAberration);
    } else {
      vec3 refractDir = refract(-V, N, 1.0 / uIor);
      refractedColor = textureCube(uEnvMap, refractDir).rgb;
    }

    // Apply Beer-Lambert absorption to refracted light
    // This creates the colored glass effect where edges are more saturated
    vec3 absorption = beerLambertAbsorption(uColor, pathLength, uAbsorption);
    refractedColor *= absorption;

    // Also tint reflected light slightly at edges
    vec3 reflectAbsorption = beerLambertAbsorption(uColor, pathLength * 0.3, uAbsorption);
    reflectedColor *= mix(vec3(1.0), reflectAbsorption, 0.5);

    // Mix refraction and reflection based on Fresnel
    vec3 glassColor = mix(refractedColor, reflectedColor, fresnelTerm * uReflectivity);

    // Add specular highlight (GGX)
    vec3 L = reflectDir;
    vec3 H = normalize(V + L);
    float specular = distributionGGX(N, H, max(uRoughness, 0.01)) * fresnelTerm;
    glassColor += vec3(1.0) * specular * 0.5;

    // Subtle edge highlight
    float edgeGlow = pow(1.0 - NdotV, 4.0) * 0.15;
    glassColor += uColor * edgeGlow;

    // Apply environment intensity
    glassColor *= uEnvMapIntensity;

    // Final color with opacity for layering
    // Edges should be more opaque due to absorption
    float absorptionAlpha = 1.0 - (absorption.r + absorption.g + absorption.b) / 3.0;
    float alpha = mix(uOpacity, 0.8, absorptionAlpha * 0.5 + fresnelTerm * 0.3);

    gl_FragColor = vec4(glassColor, alpha);
  }
`;

// Create the shader material
const CrystalGlassMaterial = shaderMaterial(
  {
    uColor: new THREE.Color('#ffffff'),
    uOpacity: 0.15,
    uIor: 1.45,
    uFresnelPower: 1.0,
    uReflectivity: 1.0,
    uChromaticAberration: 0.5,
    uEnvMap: null,
    uEnvMapIntensity: 1.0,
    uRoughness: 0.0,
    uThickness: 0.1,
    uAbsorption: 2.0,
    uTime: 0,
  },
  vertexShader,
  fragmentShader
);

// Extend Three.js
extend({ CrystalGlassMaterial });

interface GlassMaterialProps {
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
}

export function GlassMaterial({
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
}: GlassMaterialProps) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const { scene } = useThree();

  const envMap = useMemo(() => {
    return scene.environment as THREE.CubeTexture | null;
  }, [scene.environment]);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    }
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Material = 'crystalGlassMaterial' as any;

  return (
    <Material
      ref={materialRef}
      key={CrystalGlassMaterial.key}
      uColor={new THREE.Color(color)}
      uOpacity={opacity}
      uIor={ior}
      uFresnelPower={fresnelPower}
      uReflectivity={reflectivity}
      uChromaticAberration={chromaticAberration}
      uEnvMap={envMap}
      uEnvMapIntensity={envMapIntensity}
      uRoughness={roughness}
      uThickness={thickness}
      uAbsorption={absorption}
      transparent={true}
      depthWrite={false}
      side={THREE.DoubleSide}
    />
  );
}

export default GlassMaterial;
