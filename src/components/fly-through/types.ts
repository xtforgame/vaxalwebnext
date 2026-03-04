import * as THREE from 'three';

// ============ Timeline control ============

export interface TimelineControl {
  time: number;
  paused: boolean;
  goClicked: boolean;
  phaseAStart: number;
  hudDone: boolean;
  hudDoneTime: number;
  goShown: boolean;
  goShownTime: number;
}

// ============ Neon panel config ============

export interface NeonPanelConfig {
  pos: [number, number, number];
  rot: [number, number, number];
  color: string;
  video: string;
}

// ============ Scene resource interfaces ============

export interface FlySceneResources {
  fbo: THREE.WebGLRenderTarget;
  scene: THREE.Scene;
  pointLight: THREE.PointLight;
  flyCam: import('./FlyThroughCamera').FlyThroughCamera;
  pathMesh: THREE.Mesh;
}

export interface HackerScenesResources {
  bufFBO: THREE.WebGLRenderTarget;
  bufScene: THREE.Scene;
  bufMat: THREE.RawShaderMaterial;
  imgFBO: THREE.WebGLRenderTarget;
  imgScene: THREE.Scene;
  imgMat: THREE.RawShaderMaterial;
}

export interface CardSceneResources {
  fbo: THREE.WebGLRenderTarget;
  scene: THREE.Scene;
  cam: THREE.PerspectiveCamera;
  cardMeshMat: THREE.MeshPhysicalMaterial;
  diagPosCurve: THREE.CatmullRomCurve3;
  diagLookCurve: THREE.CatmullRomCurve3;
  neonFrameGeo: THREE.BufferGeometry;
  videoPlaneGeo: THREE.PlaneGeometry;
  glowPlaneGeo: THREE.PlaneGeometry;
  placeholderTex: THREE.DataTexture;
  neonMaterials: THREE.MeshStandardMaterial[];
  crtMaterials: THREE.ShaderMaterial[];
  glowMaterials: THREE.ShaderMaterial[];
  panelPositions: THREE.Vector3[];
}

export interface CompositorSceneResources {
  scene: THREE.Scene;
  mat: THREE.RawShaderMaterial;
}
