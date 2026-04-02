'use client';

import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

const vertexShader = /* glsl */ `
void main() {
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const fragmentShader = /* glsl */ `
uniform vec2 iResolution;
uniform float iTime;

#define ANIMATION_TIMESCALE 0.5
#define ANIM_FUNC Quart

int ANIMATION_TYPE = 3;

float sdLine(in vec2 p, in vec2 a, in vec2 b) {
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h);
}

float sdRing(vec2 p, vec2 origin, float radius) {
  return abs(length(p - origin) - radius);
}

float Quart(float s, float e, float t) {
  t = clamp((t - s) / (e - s), 0.0, 1.0);
  return 1.0 - pow(1.0 - t, 4.0);
}

float circuit(vec2 p) {
  float d = 1e6;
  d = min(d, sdLine(p, vec2(-1.0, -0.1), vec2(-0.1, -0.1)));
  d = min(d, sdLine(p, vec2(-0.1, -0.1), vec2(0.1, 0.1)));
  d = min(d, sdLine(p, vec2(0.1, 0.1), vec2(1.0, 0.1)));
  d = min(d, sdRing(p, vec2(1.05, 0.1), 0.05));
  return d;
}

void main() {
  vec2 fragCoord = gl_FragCoord.xy;
  float aspectRatio = iResolution.x / iResolution.y;
  vec2 uv = 2.0 * fragCoord / iResolution.xy - 1.0;
  uv.x *= aspectRatio;

  vec3 col = vec3(0.0);

  float time = iTime * ANIMATION_TIMESCALE;
  time = mod(time, 4.0);

  float mask;
  float x = uv.x;

  if (ANIMATION_TYPE == 3) {
    float moveIn = ANIM_FUNC(0.0, 1.0, time);
    float moveOut = ANIM_FUNC(2.0, 3.0, time);
    x += 2.0 * aspectRatio * (1.0 - moveIn - moveOut);
    mask = smoothstep(-aspectRatio, -0.8, x) - smoothstep(0.8, aspectRatio, x);
  }

  float d = circuit(uv);
  float shade = 0.008 / d;
  col += vec3(1.0, 0.2, 0.0) * shade;
  col *= mask;

  gl_FragColor = vec4(col, 1.0);
}
`;

export default function OneLineShader() {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const { size, viewport } = useThree();

  useFrame(({ clock }) => {
    const mat = matRef.current;
    if (!mat) return;
    mat.uniforms.iTime.value = clock.getElapsedTime();
    mat.uniforms.iResolution.value.set(
      size.width * viewport.dpr,
      size.height * viewport.dpr
    );
  });

  return (
    <mesh frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={{
          iResolution: { value: new THREE.Vector2() },
          iTime: { value: 0 },
        }}
      />
    </mesh>
  );
}
