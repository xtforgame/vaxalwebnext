'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Suspense, useEffect, useRef, useMemo, useCallback, useState } from 'react';
import * as THREE from 'three';

// Reuse from frame-gallery (NOT copied)
import WallScene from '@/components/frame-gallery/WallScene';
import { CameraDirector, CAMERA_FOV, IMMERSED_Z, VIEWPORT_DIST, RESTING_Z } from '@/components/frame-gallery/CameraDirector';
import { TransitionController } from '@/components/frame-gallery/TransitionController';
import type { FrameConfig, TransitionPhase } from '@/components/frame-gallery/types';

// Reuse from fly-through (FBO video sub-scene system)
import {
  createVideoScene,
  createVideoSceneState,
  updateVideoScene,
  disposeVideoScene,
} from '@/components/fly-through/createVideoScene';

// Timeline data from video1-display & video2-display
import {
  VIDEO_SRC as VIDEO1_SRC,
  VIDEO_ASPECT as VIDEO1_ASPECT,
  TIMELINE as VIDEO1_TIMELINE,
} from '@/components/video1-display/timelineData';
import {
  VIDEO_SRC as VIDEO2_SRC,
  VIDEO_ASPECT as VIDEO2_ASPECT,
  TIMELINE as VIDEO2_TIMELINE,
} from '@/components/video2-display/timelineData';

// Pre-sorted timelines (same pattern as fly-through)
const VIDEO1_SORTED_TIMELINE = [...VIDEO1_TIMELINE].sort((a, b) => a.time - b.time);
const VIDEO2_SORTED_TIMELINE = [...VIDEO2_TIMELINE].sort((a, b) => a.time - b.time);

// Both videos share the same aspect ratio (4096 x 2206)
const VIDEO_ASPECT = VIDEO1_ASPECT;

/** Frame configurations — two puzzle frames on the wall */
const FRAMES: FrameConfig[] = [
  {
    id: 'reimbursement',
    wallPosition: new THREE.Vector3(-10, 6, 0),
    radius: 2.8,
    borderWidth: 0.25,
    frameDepth: 0.3,
    videoSrc: VIDEO1_SRC,
  },
  {
    id: 'sales',
    wallPosition: new THREE.Vector3(10, -6, 0),
    radius: 2.8,
    borderWidth: 0.25,
    frameDepth: 0.3,
    videoSrc: VIDEO2_SRC,
  },
];

const FRUSTUM_HALF_H = 5; // must match createVideoScene.ts

/**
 * Compute the content plane dimensions that fill the viewport
 * at the immersed camera distance (VIEWPORT_DIST), matching
 * video1-display's "contain" behaviour.
 */
function computeContentDimensions(viewAspect: number) {
  const halfFov = (CAMERA_FOV * Math.PI / 180) / 2;
  const visibleHeight = 2 * VIEWPORT_DIST * Math.tan(halfFov);
  const visibleWidth = visibleHeight * viewAspect;

  if (viewAspect > VIDEO_ASPECT) {
    return { contentWidth: visibleHeight * VIDEO_ASPECT, contentHeight: visibleHeight };
  } else {
    return { contentWidth: visibleWidth, contentHeight: visibleWidth / VIDEO_ASPECT };
  }
}

/**
 * Compute the Z position for a video plane.
 * Same logic as frame-gallery v1.
 */
function computeContentZ(
  frameIndex: number,
  phase: TransitionPhase,
  fromFrame: number,
  toFrame: number,
  cameraZ: number
): number {
  const tracking = Math.min(cameraZ - VIEWPORT_DIST, RESTING_Z);

  if (phase === 'immersed') {
    return frameIndex === fromFrame ? cameraZ - VIEWPORT_DIST : RESTING_Z;
  }

  if (frameIndex === fromFrame && (phase === 'exiting' || phase === 'overview' || phase === 'panning')) {
    return tracking;
  }

  if (frameIndex === toFrame && (phase === 'panning' || phase === 'entering')) {
    return tracking;
  }

  return RESTING_Z;
}

/**
 * Inner scene component — runs inside Canvas context.
 * Uses FBO-backed video sub-scenes instead of simple VideoTextures.
 */
function GalleryScene({
  onPhaseChange,
}: {
  onPhaseChange?: (phase: TransitionPhase) => void;
}) {
  const { gl, camera, size } = useThree();

  // --- Create two FBO-backed video sub-scenes ---
  const videoResources = useMemo(() => {
    const d = gl.getPixelRatio();
    const w = Math.floor(size.width * d);
    const h = Math.floor(size.height * d);

    const video1 = createVideoScene({
      videoAspect: VIDEO1_ASPECT,
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

    // Hide video planes until textures are assigned (prevents white flash)
    video1.videoMaterial.visible = false;
    video2.videoMaterial.visible = false;

    return { video1, video2 };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Transition state ---
  const transitionRef = useRef(new TransitionController(0));
  const cameraDirectorRef = useRef<CameraDirector | null>(null);

  // Ref-based content Z — updated every frame, no React state lag
  const contentZRefs = useRef(
    FRAMES.map((_, i) => ({
      current: i === 0 ? IMMERSED_Z - VIEWPORT_DIST : RESTING_Z,
    }))
  );

  // Light trail refs
  const trailProgressRef = useRef(0);
  const trailVisibleRef = useRef(false);

  // Debug logging
  const debugTimerRef = useRef(0);
  const lastPhaseRef = useRef<TransitionPhase>('immersed');

  // --- Video sub-scene state ---
  const video1StateRef = useRef(createVideoSceneState());
  const video2StateRef = useRef(createVideoSceneState());

  // Video elements + textures (created in useEffect)
  const video1ElRef = useRef<HTMLVideoElement | null>(null);
  const video1TexRef = useRef<THREE.VideoTexture | null>(null);
  const video2ElRef = useRef<HTMLVideoElement | null>(null);
  const video2TexRef = useRef<THREE.VideoTexture | null>(null);

  // Elapsed time tracking for each video timeline
  const video1ElapsedRef = useRef(0);
  const video2ElapsedRef = useRef(0);
  const video2InitRef = useRef(false);    // true once video2 sub-scene is initialized (seeked, paused, FBO rendering)
  const video2StartedRef = useRef(false); // true once entering phase begins (timeline progresses)

  // --- Responsive content plane dimensions ---
  const viewAspect = size.width / size.height;
  const { contentWidth, contentHeight } = useMemo(
    () => computeContentDimensions(viewAspect),
    [viewAspect]
  );

  // --- Phase change callback ---
  useEffect(() => {
    transitionRef.current.onPhaseChange = (phase: TransitionPhase) => {
      onPhaseChange?.(phase);
    };
  }, [onPhaseChange]);

  // --- Video 1 element lifecycle ---
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
      vTex.colorSpace = THREE.SRGBColorSpace;
      video1TexRef.current = vTex;
    };
    video.addEventListener('canplay', onCanPlay, { once: true });

    video.src = VIDEO1_SRC;

    return () => {
      video.pause();
      video.removeAttribute('src');
      video.load();
      video1TexRef.current?.dispose();
      video1TexRef.current = null;
      video1ElRef.current = null;
      videoResources.video1.videoMaterial.map = null;
      videoResources.video1.videoMaterial.needsUpdate = true;
    };
  }, [videoResources]);

  // --- Video 2 element lifecycle ---
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
      vTex.colorSpace = THREE.SRGBColorSpace;
      video2TexRef.current = vTex;
    };
    video.addEventListener('canplay', onCanPlay, { once: true });

    video.src = VIDEO2_SRC;

    return () => {
      video.pause();
      video.removeAttribute('src');
      video.load();
      video2TexRef.current?.dispose();
      video2TexRef.current = null;
      video2ElRef.current = null;
      videoResources.video2.videoMaterial.map = null;
      videoResources.video2.videoMaterial.needsUpdate = true;
    };
  }, [videoResources]);

  // --- Camera init ---
  useEffect(() => {
    const posA = FRAMES[0].wallPosition;
    camera.position.set(posA.x, posA.y, IMMERSED_Z);
    camera.rotation.set(0, 0, 0);
  }, [camera]);

  // --- Auto-start transition after 3s ---
  useEffect(() => {
    const timer = setTimeout(() => {
      cameraDirectorRef.current = new CameraDirector(FRAMES[0], FRAMES[1]);
      transitionRef.current.startTransition(1);
      console.log('[FrameGalleryV2] Transition started: frame 0 → frame 1');
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  // --- Resize FBOs + orthographic cameras on viewport change ---
  useEffect(() => {
    const d = gl.getPixelRatio();
    const w = Math.floor(size.width * d);
    const h = Math.floor(size.height * d);

    videoResources.video1.fbo.setSize(w, h);
    videoResources.video2.fbo.setSize(w, h);

    // Update orthographic camera frustums for new aspect
    const vAspect = size.width / size.height;
    const halfW = FRUSTUM_HALF_H * vAspect;

    for (const res of [videoResources.video1, videoResources.video2]) {
      res.cam.left = -halfW;
      res.cam.right = halfW;
      res.cam.top = FRUSTUM_HALF_H;
      res.cam.bottom = -FRUSTUM_HALF_H;
      res.cam.updateProjectionMatrix();
    }
  }, [size, gl, videoResources]);

  // --- Cleanup ---
  useEffect(() => {
    return () => {
      disposeVideoScene(videoResources.video1);
      disposeVideoScene(videoResources.video2);
    };
  }, [videoResources]);

  // --- Main render loop: priority -1 (BEFORE R3F auto-render at priority 0) ---
  useFrame((_, delta) => {
    const tc = transitionRef.current;
    const cd = cameraDirectorRef.current;

    // 1. Advance transition state
    tc.update(delta);
    const { phase, progress, fromFrame, toFrame } = tc.state;

    // 2. Camera position (same as v1)
    let globalT = 0;
    if (phase === 'immersed') {
      const fp = FRAMES[fromFrame].wallPosition;
      camera.position.set(fp.x, fp.y, IMMERSED_Z);
    } else if (cd) {
      const animPhase = phase as 'exiting' | 'overview' | 'panning' | 'entering';
      globalT = CameraDirector.phaseToGlobal(animPhase, progress);
      const { position } = cd.evaluate(globalT);
      camera.position.copy(position);
    }

    // 3. Light trail refs
    trailProgressRef.current = globalT;
    trailVisibleRef.current = phase !== 'immersed';

    // 4. Camera always faces -Z
    camera.rotation.set(0, 0, 0);

    // 5. Update content Z refs
    const cameraZ = camera.position.z;
    for (let i = 0; i < FRAMES.length; i++) {
      contentZRefs.current[i].current = computeContentZ(
        i, phase, fromFrame, toFrame, cameraZ
      );
    }

    // 6. Video2 two-phase lifecycle:
    //    - Init: when transition begins (exiting), fire time=0 actions (seek + play),
    //      then pause. This gives us a static frame visible through the puzzle hole.
    //    - Start: when entering begins, resume playback and start timeline progression.
    if (phase !== 'immersed' && !video2InitRef.current && video2ElRef.current) {
      video2InitRef.current = true;
      // Fire time=0 timeline actions (seek to start position)
      updateVideoScene(
        videoResources.video2,
        video2StateRef.current,
        video2ElRef.current,
        video2TexRef.current,
        0,
        VIDEO2_SORTED_TIMELINE,
      );
      // Pause — we only need the seeked frame as a thumbnail
      video2ElRef.current.pause();
    }

    if (phase === 'entering' && !video2StartedRef.current) {
      video2StartedRef.current = true;
      video2ElRef.current?.play().catch(() => {});
      console.log('[FrameGalleryV2] Video 2 timeline started (entering phase)');
    }

    // 7. Update video sub-scenes (timeline processing)
    if (video1ElRef.current) {
      video1ElapsedRef.current += delta;
      updateVideoScene(
        videoResources.video1,
        video1StateRef.current,
        video1ElRef.current,
        video1TexRef.current,
        video1ElapsedRef.current,
        VIDEO1_SORTED_TIMELINE,
      );
    }
    if (videoResources.video1.videoMaterial.map && !videoResources.video1.videoMaterial.visible) {
      videoResources.video1.videoMaterial.visible = true;
    }

    // Video2: after init, always call updateVideoScene for texture updates;
    // only increment elapsed once 'started' (entering phase).
    if (video2InitRef.current && video2ElRef.current) {
      if (video2StartedRef.current) {
        video2ElapsedRef.current += delta;
      }
      updateVideoScene(
        videoResources.video2,
        video2StateRef.current,
        video2ElRef.current,
        video2TexRef.current,
        video2ElapsedRef.current,
        VIDEO2_SORTED_TIMELINE,
      );
    }
    if (videoResources.video2.videoMaterial.map && !videoResources.video2.videoMaterial.visible) {
      videoResources.video2.videoMaterial.visible = true;
    }

    // 8. Render sub-scenes to FBOs in LINEAR color space to avoid double sRGB encoding.
    //    R3F's renderer has outputColorSpace=SRGBColorSpace which would encode linear→sRGB
    //    into the FBO. Then the main scene render would encode again → washed-out colors.
    //    By switching to linear for FBO writes, FBOs store linear data, and the single
    //    sRGB encoding happens only in the final screen render.
    const savedColorSpace = gl.outputColorSpace;
    gl.outputColorSpace = THREE.LinearSRGBColorSpace;

    gl.setRenderTarget(videoResources.video1.fbo);
    gl.render(videoResources.video1.scene, videoResources.video1.cam);

    if (video2InitRef.current) {
      gl.setRenderTarget(videoResources.video2.fbo);
      gl.render(videoResources.video2.scene, videoResources.video2.cam);
    }

    // 9. Restore color space + reset render target for R3F auto-render
    gl.outputColorSpace = savedColorSpace;
    gl.setRenderTarget(null);

    // === Debug logging ===
    if (phase !== lastPhaseRef.current) {
      console.log(
        `[FrameGalleryV2] Phase: ${lastPhaseRef.current} → ${phase} | ` +
        `camZ=${cameraZ.toFixed(2)} | ` +
        `v0_Z=${contentZRefs.current[0].current.toFixed(2)} | ` +
        `v1_Z=${contentZRefs.current[1].current.toFixed(2)}`
      );
      lastPhaseRef.current = phase;
    }

    debugTimerRef.current += delta;
    if (phase !== 'immersed' && debugTimerRef.current > 0.5) {
      debugTimerRef.current = 0;
      console.log(
        `[FrameGalleryV2] ${phase} p=${progress.toFixed(3)} | ` +
        `camZ=${cameraZ.toFixed(2)} | ` +
        `v0_Z=${contentZRefs.current[0].current.toFixed(2)} | ` +
        `v1_Z=${contentZRefs.current[1].current.toFixed(2)} | ` +
        `wallVisible=${cameraZ > 0 ? 'YES' : 'NO'}`
      );
    }
  }, -1);

  // --- FBO textures for WallScene (stable ref, created once) ---
  const sceneTextures = useMemo(
    () => [
      {
        videoTexture: videoResources.video1.fbo.texture as THREE.Texture,
        contentZRef: contentZRefs.current[0],
      },
      {
        videoTexture: videoResources.video2.fbo.texture as THREE.Texture,
        contentZRef: contentZRefs.current[1],
      },
    ],
    [videoResources]
  );

  return (
    <>
      <ambientLight intensity={0.6} />
      <pointLight position={[0, 5, 8]} intensity={1.0} />
      <WallScene
        frames={FRAMES}
        sceneTextures={sceneTextures}
        contentWidth={contentWidth}
        contentHeight={contentHeight}
        trailProgressRef={trailProgressRef}
        trailVisibleRef={trailVisibleRef}
      />
    </>
  );
}

export default function FrameGalleryV2() {
  const [phase, setPhase] = useState<TransitionPhase>('immersed');

  const handlePhaseChange = useCallback((p: TransitionPhase) => {
    setPhase(p);
  }, []);

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
          <div className="flex flex-col items-center justify-center w-full h-full text-slate-400">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="font-medium">Loading Gallery V2...</p>
          </div>
        }
      >
        <Canvas
          gl={{
            antialias: true,
            stencil: true,
            alpha: false,
            powerPreference: 'high-performance',
          }}
          camera={{
            position: [FRAMES[0].wallPosition.x, FRAMES[0].wallPosition.y, IMMERSED_Z],
            fov: CAMERA_FOV,
            near: 0.01,
            far: 100,
          }}
          dpr={[1, 1.5]}
          style={{ width: '100%', height: '100%' }}
          frameloop="always"
        >
          <GalleryScene onPhaseChange={handlePhaseChange} />
        </Canvas>
      </Suspense>

      {/* Phase indicator */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[110] pointer-events-none">
        <div className="px-4 py-2 bg-black/40 backdrop-blur-md rounded-full text-white/70 text-xs font-mono uppercase tracking-wider">
          {phase === 'immersed' && 'Watching'}
          {phase === 'exiting' && 'Pulling back...'}
          {phase === 'overview' && 'Gallery view'}
          {phase === 'panning' && 'Moving to next...'}
          {phase === 'entering' && 'Entering...'}
        </div>
      </div>
    </div>
  );
}
