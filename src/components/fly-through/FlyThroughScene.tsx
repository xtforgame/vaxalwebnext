'use client';

import { Suspense, useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useTexture, useCubeTexture } from '@react-three/drei';
import * as THREE from 'three';
import { useWebGLRecovery } from '@/hooks/useWebGLRecovery';
import {
  updateHudTypingGlass,
  disposeHudTypingGlass,
  resetHudTypingGlass,
  type HudTimingConfig,
} from './HudTypingGlass';
import SwipeRevealText from '@/components/SwipeRevealText';
import GoButton from './GoButton';
import type { TimelineControl, NeonPanelConfig } from './types';
import { createFlyScene } from './createFlyScene';
import { createHackerScenes } from './createHackerScenes';
import { createCardScene } from './createCardScene';
import { createCompositorScene } from './createCompositorScene';
import {
  createVideoScene,
  createVideoSceneState,
  updateVideoScene,
  resetVideoSceneState,
  disposeVideoScene,
} from './createVideoScene';
import { VIDEO_SRC as VIDEO2_SRC, VIDEO_ASPECT as VIDEO2_ASPECT, TIMELINE as VIDEO2_TIMELINE } from '@/components/video2-display/timelineData';
import { VIDEO_SRC as VIDEO1_SRC, VIDEO_ASPECT as VIDEO1_ASPECT, TIMELINE as VIDEO1_TIMELINE } from '@/components/video1-display/timelineData';

// ============ Constants ============

const CUBE_COUNT = 500;
const SPEED = 0.02;
const SCATTER_RADIUS = 50;

// ============ Timeline phases (seconds within each loop) ============

// --- Phase A: Fly-through + title + HUD typing + GO button ---
const TITLE_DELAY         = 2.0;
const TITLE_STAGGER       = 0.5;
const TITLE_DURATION      = 0.8;
const TITLE_EXIT_DELAY    = 3.0;

const HUD_ENTER           = TITLE_DELAY + 3;
const HUD_FADE_DUR        = 0.8;
const HUD_SLIDE_DIST      = 0.12;
const HUD_TYPE_WAIT       = 1.0;
const HUD_TYPE_SPEED      = 0.05;
const HUD_MESSAGES: string[] = [
  '> Rosie，請幫我分析上個月的銷售數據，感謝',
];
const HUD_MSG_PAUSE       = 2.0;
const HUD_BLINK           = 0.53;

// Computed: total typing duration
const _typeDur = HUD_MESSAGES.reduce(
  (s, m, i) => s + (m.length + 1) * HUD_TYPE_SPEED
    + (i < HUD_MESSAGES.length - 1 ? HUD_MSG_PAUSE : 0),
  0
);
const HUD_DONE_AT         = HUD_ENTER + HUD_FADE_DUR + HUD_TYPE_WAIT + _typeDur;
const HUD_DONE_PAUSE      = 1.0;

const GO_OFFSET           = HUD_DONE_PAUSE + 0.5;
const HUD_LIFT_AMOUNT     = 0.25;
const HUD_LIFT_DUR        = 0.8;
const PHASE_A_END         = HUD_DONE_AT + GO_OFFSET + 2.0;

// --- Phase B–J: Transitions ---
const DIAGONAL_DURATION   = 10;
const PHASE_B_END         = PHASE_A_END + 3;             // fly → hacker (3s)
const PHASE_C_END         = PHASE_B_END + 1;             // hacker only (1s)
const PHASE_D_END         = PHASE_C_END + 3;             // hacker → card (3s)
const PHASE_E_END         = PHASE_D_END + DIAGONAL_DURATION - 1; // card display
const PHASE_F_END         = PHASE_E_END + 3;             // card → video2 (3s)
const VIDEO2_PHASE_DURATION = 32;                          // video2 display duration
const PHASE_G_END         = PHASE_F_END + VIDEO2_PHASE_DURATION; // pure video2
const PHASE_H_END         = PHASE_G_END + 3;             // video2 → video1 (3s)
const VIDEO1_PHASE_DURATION = 24;                         // video1 display duration
const PHASE_I_END         = PHASE_H_END + VIDEO1_PHASE_DURATION; // pure video1
const PHASE_J_END         = PHASE_I_END + 3;             // video1 → fly (3s)
const LOOP_DURATION       = 250;

// Video timelines (pre-sorted for update function)
const VIDEO2_SORTED_TIMELINE = [...VIDEO2_TIMELINE].sort((a, b) => a.time - b.time);
const VIDEO1_SORTED_TIMELINE = [...VIDEO1_TIMELINE].sort((a, b) => a.time - b.time);

// HUD timing config (passed to HudTypingGlass)
const HUD_TIMING: HudTimingConfig = {
  appearDelay: HUD_ENTER,
  appearDuration: HUD_FADE_DUR,
  slideDistance: HUD_SLIDE_DIST,
  typingDelay: HUD_TYPE_WAIT,
  typingSpeed: HUD_TYPE_SPEED,
  messages: HUD_MESSAGES,
  messagePause: HUD_MSG_PAUSE,
  cursorBlink: HUD_BLINK,
};

// Card display
const CARD_WIDTH = 2.5;
const CARD_HEIGHT = CARD_WIDTH * (6000 / 900);
const CARD_H = CARD_HEIGHT / 2;
const DIAG_POSITIONS = [
  new THREE.Vector3(-1.5, CARD_H * 0.95, 3.8),
  new THREE.Vector3(-1.0, CARD_H * 0.5, 3.2),
  new THREE.Vector3(-0.5, CARD_H * 0.2, 3.2),
  new THREE.Vector3(0, 0, 3.2),
  new THREE.Vector3(0.5, -CARD_H * 0.2, 3.2),
  new THREE.Vector3(1.0, -CARD_H * 0.5, 3.2),
  new THREE.Vector3(1.5, -CARD_H * 0.8, 3.8),
];
const DIAG_LOOK_ATS = [
  new THREE.Vector3(0, CARD_H * 0.85, 0),
  new THREE.Vector3(0, CARD_H * 0.4, 0),
  new THREE.Vector3(0, CARD_H * 0.1, 0),
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(0, -CARD_H * 0.1, 0),
  new THREE.Vector3(0, -CARD_H * 0.4, 0),
  new THREE.Vector3(0, -CARD_H * 0.7, 0),
];

// Neon video panels flanking the card
const HUD_VIDEOS = [
  { src: '/large-videos/FuturisticHUD1.mp4', aspect: 720 / 720 },
  { src: '/large-videos/FuturisticHUD2.mp4', aspect: 1280 / 720 },
  { src: '/large-videos/FuturisticHUD3.mp4', aspect: 720 / 1280 },
];
const NEON_PANELS: NeonPanelConfig[] = [
  { pos: [-3.0, 5.0, -3], rot: [0, Math.PI / 6, 0], color: '#00ffff', video: HUD_VIDEOS[0].src, videoAspect: HUD_VIDEOS[0].aspect },
  { pos: [-3.5, 0.0, -4], rot: [0, Math.PI / 5, 0], color: '#00ffff', video: HUD_VIDEOS[2].src, videoAspect: HUD_VIDEOS[2].aspect },
  { pos: [-5.7, -5.0, -3], rot: [0, Math.PI / 6, 0], color: '#00ffcc', video: HUD_VIDEOS[1].src, videoAspect: HUD_VIDEOS[1].aspect },
  { pos: [4.0, 3.5, -3], rot: [0, -Math.PI / 6, 0], color: '#00ffff', video: HUD_VIDEOS[1].src, videoAspect: HUD_VIDEOS[1].aspect },
  { pos: [3.5, -1.5, -4], rot: [0, -Math.PI / 5, 0], color: '#00ffff', video: HUD_VIDEOS[0].src, videoAspect: HUD_VIDEOS[0].aspect },
  { pos: [2.0, -4.5, -3], rot: [0, -Math.PI / 6, 0], color: '#00ffcc', video: HUD_VIDEOS[2].src, videoAspect: HUD_VIDEOS[2].aspect },
];
const PANEL_VIDEO_W = 2.4;
const PANEL_VIDEO_H = 1.44;
const PANEL_FRAME_W = 2.8;
const PANEL_FRAME_H = 1.8;
const PANEL_FRAME_THICKNESS = 0.02;
const PANEL_FRAME_CUT = 0.15;

// ============ Helpers ============

function smoothstep01(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

// Frustum detection temporaries (reused every frame)
const _frustum = new THREE.Frustum();
const _projScreenMat = new THREE.Matrix4();
const _tmpPos = new THREE.Vector3();
const POWER_ON_DURATION = 0.15;

// ============ All-in-One Renderer ============

function Renderer({
  showPath,
  tlRef,
  setShowGoButton,
}: {
  showPath: boolean;
  tlRef: React.MutableRefObject<TimelineControl>;
  setShowGoButton: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const { gl, size, camera } = useThree();
  const fontTexture = useTexture('/codepage12.png');
  const cardTexture = useTexture('/ai-answer.png');
  const panoTexture = useTexture('/equirectangular-png_15019635.png');
  const skyboxCube = useCubeTexture(
    ['px.png', 'nx.png', 'py.png', 'ny.png', 'pz.png', 'nz.png'],
    { path: '/skybox2/' }
  );

  // Configure textures
  useMemo(() => {
    fontTexture.minFilter = THREE.LinearMipMapLinearFilter;
    fontTexture.magFilter = THREE.LinearFilter;
    fontTexture.generateMipmaps = true;
    fontTexture.wrapS = THREE.ClampToEdgeWrapping;
    fontTexture.wrapT = THREE.ClampToEdgeWrapping;
    fontTexture.needsUpdate = true;

    cardTexture.colorSpace = THREE.SRGBColorSpace;
    panoTexture.mapping = THREE.EquirectangularReflectionMapping;
    panoTexture.colorSpace = THREE.SRGBColorSpace;
  }, [fontTexture, cardTexture, panoTexture]);

  // Create all resources via factory functions
  const res = useMemo(() => {
    const d = gl.getPixelRatio();
    const w = Math.floor(size.width * d);
    const h = Math.floor(size.height * d);

    const orthoCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const fly = createFlyScene({
      skyboxCube,
      cubeCount: CUBE_COUNT,
      scatterRadius: SCATTER_RADIUS,
      width: w,
      height: h,
    });

    const hacker = createHackerScenes({
      fontTexture,
      width: w,
      height: h,
    });

    const card = createCardScene({
      cardTexture,
      panoTexture,
      cardWidth: CARD_WIDTH,
      cardHeight: CARD_HEIGHT,
      diagPositions: DIAG_POSITIONS,
      diagLookAts: DIAG_LOOK_ATS,
      neonPanels: NEON_PANELS,
      panelVideoW: PANEL_VIDEO_W,
      panelVideoH: PANEL_VIDEO_H,
      panelFrameW: PANEL_FRAME_W,
      panelFrameH: PANEL_FRAME_H,
      panelFrameThickness: PANEL_FRAME_THICKNESS,
      panelFrameCut: PANEL_FRAME_CUT,
      viewWidth: size.width,
      viewHeight: size.height,
      fboWidth: w,
      fboHeight: h,
    });

    const video2 = createVideoScene({
      videoAspect: VIDEO2_ASPECT,
      viewWidth: size.width,
      viewHeight: size.height,
      fboWidth: w,
      fboHeight: h,
    });

    const video1 = createVideoScene({
      videoAspect: VIDEO1_ASPECT,
      viewWidth: size.width,
      viewHeight: size.height,
      fboWidth: w,
      fboHeight: h,
    });

    const compositor = createCompositorScene({
      flyTexture: fly.fbo.texture,
      hackerTexture: hacker.imgFBO.texture,
      width: w,
      height: h,
    });

    return { orthoCam, fly, hacker, card, video2, video1, compositor };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fontTexture, cardTexture, panoTexture, skyboxCube]);

  const tRef = useRef(0);
  const warmupRef = useRef(false);
  const panelStatesRef = useRef(
    NEON_PANELS.map(() => ({ seen: false, startTime: -1 }))
  );
  const prevNeedsCardRef = useRef(false);
  const video2StateRef = useRef(createVideoSceneState());
  const video2ElRef = useRef<HTMLVideoElement | null>(null);
  const video2TexRef = useRef<THREE.VideoTexture | null>(null);
  const video1StateRef = useRef(createVideoSceneState());
  const video1ElRef = useRef<HTMLVideoElement | null>(null);
  const video1TexRef = useRef<THREE.VideoTexture | null>(null);

  // Handle resize
  useEffect(() => {
    const d = gl.getPixelRatio();
    const w = Math.floor(size.width * d);
    const h = Math.floor(size.height * d);
    res.fly.fbo.setSize(w, h);
    res.hacker.bufFBO.setSize(w, h);
    res.hacker.imgFBO.setSize(w, h);
    res.card.fbo.setSize(w, h);
    res.hacker.bufMat.uniforms.iResolution.value.set(w, h);
    res.hacker.imgMat.uniforms.iResolution.value.set(w, h);
    res.compositor.mat.uniforms.iResolution.value.set(w, h);
    res.card.cam.aspect = size.width / size.height;
    res.card.cam.updateProjectionMatrix();
    res.video2.fbo.setSize(w, h);
    res.video1.fbo.setSize(w, h);
    const vAspect = size.width / size.height;
    const vHalfW = 5 * vAspect;
    res.video2.cam.left = -vHalfW;
    res.video2.cam.right = vHalfW;
    res.video2.cam.updateProjectionMatrix();
    res.video1.cam.left = -vHalfW;
    res.video1.cam.right = vHalfW;
    res.video1.cam.updateProjectionMatrix();
  }, [size, gl, res]);

  // Toggle path visibility
  useEffect(() => {
    res.fly.pathMesh.visible = showPath;
  }, [showPath, res]);

  // Cleanup
  useEffect(() => {
    return () => {
      res.fly.fbo.dispose();
      res.hacker.bufFBO.dispose();
      res.hacker.imgFBO.dispose();
      res.card.fbo.dispose();
      res.hacker.bufMat.dispose();
      res.hacker.imgMat.dispose();
      res.compositor.mat.dispose();
      res.card.cardMeshMat.dispose();
      res.card.neonFrameGeo.dispose();
      res.card.videoPlaneGeo.dispose();
      res.card.glowPlaneGeo.dispose();
      res.card.placeholderTex.dispose();
      res.card.neonMaterials.forEach((m) => m.dispose());
      res.card.crtMaterials.forEach((m) => m.dispose());
      res.card.glowMaterials.forEach((m) => m.dispose());
      disposeHudTypingGlass(res.fly.hud);
      disposeVideoScene(res.video2);
      disposeVideoScene(res.video1);
    };
  }, [res]);

  // Video lifecycle: create videos after mount, swap into CRT materials when ready
  useEffect(() => {
    const videos: HTMLVideoElement[] = [];
    const textures: THREE.VideoTexture[] = [];

    NEON_PANELS.forEach((cfg, i) => {
      const video = document.createElement('video');
      video.crossOrigin = 'Anonymous';
      video.loop = true;
      video.muted = true;
      video.playsInline = true;
      video.preload = 'auto';
      videos.push(video);

      const tryPlay = () => {
        video.play().catch(() => {
          setTimeout(tryPlay, 1000);
        });
      };

      const onCanPlay = () => {
        const vTex = new THREE.VideoTexture(video);
        vTex.minFilter = THREE.LinearFilter;
        vTex.magFilter = THREE.LinearFilter;
        textures.push(vTex);
        res.card.crtMaterials[i].uniforms.map.value = vTex;
        tryPlay();
      };
      video.addEventListener('canplay', onCanPlay, { once: true });

      let retryCount = 0;
      const onError = () => {
        if (retryCount < 5) {
          retryCount++;
          setTimeout(() => {
            video.src = cfg.video;
            video.load();
          }, 2000 * retryCount);
        }
      };
      video.addEventListener('error', onError);

      video.src = cfg.video;
    });

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        videos.forEach((v) => {
          if (v.paused && v.readyState >= 2) {
            v.play().catch(() => {});
          }
        });
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      videos.forEach((v) => {
        v.pause();
        v.removeAttribute('src');
        v.load();
      });
      textures.forEach((t) => t.dispose());
      res.card.crtMaterials.forEach((m) => {
        m.uniforms.map.value = res.card.placeholderTex;
      });
    };
  }, [res]);

  // Video scene: create video element, swap texture when ready
  useEffect(() => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.loop = false;
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video2ElRef.current = video;

    const onCanPlay = () => {
      const vTex = new THREE.VideoTexture(video);
      vTex.minFilter = THREE.LinearFilter;
      vTex.magFilter = THREE.LinearFilter;
      video2TexRef.current = vTex;
    };
    video.addEventListener('canplay', onCanPlay, { once: true });

    let retryCount = 0;
    const onError = () => {
      if (retryCount < 5) {
        retryCount++;
        setTimeout(() => {
          video.src = VIDEO2_SRC;
          video.load();
        }, 2000 * retryCount);
      }
    };
    video.addEventListener('error', onError);

    video.src = VIDEO2_SRC;

    return () => {
      video.pause();
      video.removeAttribute('src');
      video.load();
      video2TexRef.current?.dispose();
      video2TexRef.current = null;
      video2ElRef.current = null;
      res.video2.videoMaterial.map = null;
      res.video2.videoMaterial.needsUpdate = true;
    };
  }, [res]);

  // Video1 scene: create video element, swap texture when ready
  useEffect(() => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.loop = false;
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video1ElRef.current = video;

    const onCanPlay = () => {
      const vTex = new THREE.VideoTexture(video);
      vTex.minFilter = THREE.LinearFilter;
      vTex.magFilter = THREE.LinearFilter;
      video1TexRef.current = vTex;
    };
    video.addEventListener('canplay', onCanPlay, { once: true });

    let retryCount = 0;
    const onError = () => {
      if (retryCount < 5) {
        retryCount++;
        setTimeout(() => {
          video.src = VIDEO1_SRC;
          video.load();
        }, 2000 * retryCount);
      }
    };
    video.addEventListener('error', onError);

    video.src = VIDEO1_SRC;

    return () => {
      video.pause();
      video.removeAttribute('src');
      video.load();
      video1TexRef.current?.dispose();
      video1TexRef.current = null;
      video1ElRef.current = null;
      res.video1.videoMaterial.map = null;
      res.video1.videoMaterial.needsUpdate = true;
    };
  }, [res]);

  // ---- Render loop (priority 1 → disables R3F auto-render) ----
  useFrame((state, delta) => {
    const time = state.clock.elapsedTime;
    const tl = tlRef.current;

    // ---- Managed timeline (pauses at PHASE_A_END until GO) ----
    if (!tl.paused) {
      tl.time += delta;
    }
    if (tl.time >= PHASE_A_END && !tl.goClicked) {
      tl.time = PHASE_A_END;
      tl.paused = true;
    }
    if (tl.time >= LOOP_DURATION) {
      tl.time -= LOOP_DURATION;
      tl.goClicked = false;
      tl.paused = false;
      tl.phaseAStart = time;
      tl.hudDone = false;
      tl.hudDoneTime = 0;
      tl.goShown = false;
      tl.goShownTime = 0;
      resetHudTypingGlass(res.fly.hud);
      setShowGoButton(false);
      // Reset video scenes for new loop
      resetVideoSceneState(video2StateRef.current);
      const v2El = video2ElRef.current;
      if (v2El) {
        v2El.pause();
        v2El.currentTime = 0;
        v2El.playbackRate = 1;
      }
      res.video2.cam.zoom = 1;
      res.video2.cam.position.set(0, 0, 5);
      res.video2.cam.updateProjectionMatrix();
      res.video2.overlayGroup.visible = false;
      res.video2.videoMaterial.map = null;
      res.video2.videoMaterial.needsUpdate = true;
      resetVideoSceneState(video1StateRef.current);
      const v1El = video1ElRef.current;
      if (v1El) {
        v1El.pause();
        v1El.currentTime = 0;
        v1El.playbackRate = 1;
      }
      res.video1.cam.zoom = 1;
      res.video1.cam.position.set(0, 0, 5);
      res.video1.cam.updateProjectionMatrix();
      res.video1.overlayGroup.visible = false;
      res.video1.videoMaterial.map = null;
      res.video1.videoMaterial.needsUpdate = true;
    }
    const loopTime = tl.time;

    // Warm-up: render card + video scenes once on first frame to compile shaders
    if (!warmupRef.current) {
      warmupRef.current = true;
      res.card.cam.position.copy(res.card.diagPosCurve.getPointAt(0));
      res.card.cam.lookAt(res.card.diagLookCurve.getPointAt(0));
      gl.setRenderTarget(res.card.fbo);
      gl.render(res.card.scene, res.card.cam);
      gl.setRenderTarget(res.video2.fbo);
      gl.render(res.video2.scene, res.video2.cam);
      gl.setRenderTarget(res.video1.fbo);
      gl.render(res.video1.scene, res.video1.cam);
    }

    // Advance fly-through camera along spline
    tRef.current = (tRef.current + delta * SPEED) % 1;
    const { position, lookAt } = res.fly.flyCam.evaluate(tRef.current);
    camera.position.copy(position);
    camera.lookAt(lookAt);
    res.fly.pointLight.position.copy(position);

    // ---- HUD Typing Glass Block Update (only during Phase A) ----
    const hudTime = time - tl.phaseAStart;
    if (loopTime <= PHASE_B_END) {
      let hudLift = 0;
      if (tl.hudDone) {
        const liftElapsed = time - tl.hudDoneTime - HUD_DONE_PAUSE;
        if (liftElapsed > 0) {
          hudLift = smoothstep01(liftElapsed / HUD_LIFT_DUR) * HUD_LIFT_AMOUNT;
        }
      }

      const done = updateHudTypingGlass(res.fly.hud, camera, hudTime, hudLift, HUD_TIMING);

      if (done && !tl.hudDone) {
        tl.hudDone = true;
        tl.hudDoneTime = time;
      }

      if (tl.hudDone && !tl.goShown && time - tl.hudDoneTime >= GO_OFFSET) {
        tl.goShown = true;
        tl.goShownTime = time;
        setShowGoButton(true);
      }
    } else {
      res.fly.hud.glassMat.opacity = 0;
      res.fly.hud.textMat.opacity = 0;
    }

    // Determine which scenes are visible and compositor inputs
    let needsFly = false;
    let needsHacker = false;
    let needsCard = false;
    let needsVideo2 = false;
    let needsVideo1 = false;
    let ch0 = res.fly.fbo.texture;
    let ch1 = res.fly.fbo.texture;
    let prog = 0;
    let brightness = 1.0;
    const CARD_BRIGHTNESS = 1.4;

    if (loopTime < PHASE_A_END) {
      // Phase A: pure fly-through
      needsFly = true;
      ch0 = res.fly.fbo.texture;
    } else if (loopTime < PHASE_B_END) {
      // Phase B: fly → hacker
      needsFly = true;
      needsHacker = true;
      ch0 = res.fly.fbo.texture;
      ch1 = res.hacker.imgFBO.texture;
      prog = smoothstep01((loopTime - PHASE_A_END) / (PHASE_B_END - PHASE_A_END));
    } else if (loopTime < PHASE_C_END) {
      // Phase C: pure hacker
      needsHacker = true;
      ch0 = res.hacker.imgFBO.texture;
    } else if (loopTime < PHASE_D_END) {
      // Phase D: hacker → card
      needsHacker = true;
      needsCard = true;
      ch0 = res.hacker.imgFBO.texture;
      ch1 = res.card.fbo.texture;
      prog = smoothstep01((loopTime - PHASE_C_END) / (PHASE_D_END - PHASE_C_END));
      brightness = 1.0 + (CARD_BRIGHTNESS - 1.0) * prog;
    } else if (loopTime < PHASE_E_END) {
      // Phase E: pure card
      needsCard = true;
      ch0 = res.card.fbo.texture;
      brightness = CARD_BRIGHTNESS;
    } else if (loopTime < PHASE_F_END) {
      // Phase F: card → video
      needsCard = true;
      needsVideo2 = true;
      ch0 = res.card.fbo.texture;
      ch1 = res.video2.fbo.texture;
      prog = smoothstep01((loopTime - PHASE_E_END) / (PHASE_F_END - PHASE_E_END));
      brightness = CARD_BRIGHTNESS - (CARD_BRIGHTNESS - 1.0) * prog;
    } else if (loopTime < PHASE_G_END) {
      // Phase G: pure video
      needsVideo2 = true;
      ch0 = res.video2.fbo.texture;
    } else if (loopTime < PHASE_H_END) {
      // Phase H: video2 → video1
      needsVideo2 = true;
      needsVideo1 = true;
      ch0 = res.video2.fbo.texture;
      ch1 = res.video1.fbo.texture;
      prog = smoothstep01((loopTime - PHASE_G_END) / (PHASE_H_END - PHASE_G_END));
    } else if (loopTime < PHASE_I_END) {
      // Phase I: pure video1
      needsVideo1 = true;
      ch0 = res.video1.fbo.texture;
    } else if (loopTime < PHASE_J_END) {
      // Phase J: video1 → fly
      needsVideo1 = true;
      needsFly = true;
      ch0 = res.video1.fbo.texture;
      ch1 = res.fly.fbo.texture;
      prog = smoothstep01((loopTime - PHASE_I_END) / (PHASE_J_END - PHASE_I_END));
    } else {
      // Pure fly-through until LOOP_DURATION
      needsFly = true;
      ch0 = res.fly.fbo.texture;
    }

    // 1. Render fly-through scene
    if (needsFly) {
      gl.setRenderTarget(res.fly.fbo);
      gl.render(res.fly.scene, camera);
    }

    // 2. Render hacker passes
    if (needsHacker) {
      res.hacker.bufMat.uniforms.iTime.value = time;
      gl.setRenderTarget(res.hacker.bufFBO);
      gl.render(res.hacker.bufScene, res.orthoCam);

      res.hacker.imgMat.uniforms.iTime.value = time;
      gl.setRenderTarget(res.hacker.imgFBO);
      gl.render(res.hacker.imgScene, res.orthoCam);
    }

    // 3. Render card scene with DIAGONAL camera
    if (needsCard) {
      const diagStart = PHASE_C_END + (PHASE_D_END - PHASE_C_END) * 0.4;
      const cardT = Math.max(0, Math.min(1,
        (loopTime - diagStart) / DIAGONAL_DURATION
      ));
      const cardEased = smoothstep01(cardT);
      res.card.cam.position.copy(res.card.diagPosCurve.getPointAt(cardEased));
      const lookTarget = res.card.diagLookCurve.getPointAt(cardEased);
      res.card.cam.lookAt(lookTarget);

      const neonTime = state.clock.getElapsedTime();
      const transitionDone = loopTime >= PHASE_D_END;

      if (transitionDone) {
        res.card.cam.updateMatrixWorld();
        _projScreenMat.multiplyMatrices(
          res.card.cam.projectionMatrix,
          res.card.cam.matrixWorldInverse
        );
        _frustum.setFromProjectionMatrix(_projScreenMat);
      }

      const states = panelStatesRef.current;
      for (let i = 0; i < res.card.crtMaterials.length; i++) {
        if (transitionDone) {
          _tmpPos.copy(res.card.panelPositions[i]);
          const inView = _frustum.containsPoint(_tmpPos);

          if (inView && !states[i].seen) {
            states[i].seen = true;
            states[i].startTime = neonTime;
          }
        }

        let powerOn = 0;
        if (states[i].seen) {
          const elapsed = neonTime - states[i].startTime;
          powerOn = Math.min(1, elapsed / POWER_ON_DURATION);
        }

        res.card.crtMaterials[i].uniforms.powerOn.value = powerOn;
        res.card.crtMaterials[i].uniforms.time.value = neonTime;
      }

      gl.setRenderTarget(res.card.fbo);
      gl.render(res.card.scene, res.card.cam);
    }

    // Reset panel power-on states when leaving card phase
    if (prevNeedsCardRef.current && !needsCard) {
      const states = panelStatesRef.current;
      for (let i = 0; i < states.length; i++) {
        states[i].seen = false;
        states[i].startTime = -1;
      }
      for (let i = 0; i < res.card.crtMaterials.length; i++) {
        res.card.crtMaterials[i].uniforms.powerOn.value = 0;
      }
    }
    prevNeedsCardRef.current = needsCard;

    // 4. Render video2 scene
    if (needsVideo2) {
      const v2El = video2ElRef.current;
      const v2Tex = video2TexRef.current;
      if (v2El) {
        const v2Elapsed = loopTime - PHASE_E_END;
        updateVideoScene(res.video2, video2StateRef.current, v2El, v2Tex, v2Elapsed, VIDEO2_SORTED_TIMELINE);
      }
      gl.setRenderTarget(res.video2.fbo);
      gl.render(res.video2.scene, res.video2.cam);
    }

    // 5. Render video1 scene
    if (needsVideo1) {
      const v1El = video1ElRef.current;
      const v1Tex = video1TexRef.current;
      if (v1El) {
        const v1Elapsed = loopTime - PHASE_G_END;
        updateVideoScene(res.video1, video1StateRef.current, v1El, v1Tex, v1Elapsed, VIDEO1_SORTED_TIMELINE);
      }
      gl.setRenderTarget(res.video1.fbo);
      gl.render(res.video1.scene, res.video1.cam);
    }

    // 6. Compositor to screen
    res.compositor.mat.uniforms.iChannel0.value = ch0;
    res.compositor.mat.uniforms.iChannel1.value = ch1;
    res.compositor.mat.uniforms.uProgress.value = prog;
    res.compositor.mat.uniforms.uBrightness.value = brightness;
    gl.setRenderTarget(null);
    gl.render(res.compositor.scene, res.orthoCam);
  }, 1);

  return null;
}

// ============ Exported Component ============

export default function FlyThroughScene() {
  const { contextLost, canvasKey, handleCreated } = useWebGLRecovery('FlyThrough');
  const [showPath, setShowPath] = useState(false);
  const [showGoButton, setShowGoButton] = useState(false);
  const tlRef = useRef<TimelineControl>({
    time: 0,
    paused: false,
    goClicked: false,
    phaseAStart: 0,
    hudDone: false,
    hudDoneTime: 0,
    goShown: false,
    goShownTime: 0,
  });

  const handleGoClick = () => {
    tlRef.current.goClicked = true;
    tlRef.current.paused = false;
    setShowGoButton(false);
  };

  if (contextLost) {
    return (
      <div
        style={{
          width: '100vw',
          height: '100vh',
          backgroundColor: '#000',
        }}
        className="flex flex-col items-center justify-center text-white/40"
      >
        <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="font-medium">Recovering 3D Engine...</p>
      </div>
    );
  }

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        backgroundColor: '#000',
        overflow: 'hidden',
      }}
    >
      <Suspense
        fallback={
          <div className="flex flex-col items-center justify-center w-full h-full text-white/40">
            <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="font-medium">Loading Scene...</p>
          </div>
        }
      >
        <Canvas
          key={canvasKey}
          style={{ height: '100%', width: '100%', display: 'block' }}
          camera={{ fov: 60, near: 0.1, far: 500 }}
          gl={{ antialias: true, alpha: false }}
          frameloop="always"
          dpr={[1, 2]}
          onCreated={handleCreated}
        >
          <Renderer showPath={showPath} tlRef={tlRef} setShowGoButton={setShowGoButton} />
        </Canvas>
      </Suspense>

      {/* Swipe reveal title */}
      <SwipeRevealText
        title={<span className='text-white'>Project <span className='text-cyan-500'>R.O.S.I.E.</span></span>}
        description={
          <>
            <span>訓練有素 — Studio Doe專屬的</span>
            <span className='text-red-500'>AI平台核心</span>
          </>
        }
        x={48}
        y={120}
        delay={TITLE_DELAY}
        stagger={TITLE_STAGGER}
        duration={TITLE_DURATION}
        exitDelay={TITLE_EXIT_DELAY}
        titleStyle={{
          fontSize: 48,
          fontWeight: 900,
          lineHeight: 1,
          color: '#ffffff',
          fontFamily: 'montserrat, sans-serif',
        }}
        descriptionStyle={{
          fontSize: 32,
          fontWeight: 700,
          lineHeight: 1,
          color: '#ffffff',
          fontFamily: 'montserrat, sans-serif',
        }}
      />

      {/* GO button — appears after HUD typing completes */}
      <GoButton visible={showGoButton} autoDelay={0.7} onClick={handleGoClick} />

      {/* Path toggle button */}
      <button
        onClick={() => setShowPath((v) => !v)}
        style={{
          position: 'absolute',
          bottom: 32,
          right: 32,
          zIndex: 200,
          padding: '8px 16px',
          borderRadius: 8,
          border: showPath
            ? '1px solid rgba(0,255,255,0.6)'
            : '1px solid rgba(255,255,255,0.2)',
          backgroundColor: showPath
            ? 'rgba(0,255,255,0.15)'
            : 'rgba(255,255,255,0.08)',
          color: showPath ? '#00ffff' : 'rgba(255,255,255,0.5)',
          fontSize: 12,
          fontFamily: 'monospace',
          cursor: 'pointer',
          transition: 'all 0.2s',
          display: 'none',
        }}
      >
        {showPath ? 'HIDE PATH' : 'SHOW PATH'}
      </button>
    </div>
  );
}
