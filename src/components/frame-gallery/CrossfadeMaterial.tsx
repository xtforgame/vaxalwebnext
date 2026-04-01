'use client';

import { shaderMaterial } from '@react-three/drei';
import { extend } from '@react-three/fiber';
import * as THREE from 'three';

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D uTexA;  // static image
  uniform sampler2D uTexB;  // video
  uniform float uBlend;     // 0.0 = fully A (static), 1.0 = fully B (video)

  varying vec2 vUv;

  void main() {
    vec4 colorA = texture2D(uTexA, vUv);
    vec4 colorB = texture2D(uTexB, vUv);
    gl_FragColor = mix(colorA, colorB, uBlend);
  }
`;

const CrossfadeShaderMaterial = shaderMaterial(
  {
    uTexA: null as THREE.Texture | null,
    uTexB: null as THREE.Texture | null,
    uBlend: 0.0,
  },
  vertexShader,
  fragmentShader
);

extend({ CrossfadeShaderMaterial });

export { CrossfadeShaderMaterial };
