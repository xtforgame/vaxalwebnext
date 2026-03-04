import * as THREE from 'three';
import { FlyThroughCamera, DEFAULT_WAYPOINTS } from './FlyThroughCamera';
import { createHudTypingGlass, type HudTypingGlassResources } from './HudTypingGlass';
import type { FlySceneResources } from './types';

export interface FlySceneConfig {
  skyboxCube: THREE.CubeTexture;
  cubeCount: number;
  scatterRadius: number;
  width: number;
  height: number;
}

export function createFlyScene(cfg: FlySceneConfig): FlySceneResources & { hud: HudTypingGlassResources } {
  const fbo = new THREE.WebGLRenderTarget(cfg.width, cfg.height, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat,
  });

  const scene = new THREE.Scene();
  scene.background = cfg.skyboxCube;
  scene.backgroundIntensity = 2.5;
  scene.environment = cfg.skyboxCube;
  scene.environmentIntensity = 1.5;
  scene.add(new THREE.AmbientLight(0xffffff, 1.3));
  const dir1 = new THREE.DirectionalLight(0xffffff, 1.5);
  dir1.position.set(50, 50, 50);
  scene.add(dir1);
  const dir2 = new THREE.DirectionalLight(0xffffff, 0.5);
  dir2.position.set(-30, -20, -40);
  scene.add(dir2);
  const pointLight = new THREE.PointLight(0xffffff, 2, 30);
  scene.add(pointLight);

  // Instanced cubes
  const cubeGeo = new THREE.BoxGeometry(1, 1, 1);
  const cubeMat = new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.3 });
  const cubes = new THREE.InstancedMesh(cubeGeo, cubeMat, cfg.cubeCount);
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  for (let i = 0; i < cfg.cubeCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * cfg.scatterRadius;
    dummy.position.set(
      Math.cos(angle) * radius + (Math.random() - 0.5) * 40,
      (Math.random() - 0.5) * 60,
      Math.random() * 130 - 25
    );
    dummy.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    );
    dummy.scale.setScalar(0.3 + Math.random() * 1.7);
    dummy.updateMatrix();
    cubes.setMatrixAt(i, dummy.matrix);
    color.setHSL(Math.random(), 0.6 + Math.random() * 0.3, 0.4 + Math.random() * 0.3);
    cubes.setColorAt(i, color);
  }
  cubes.instanceMatrix.needsUpdate = true;
  if (cubes.instanceColor) cubes.instanceColor.needsUpdate = true;
  scene.add(cubes);

  // Path visualization
  const flyCam = new FlyThroughCamera(DEFAULT_WAYPOINTS, 0.35);
  const pathGeo = new THREE.TubeGeometry(flyCam.getCurve(), 200, 0.15, 8, true);
  const pathMesh = new THREE.Mesh(
    pathGeo,
    new THREE.MeshBasicMaterial({ color: 0x00ffff, opacity: 0.35, transparent: true })
  );
  pathMesh.visible = false;
  scene.add(pathMesh);

  // HUD Typing Glass
  const hud = createHudTypingGlass(cfg.skyboxCube);
  scene.add(hud.group);

  return { fbo, scene, pointLight, flyCam, pathMesh, hud };
}
