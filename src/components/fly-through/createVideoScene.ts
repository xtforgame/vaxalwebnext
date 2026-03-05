import * as THREE from 'three';
import { EASING_MAP, type TimelineAction, type EasingFn } from '@/components/video-player/types';
import type { VideoSceneResources } from './types';

// ============ Gear constants (from VideoPlayer) ============

const GEAR_SPEED = 0.015;
const GEAR1 = { count: 8, outR: 4, inR: 3.2, holeR: 1.3 };
const GEAR2 = { count: 7, outR: 3.741657, inR: 2.941657, holeR: 1 };
const GEAR_DISTANCE = GEAR1.outR + GEAR2.inR;
const GEAR2_INIT_ROT = (-(Math.PI * 2) / GEAR2.count) * 1.05;

const FRUSTUM_HALF_H = 5;
const TEXT_CANVAS_W = 512;
const TEXT_CANVAS_H = 256;

// ============ Gear shape helper (from VideoPlayer) ============

function createGearShape(
  count: number,
  outRadius: number,
  inRadius: number,
  holeRadius: number,
): THREE.Shape {
  const shape = new THREE.Shape();
  const outDeg = (Math.PI * 2) / count;
  const step = 30;
  const degStep = outDeg / step;
  let theta = 0;
  let first = false;

  for (let i = 0; i < count; i++) {
    for (let j = 0; j < step; j++) {
      theta += degStep;
      const inside = (theta % outDeg) > (outDeg * 2) / 3;
      let radius = inside ? inRadius : outRadius;
      if (!inside) {
        const value = theta % outDeg;
        const radiusDiff = outRadius - inRadius;
        const left = ((outDeg * 2) / 3) / 3;
        const right = (((outDeg * 2) / 3) * 2) / 3;
        if (value <= left) {
          radius -= (-(value / left) + 1) * radiusDiff;
        } else if (value > right) {
          radius -= ((value - right) / left) * radiusDiff;
        }
      }
      const x = radius * Math.sin(theta);
      const y = radius * Math.cos(theta);
      if (!first) { shape.moveTo(x, y); first = true; }
      else { shape.lineTo(x, y); }
    }
  }
  shape.closePath();

  const hole = new THREE.EllipseCurve(0, 0, holeRadius, holeRadius, 0, Math.PI * 2, false, 0);
  shape.holes = [new THREE.Path(hole.getPoints(60))];
  return shape;
}

// ============ Types ============

export interface VideoSceneConfig {
  videoAspect: number;
  viewWidth: number;
  viewHeight: number;
  fboWidth: number;
  fboHeight: number;
}

export interface VideoSceneState {
  nextActionIndex: number;
  currentZoomScale: number;
  currentFocal: [number, number];
  currentSpeed: number;
  activeZoom: {
    startScale: number;
    endScale: number;
    startFocal: [number, number];
    endFocal: [number, number];
    startTime: number;
    duration: number;
    easing: EasingFn;
  } | null;
  activeSpeed: {
    startRate: number;
    endRate: number;
    startTime: number;
    duration: number;
    easing: EasingFn;
  } | null;
  prevElapsed: number;
}

// ============ Create ============

export function createVideoScene(cfg: VideoSceneConfig): VideoSceneResources {
  const fbo = new THREE.WebGLRenderTarget(cfg.fboWidth, cfg.fboHeight, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat,
  });

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  // Orthographic camera sized to viewport aspect
  const aspect = cfg.viewWidth / cfg.viewHeight;
  const halfW = FRUSTUM_HALF_H * aspect;
  const cam = new THREE.OrthographicCamera(
    -halfW, halfW, FRUSTUM_HALF_H, -FRUSTUM_HALF_H, 0.1, 100
  );
  cam.position.set(0, 0, 5);

  // Video plane — fill viewport maintaining video aspect ratio
  const camW = halfW * 2;
  const camH = FRUSTUM_HALF_H * 2;
  const viewAspect = camW / camH;
  const planeWidth = viewAspect > cfg.videoAspect ? camH * cfg.videoAspect : camW;
  const planeHeight = viewAspect > cfg.videoAspect ? camH : camW / cfg.videoAspect;

  const videoPlaneGeo = new THREE.PlaneGeometry(planeWidth, planeHeight);
  const videoMaterial = new THREE.MeshBasicMaterial({ toneMapped: false });
  scene.add(new THREE.Mesh(videoPlaneGeo, videoMaterial));

  // ---- Overlay group (gears + text) ----
  const overlayGroup = new THREE.Group();
  overlayGroup.visible = false;
  scene.add(overlayGroup);

  // Backdrop
  const backdropGeo = new THREE.PlaneGeometry(10000, 10000);
  const backdropMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.55,
    depthTest: false,
    depthWrite: false,
  });
  const backdropMesh = new THREE.Mesh(backdropGeo, backdropMat);
  backdropMesh.position.z = 0.19;
  backdropMesh.renderOrder = 10;
  overlayGroup.add(backdropMesh);

  // Gear sub-group (scaled per frame)
  const gearSubGroup = new THREE.Group();
  overlayGroup.add(gearSubGroup);

  const extrudeSettings = { steps: 1, depth: 0.01, bevelEnabled: false };
  const gear1Geo = new THREE.ExtrudeGeometry(
    createGearShape(GEAR1.count, GEAR1.outR, GEAR1.inR, GEAR1.holeR),
    extrudeSettings,
  );
  const gear2Geo = new THREE.ExtrudeGeometry(
    createGearShape(GEAR2.count, GEAR2.outR, GEAR2.inR, GEAR2.holeR),
    extrudeSettings,
  );
  const gear1Mat = new THREE.MeshBasicMaterial({
    color: 0xffffff, transparent: true, opacity: 0.75,
    depthTest: false, depthWrite: false,
  });
  const gear2Mat = new THREE.MeshBasicMaterial({
    color: 0xc7d2fe, transparent: true, opacity: 0.75,
    depthTest: false, depthWrite: false,
  });
  const gear1 = new THREE.Mesh(gear1Geo, gear1Mat);
  gear1.position.set(-GEAR_DISTANCE / 2, 0.5, 0.2);
  gear1.renderOrder = 11;
  gearSubGroup.add(gear1);

  const gear2 = new THREE.Mesh(gear2Geo, gear2Mat);
  gear2.position.set(GEAR_DISTANCE / 2, 0.5, 0.2);
  gear2.rotation.z = GEAR2_INIT_ROT;
  gear2.renderOrder = 11;
  gearSubGroup.add(gear2);

  // Overlay text (canvas texture)
  const textCanvas = document.createElement('canvas');
  textCanvas.width = TEXT_CANVAS_W;
  textCanvas.height = TEXT_CANVAS_H;
  const textCtx = textCanvas.getContext('2d')!;
  const textTexture = new THREE.CanvasTexture(textCanvas);
  textTexture.minFilter = THREE.LinearFilter;
  textTexture.magFilter = THREE.LinearFilter;

  const textPlaneGeo = new THREE.PlaneGeometry(10, 10 * TEXT_CANVAS_H / TEXT_CANVAS_W);
  const textMat = new THREE.MeshBasicMaterial({
    map: textTexture,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  const textMesh = new THREE.Mesh(textPlaneGeo, textMat);
  textMesh.position.set(0, -(GEAR1.outR + 2), 0.2);
  textMesh.renderOrder = 12;
  gearSubGroup.add(textMesh);

  return {
    fbo, scene, cam,
    videoMaterial, videoPlaneGeo,
    planeWidth, planeHeight,
    overlayGroup, gearSubGroup,
    gear1, gear2, gear1Geo, gear2Geo, gear1Mat, gear2Mat,
    backdropGeo, backdropMat,
    textCanvas, textCtx, textTexture, textPlaneGeo, textMat, textMesh,
  };
}

// ============ State factory ============

export function createVideoSceneState(): VideoSceneState {
  return {
    nextActionIndex: 0,
    currentZoomScale: 1,
    currentFocal: [0.5, 0.5],
    currentSpeed: 1,
    activeZoom: null,
    activeSpeed: null,
    prevElapsed: -1,
  };
}

// ============ Update (call every frame when video phase is active) ============

export function updateVideoScene(
  res: VideoSceneResources,
  state: VideoSceneState,
  video: HTMLVideoElement,
  texture: THREE.VideoTexture | null,
  elapsed: number,
  sortedTimeline: TimelineAction[],
): void {
  // Process timeline actions that have been reached
  while (state.nextActionIndex < sortedTimeline.length) {
    const action = sortedTimeline[state.nextActionIndex];
    if (action.time > elapsed) break;

    // Skip actions that were already processed in a previous frame
    // (prevElapsed tracks last frame's elapsed to avoid re-processing on re-entry)
    if (action.time <= state.prevElapsed) {
      state.nextActionIndex++;
      continue;
    }

    switch (action.type) {
      case 'play':
        video.play().catch(() => {});
        break;
      case 'pause':
        video.pause();
        break;
      case 'seek':
        video.currentTime = action.to;
        break;
      case 'speed':
        if (action.duration && action.duration > 0) {
          state.activeSpeed = {
            startRate: state.currentSpeed,
            endRate: action.rate,
            startTime: action.time,
            duration: action.duration,
            easing: EASING_MAP[action.easing ?? 'easeInCubic'],
          };
        } else {
          video.playbackRate = action.rate;
          state.currentSpeed = action.rate;
          state.activeSpeed = null;
        }
        break;
      case 'zoom':
        state.activeZoom = {
          startScale: state.currentZoomScale,
          endScale: action.scale,
          startFocal: [...state.currentFocal],
          endFocal: action.focal,
          startTime: action.time,
          duration: action.duration,
          easing: EASING_MAP[action.easing ?? 'easeInCubic'],
        };
        break;
      case 'overlay-show':
        res.overlayGroup.visible = true;
        res.gear1.rotation.z = 0;
        res.gear2.rotation.z = GEAR2_INIT_ROT;
        renderOverlayText(res, action.text ?? '');
        break;
      case 'overlay-hide':
        res.overlayGroup.visible = false;
        break;
      // cursor-* actions: no-op (not used in video2 timeline)
      default:
        break;
    }

    state.nextActionIndex++;
  }

  state.prevElapsed = elapsed;

  // Interpolate speed
  if (state.activeSpeed) {
    const s = state.activeSpeed;
    const rawT = Math.min(1, (elapsed - s.startTime) / s.duration);
    const t = s.easing(rawT);
    const rate = s.startRate + (s.endRate - s.startRate) * t;
    video.playbackRate = rate;
    state.currentSpeed = rate;
    if (rawT >= 1) state.activeSpeed = null;
  }

  // Interpolate zoom
  if (state.activeZoom) {
    const z = state.activeZoom;
    const rawT = Math.min(1, (elapsed - z.startTime) / z.duration);
    const t = z.easing(rawT);
    const scale = z.startScale + (z.endScale - z.startScale) * t;
    const fx = z.startFocal[0] + (z.endFocal[0] - z.startFocal[0]) * t;
    const fy = z.startFocal[1] + (z.endFocal[1] - z.startFocal[1]) * t;

    res.cam.zoom = scale;
    res.cam.position.x = (fx - 0.5) * res.planeWidth;
    res.cam.position.y = (0.5 - fy) * res.planeHeight;
    res.cam.updateProjectionMatrix();

    state.currentZoomScale = scale;
    state.currentFocal = [fx, fy];
    if (rawT >= 1) state.activeZoom = null;
  }

  // Overlay: follow camera + rotate gears
  if (res.overlayGroup.visible) {
    res.overlayGroup.position.set(res.cam.position.x, res.cam.position.y, 0);
    const visH = (FRUSTUM_HALF_H * 2) / res.cam.zoom;
    const s = (visH * 0.15) / (GEAR1.outR * 2) / res.cam.zoom;
    res.gearSubGroup.scale.setScalar(s);
    res.gear1.rotation.z -= GEAR_SPEED;
    res.gear2.rotation.z += (GEAR_SPEED * GEAR1.count) / GEAR2.count;
  }

  // Update video texture
  if (texture && video.readyState >= video.HAVE_CURRENT_DATA) {
    if (!res.videoMaterial.map) {
      res.videoMaterial.map = texture;
      res.videoMaterial.needsUpdate = true;
    }
    texture.needsUpdate = true;
  }
}

// ============ Text rendering helper ============

function renderOverlayText(res: VideoSceneResources, text: string): void {
  const { textCtx: ctx, textCanvas: cvs, textTexture: tex } = res;

  if (!text) {
    // Reset to base size
    if (cvs.width !== TEXT_CANVAS_W) {
      cvs.width = TEXT_CANVAS_W;
    }
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    res.textMesh.scale.x = 1;
    tex.needsUpdate = true;
    return;
  }

  // Measure at fixed font size
  ctx.font = 'bold 92px sans-serif';
  const measured = ctx.measureText(text).width;
  const needed = Math.ceil(measured * 1.15); // 15% padding

  // Widen canvas if text overflows, otherwise reset to base
  const targetW = Math.max(TEXT_CANVAS_W, needed);
  if (cvs.width !== targetW) {
    cvs.width = targetW;
    ctx.font = 'bold 92px sans-serif'; // context resets on resize
  }
  ctx.clearRect(0, 0, cvs.width, cvs.height);

  // Scale mesh X so wider canvas maps to a wider plane, keeping text height unchanged
  res.textMesh.scale.x = targetW / TEXT_CANVAS_W;

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, cvs.width / 2, cvs.height / 2);

  tex.image = cvs;
  tex.needsUpdate = true;
}

// ============ Reset (for loop restart) ============

export function resetVideoSceneState(state: VideoSceneState): void {
  state.nextActionIndex = 0;
  state.currentZoomScale = 1;
  state.currentFocal = [0.5, 0.5];
  state.currentSpeed = 1;
  state.activeZoom = null;
  state.activeSpeed = null;
  state.prevElapsed = -1;
}

// ============ Dispose ============

export function disposeVideoScene(res: VideoSceneResources): void {
  res.fbo.dispose();
  res.videoPlaneGeo.dispose();
  res.videoMaterial.dispose();
  res.gear1Geo.dispose();
  res.gear2Geo.dispose();
  res.gear1Mat.dispose();
  res.gear2Mat.dispose();
  res.backdropGeo.dispose();
  res.backdropMat.dispose();
  res.textPlaneGeo.dispose();
  res.textMat.dispose();
  res.textTexture.dispose();
}
