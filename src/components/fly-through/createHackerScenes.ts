import * as THREE from 'three';
import { fullscreenVert, bufferAFrag, hackerImageFrag } from './shaders';
import type { HackerScenesResources } from './types';

export interface HackerScenesConfig {
  fontTexture: THREE.Texture;
  width: number;
  height: number;
}

export function createHackerScenes(cfg: HackerScenesConfig): HackerScenesResources {
  const fsGeo = new THREE.PlaneGeometry(2, 2);

  // Buffer A FBO + scene
  const bufFBO = new THREE.WebGLRenderTarget(cfg.width, cfg.height, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    type: THREE.HalfFloatType,
    format: THREE.RGBAFormat,
  });

  const bufMat = new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3,
    uniforms: {
      iTime: { value: 0 },
      iResolution: { value: new THREE.Vector2(cfg.width, cfg.height) },
      iMouse: { value: new THREE.Vector4(0, 0, 0, 0) },
      iChannel0: { value: cfg.fontTexture },
    },
    vertexShader: fullscreenVert,
    fragmentShader: bufferAFrag,
  });
  const bufScene = new THREE.Scene();
  bufScene.add(new THREE.Mesh(fsGeo, bufMat));

  // Image FBO + scene
  const imgFBO = new THREE.WebGLRenderTarget(cfg.width, cfg.height, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    type: THREE.HalfFloatType,
    format: THREE.RGBAFormat,
  });

  const imgMat = new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3,
    uniforms: {
      iTime: { value: 0 },
      iResolution: { value: new THREE.Vector2(cfg.width, cfg.height) },
      iMouse: { value: new THREE.Vector4(0, 0, 0, 0) },
      iChannel0: { value: bufFBO.texture },
    },
    vertexShader: fullscreenVert,
    fragmentShader: hackerImageFrag,
  });
  const imgScene = new THREE.Scene();
  imgScene.add(new THREE.Mesh(fsGeo, imgMat));

  return { bufFBO, bufScene, bufMat, imgFBO, imgScene, imgMat };
}
