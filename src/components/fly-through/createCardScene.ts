import * as THREE from 'three';
import { buildNeonFrameGeometry, getFrameContour } from './neonFrameGeometry';
import { panelCrtVert, panelCrtFrag, panelGlowVert, panelGlowFrag } from './shaders';
import type { NeonPanelConfig, CardSceneResources } from './types';

export interface CardSceneConfig {
  cardTexture: THREE.Texture;
  panoTexture: THREE.Texture;
  cardWidth: number;
  cardHeight: number;
  diagPositions: THREE.Vector3[];
  diagLookAts: THREE.Vector3[];
  neonPanels: NeonPanelConfig[];
  panelVideoW: number;
  panelVideoH: number;
  panelFrameW: number;
  panelFrameH: number;
  panelFrameThickness: number;
  panelFrameCut: number;
  viewWidth: number;
  viewHeight: number;
  fboWidth: number;
  fboHeight: number;
}

export function createCardScene(cfg: CardSceneConfig): CardSceneResources {
  const fbo = new THREE.WebGLRenderTarget(cfg.fboWidth, cfg.fboHeight, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat,
  });

  const scene = new THREE.Scene();
  scene.background = cfg.panoTexture;
  scene.environment = cfg.panoTexture;
  scene.backgroundRotation = new THREE.Euler(0, Math.PI, 0);
  scene.environmentRotation = new THREE.Euler(0, Math.PI, 0);

  scene.add(new THREE.AmbientLight(0xffffff, 1.0));
  const cardSpot = new THREE.SpotLight(0xffffff, 3, 0, 0.4, 1);
  cardSpot.position.set(5, 8, 5);
  scene.add(cardSpot);
  const cardBluePoint = new THREE.PointLight(0x3db5e6, 1.5);
  cardBluePoint.position.set(-5, -3, -5);
  scene.add(cardBluePoint);
  const cardWhitePoint = new THREE.PointLight(0xffffff, 1.0);
  cardWhitePoint.position.set(5, 3, 5);
  scene.add(cardWhitePoint);

  // Card mesh
  const cardGeo = new THREE.PlaneGeometry(cfg.cardWidth, cfg.cardHeight);
  const cardMeshMat = new THREE.MeshPhysicalMaterial({
    map: cfg.cardTexture,
    transparent: true,
    alphaTest: 0.5,
    side: THREE.DoubleSide,
    roughness: 0.35,
    metalness: 0.1,
    clearcoat: 0.6,
    clearcoatRoughness: 0.15,
    reflectivity: 0.4,
    envMapIntensity: 0.8,
  });
  scene.add(new THREE.Mesh(cardGeo, cardMeshMat));

  // Neon video panels
  const neonFrameGeo = buildNeonFrameGeometry(
    cfg.panelFrameW, cfg.panelFrameH, cfg.panelFrameThickness, cfg.panelFrameCut
  );
  const videoPlaneGeo = new THREE.PlaneGeometry(cfg.panelVideoW, cfg.panelVideoH, 1, 1);
  const glowPlaneGeo = new THREE.PlaneGeometry(
    cfg.panelFrameW * 1.6, cfg.panelFrameH * 1.6, 1, 1
  );

  // 1×1 black placeholder
  const placeholderTex = new THREE.DataTexture(
    new Uint8Array([0, 0, 0, 255]), 1, 1, THREE.RGBAFormat
  );
  placeholderTex.needsUpdate = true;

  const neonMaterials: THREE.MeshStandardMaterial[] = [];
  const crtMaterials: THREE.ShaderMaterial[] = [];
  const glowMaterials: THREE.ShaderMaterial[] = [];

  cfg.neonPanels.forEach((panelCfg) => {
    const crtMat = new THREE.ShaderMaterial({
      vertexShader: panelCrtVert,
      fragmentShader: panelCrtFrag,
      uniforms: {
        map: { value: placeholderTex },
        time: { value: 0 },
        powerOn: { value: 0 },
      },
      transparent: true,
      toneMapped: false,
    });
    crtMaterials.push(crtMat);

    const neonColor = new THREE.Color(panelCfg.color);

    const neonMat = new THREE.MeshStandardMaterial({
      color: neonColor,
      emissive: neonColor,
      emissiveIntensity: 5.0,
      roughness: 0.15,
      metalness: 0.9,
      toneMapped: false,
    });
    neonMaterials.push(neonMat);

    const glowMat = new THREE.ShaderMaterial({
      vertexShader: panelGlowVert,
      fragmentShader: panelGlowFrag,
      uniforms: {
        glowColor: { value: neonColor },
        intensity: { value: 1.2 },
        frameVerts: {
          value: getFrameContour(cfg.panelFrameW, cfg.panelFrameH, cfg.panelFrameCut)
            .map(([x, y]) => new THREE.Vector2(x, y)),
        },
        glowHalf: { value: new THREE.Vector2(cfg.panelFrameW * 1.6 / 2, cfg.panelFrameH * 1.6 / 2) },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    glowMaterials.push(glowMat);

    const group = new THREE.Group();
    group.position.set(...panelCfg.pos);
    group.rotation.set(...panelCfg.rot);

    const glowMesh = new THREE.Mesh(glowPlaneGeo, glowMat);
    glowMesh.position.z = -0.005;
    group.add(glowMesh);
    group.add(new THREE.Mesh(neonFrameGeo, neonMat));
    group.add(new THREE.Mesh(videoPlaneGeo, crtMat));

    scene.add(group);
  });

  const panelPositions = cfg.neonPanels.map(
    (p) => new THREE.Vector3(...p.pos)
  );

  const cam = new THREE.PerspectiveCamera(
    40, cfg.viewWidth / cfg.viewHeight, 0.1, 100
  );
  const diagPosCurve = new THREE.CatmullRomCurve3(
    cfg.diagPositions, false, 'catmullrom', 0.35
  );
  const diagLookCurve = new THREE.CatmullRomCurve3(
    cfg.diagLookAts, false, 'catmullrom', 0.35
  );

  return {
    fbo,
    scene,
    cam,
    cardMeshMat,
    diagPosCurve,
    diagLookCurve,
    neonFrameGeo,
    videoPlaneGeo,
    glowPlaneGeo,
    placeholderTex,
    neonMaterials,
    crtMaterials,
    glowMaterials,
    panelPositions,
  };
}
