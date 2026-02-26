'use client';

import { Suspense, useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { useWebGLRecovery } from '@/hooks/useWebGLRecovery';

// ============ GLSL Shader Code ============

const fullscreenVert = /* glsl */ `in vec3 position;
void main() {
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

const imageFrag = /* glsl */ `precision highp float;

uniform float iTime;
uniform vec2 iResolution;
uniform sampler2D iChannel0;
uniform sampler2D iChannel1;

const float strength = 0.3;
const float PI = 3.141592653589793;

float Linear_ease(in float begin, in float change, in float duration, in float time) {
  return change * time / duration + begin;
}

float Exponential_easeInOut(in float begin, in float change, in float duration, in float time) {
  if (time == 0.0)
    return begin;
  else if (time == duration)
    return begin + change;
  time = time / (duration / 2.0);
  if (time < 1.0)
    return change / 2.0 * pow(2.0, 10.0 * (time - 1.0)) + begin;
  return change / 2.0 * (-pow(2.0, -10.0 * (time - 1.0)) + 2.0) + begin;
}

float Sinusoidal_easeInOut(in float begin, in float change, in float duration, in float time) {
  return -change / 2.0 * (cos(PI * time / duration) - 1.0) + begin;
}

float random(in vec3 scale, in float seed) {
  return fract(sin(dot(gl_FragCoord.xyz + seed, scale)) * 43758.5453 + seed);
}

vec3 crossFade(in vec2 uv, in float dissolve) {
  return mix(texture(iChannel0, uv).rgb, texture(iChannel1, uv).rgb, dissolve);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 texCoord = fragCoord.xy / iResolution.xy;
  float progress = sin(iTime * 1.0) * 0.5 + 0.5;

  vec2 center = vec2(Linear_ease(0.5, 0.0, 1.0, progress), 0.5);
  float dissolve = Exponential_easeInOut(0.0, 1.0, 1.0, progress);
  float str = Sinusoidal_easeInOut(0.0, strength, 0.5, progress);

  vec3 color = vec3(0.0);
  float total = 0.0;
  vec2 toCenter = center - texCoord;

  float offset = random(vec3(12.9898, 78.233, 151.7182), 0.0) * 0.5;

  for (float t = 0.0; t <= 20.0; t++) {
    float percent = (t + offset) / 20.0;
    float weight = 1.0 * (percent - percent * percent);
    color += crossFade(texCoord + toCenter * percent * str, dissolve) * weight;
    total += weight;
  }

  fragColor = vec4(color / total, 1.0);
}

out vec4 outColor;
void main() {
  vec4 fragColor;
  mainImage(fragColor, gl_FragCoord.xy);
  outColor = fragColor;
}`;

// ============ React Components ============

function BlurTransitionEffect() {
  const { gl, size } = useThree();
  const [tex1, tex2] = useTexture(['/i1.jpg', '/i2.jpg']);

  const dpr = gl.getPixelRatio();
  const pixelWidth = Math.floor(size.width * dpr);
  const pixelHeight = Math.floor(size.height * dpr);

  const imageMaterial = useMemo(() => {
    return new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: {
        iTime: { value: 0 },
        iResolution: { value: new THREE.Vector2(pixelWidth, pixelHeight) },
        iChannel0: { value: tex1 },
        iChannel1: { value: tex2 },
      },
      vertexShader: fullscreenVert,
      fragmentShader: imageFrag,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tex1, tex2]);

  // Handle resize
  useEffect(() => {
    const d = gl.getPixelRatio();
    const w = Math.floor(size.width * d);
    const h = Math.floor(size.height * d);
    imageMaterial.uniforms.iResolution.value.set(w, h);
  }, [size, gl, imageMaterial]);

  // Cleanup
  useEffect(() => {
    return () => {
      imageMaterial.dispose();
    };
  }, [imageMaterial]);

  // Render loop
  useFrame((state) => {
    imageMaterial.uniforms.iTime.value = state.clock.elapsedTime;
  });

  return (
    <mesh frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <primitive object={imageMaterial} attach="material" />
    </mesh>
  );
}

export default function BlurTransitionScene() {
  const { contextLost, canvasKey, handleCreated } = useWebGLRecovery('BlurTransition');

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
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
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
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="font-medium">Loading Shader...</p>
          </div>
        }
      >
        <Canvas
          key={canvasKey}
          style={{ height: '100%', width: '100%', display: 'block' }}
          gl={{ antialias: false, alpha: false }}
          frameloop="always"
          dpr={[1, 2]}
          onCreated={handleCreated}
        >
          <BlurTransitionEffect />
        </Canvas>
      </Suspense>
    </div>
  );
}
