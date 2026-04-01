import * as THREE from 'three';
import { fullscreenVert, compositorFrag } from './shaders';
import type { CompositorSceneResources } from './types';

export interface CompositorSceneConfig {
  flyTexture: THREE.Texture;
  hackerTexture: THREE.Texture;
  width: number;
  height: number;
}

export function createCompositorScene(cfg: CompositorSceneConfig): CompositorSceneResources {
  const fsGeo = new THREE.PlaneGeometry(2, 2);

  const mat = new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3,
    uniforms: {
      iResolution: { value: new THREE.Vector2(cfg.width, cfg.height) },
      uProgress: { value: 0 },
      uBrightness: { value: 1.0 },
      iChannel0: { value: cfg.flyTexture },
      iChannel1: { value: cfg.hackerTexture },
    },
    vertexShader: fullscreenVert,
    fragmentShader: compositorFrag,
  });

  const scene = new THREE.Scene();
  scene.add(new THREE.Mesh(fsGeo, mat));

  return { scene, mat };
}
