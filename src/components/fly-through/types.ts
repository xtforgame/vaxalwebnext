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
  videoAspect: number;
}

// ============ Scene resource interfaces ============

export interface FlySceneResources {
  fbo: THREE.WebGLRenderTarget;
  scene: THREE.Scene;
  pointLight: THREE.PointLight;
  flyCam: import('./FlyThroughCamera').FlyThroughCamera;
  pathMesh: THREE.Mesh;
  cubeMat: THREE.MeshStandardMaterial;
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

export interface VideoSceneResources {
  fbo: THREE.WebGLRenderTarget;
  scene: THREE.Scene;
  cam: THREE.OrthographicCamera;
  videoMaterial: THREE.MeshBasicMaterial;
  videoPlaneGeo: THREE.PlaneGeometry;
  planeWidth: number;
  planeHeight: number;
  overlayGroup: THREE.Group;
  gearSubGroup: THREE.Group;
  gear1: THREE.Mesh;
  gear2: THREE.Mesh;
  gear1Geo: THREE.ExtrudeGeometry;
  gear2Geo: THREE.ExtrudeGeometry;
  gear1Mat: THREE.MeshBasicMaterial;
  gear2Mat: THREE.MeshBasicMaterial;
  backdropGeo: THREE.PlaneGeometry;
  backdropMat: THREE.MeshBasicMaterial;
  textCanvas: HTMLCanvasElement;
  textCtx: CanvasRenderingContext2D;
  textTexture: THREE.CanvasTexture;
  textPlaneGeo: THREE.PlaneGeometry;
  textMat: THREE.MeshBasicMaterial;
  textMesh: THREE.Mesh;
}
