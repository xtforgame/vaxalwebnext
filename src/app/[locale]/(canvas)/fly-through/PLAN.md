# Fly-Through × Hacker-Style Transition Plan

## Goal

Camera flies through a cube field → mid-flight, zoom-blur transition into Hacker-Style (code rain) → hold for a while → zoom-blur transition back to fly-through → continue flying. Loop.

## Architecture: Single Canvas, Multi-Pass Compositing

All three systems (fly-through, hacker-style, blur-transition) run inside **one R3F Canvas** sharing one WebGL context. Each "scene" renders to an offscreen FBO, and a final compositor quad blends them to screen.

```
┌─────────────────────────────────────────────────────────┐
│                    Single R3F Canvas                     │
│                                                          │
│  ┌──────────────────┐   ┌─────────────────────────────┐  │
│  │  Fly-Through 3D  │   │     Hacker-Style Shader     │  │
│  │  (CubeField +    │   │  bufferA → hackerBufferFBO  │  │
│  │   CameraRig +    │   │  image  → hackerImageFBO    │  │
│  │   Lights)        │   │  (reads codepage12.png)     │  │
│  │       ↓          │   │           ↓                 │  │
│  │  flyThroughFBO   │   │    hackerImageFBO           │  │
│  └────────┬─────────┘   └────────────┬────────────────┘  │
│           │                          │                    │
│           ▼                          ▼                    │
│  ┌────────────────────────────────────────────────────┐   │
│  │          Blur-Transition Compositor                │   │
│  │  iChannel0 = flyThroughFBO.texture                 │   │
│  │  iChannel1 = hackerImageFBO.texture                │   │
│  │  progress  = timeline-controlled (0→1→0)           │   │
│  │                  ↓                                 │   │
│  │             Screen Output                          │   │
│  └────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘
```

## Timeline (per loop cycle)

The camera spline `t` goes 0→1 in ~50s (SPEED=0.02). We define transition windows by elapsed time:

| Phase | Time Range | progress | Description |
|-------|-----------|----------|-------------|
| A | 0s – 15s | 0.0 | Fly-through only |
| B | 15s – 18s | 0→1 (ease) | Blur transition: fly-through → hacker |
| C | 18s – 30s | 1.0 | Hacker-style only |
| D | 30s – 33s | 1→0 (ease) | Blur transition: hacker → fly-through |
| E | 33s – 50s | 0.0 | Fly-through only |
| (loop) | 50s+ | — | Reset, repeat |

Progress easing: `smoothstep` for clean ease-in/ease-out during 3-second transitions.

## Render Pipeline (per frame)

All rendering is driven by a single `useFrame` callback (priority 1, before R3F auto-render):

```
1. Render fly-through scene → flyThroughFBO
   gl.setRenderTarget(flyThroughFBO)
   gl.render(flyThroughScene, flyThroughCamera)

2. Render hacker-style bufferA → hackerBufferFBO
   (only when progress > 0, i.e. phases B/C/D — skip in phase A/E for perf)
   gl.setRenderTarget(hackerBufferFBO)
   gl.render(hackerBufferAScene, orthoCamera)

3. Render hacker-style image → hackerImageFBO
   (only when progress > 0)
   gl.setRenderTarget(hackerImageFBO)
   gl.render(hackerImageScene, orthoCamera)

4. Render compositor → screen
   gl.setRenderTarget(null)
   gl.render(compositorScene, orthoCamera)
```

## File Changes

### New file: `src/components/fly-through/FlyThroughCompositor.tsx`

The main orchestrator component that replaces the current simple `Scene`. Contains:

- **4 WebGLRenderTargets**: flyThroughFBO, hackerBufferFBO, hackerImageFBO (+ compositor renders to screen)
- **3 offscreen scenes** (manually created THREE.Scene):
  - `hackerBufferAScene` — fullscreen quad with bufferA shader + codepage12.png texture
  - `hackerImageScene` — fullscreen quad with image shader, reading hackerBufferFBO.texture
  - `compositorScene` — fullscreen quad with blur-transition shader, reading flyThroughFBO + hackerImageFBO
- **Timeline ref** tracking elapsed time → computes `progress` (0–1)
- **Single `useFrame`** that does all 4 render passes

### Modified: `src/components/fly-through/FlyThroughScene.tsx`

- `CubeField`, `CameraRig`, lights stay as React children (R3F manages them)
- The `FlyThroughCompositor` component is added, which uses `useThree()` to grab `gl` and `scene`/`camera` from the R3F tree
- In `useFrame`, it manually renders `state.scene` with `state.camera` into `flyThroughFBO`, then does the other 3 passes
- **R3F auto-render is disabled** — the compositor's `useFrame` returns early before R3F can render, by setting render priority and calling `gl.clear()` + manual renders
- Actually, the cleanest approach: use `frameloop="never"` or `gl.render` override. Instead, we'll **take over rendering** by using `useFrame` at priority `1` and ending with `gl.setRenderTarget(null)` + rendering the compositor, which becomes the final screen output. R3F will still auto-render, but it will just render the compositor mesh (which is the last thing in the scene).

**Revised approach — simpler:**
- The fly-through 3D scene elements (CubeField, lights, CameraRig) live in a **portal** via `createPortal` into a separate `THREE.Scene`. This scene is never auto-rendered by R3F.
- The compositor fullscreen quad is the only thing in the main R3F scene — it gets auto-rendered to screen.
- In `useFrame`, we manually render the portal scene + hacker passes to their FBOs, then update the compositor uniforms. R3F then auto-renders the compositor quad.

### Modified: Blur-transition shader

- `progress` is now a **uniform** instead of computed from `sin(iTime)`. The JS timeline controls it.
- `iChannel0` and `iChannel1` are FBO textures instead of static images.

### Unchanged files

- `FlyThroughCamera.ts` — no changes needed
- `useWebGLRecovery.ts` — reused as-is
- `src/app/[locale]/fly-through/page.tsx` — no changes (just imports FlyThroughScene)
- `src/app/[locale]/hacker-style/` — untouched, the shader code is copied into the compositor
- `src/app/[locale]/blur-transition/` — untouched, the shader code is adapted into the compositor

## Detailed Component Design

### `FlyThroughCompositor` (inside the Canvas)

```tsx
function FlyThroughCompositor() {
  const { gl, size, scene, camera } = useThree();

  // --- FBOs ---
  const flyThroughFBO = useMemo(() => new WebGLRenderTarget(...));
  const hackerBufferFBO = useMemo(() => new WebGLRenderTarget(...));
  const hackerImageFBO = useMemo(() => new WebGLRenderTarget(...));

  // --- Offscreen scenes (manual THREE.Scene + fullscreen quad) ---
  const { hackerBufferAScene, hackerBufferAMat } = useMemo(() => { ... });
  const { hackerImageScene, hackerImageMat } = useMemo(() => { ... });

  // --- Compositor material (blur-transition shader) ---
  const compositorMat = useMemo(() => {
    // blur-transition shader with:
    // uniform float uProgress;  (replaces sin(iTime) logic)
    // iChannel0 = flyThroughFBO.texture
    // iChannel1 = hackerImageFBO.texture
  });

  // --- Timeline ---
  const timeRef = useRef(0);

  useFrame((state, delta) => {
    timeRef.current += delta;
    const loopTime = timeRef.current % LOOP_DURATION;
    const progress = computeProgress(loopTime); // 0→1→0

    // 1. Update camera along spline
    // (CameraRig already does this via its own useFrame)

    // 2. Render fly-through scene to FBO
    gl.setRenderTarget(flyThroughFBO);
    gl.clear();
    gl.render(flyThroughPortalScene, camera);

    // 3. Render hacker passes (skip if progress === 0)
    if (progress > 0) {
      hackerBufferAMat.uniforms.iTime.value = state.clock.elapsedTime;
      gl.setRenderTarget(hackerBufferFBO);
      gl.render(hackerBufferAScene, orthoCamera);

      hackerImageMat.uniforms.iTime.value = state.clock.elapsedTime;
      gl.setRenderTarget(hackerImageFBO);
      gl.render(hackerImageScene, orthoCamera);
    }

    // 4. Update compositor uniforms
    compositorMat.uniforms.uProgress.value = progress;
    compositorMat.uniforms.iChannel0.value = flyThroughFBO.texture;
    compositorMat.uniforms.iChannel1.value = hackerImageFBO.texture;

    // 5. R3F auto-renders the compositor quad to screen
    gl.setRenderTarget(null);
  });

  return (
    <mesh frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <primitive object={compositorMat} attach="material" />
    </mesh>
  );
}
```

### Modified Blur-Transition Shader (compositor version)

```glsl
uniform float uProgress;  // externally controlled, replaces sin(iTime*0.5)*0.5+0.5

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 texCoord = fragCoord.xy / iResolution.xy;
  float progress = uProgress;  // <-- from JS timeline

  // When progress == 0.0: output iChannel0 (fly-through) only
  // When progress == 1.0: output iChannel1 (hacker-style) only
  // In between: zoom-blur crossfade

  // ... rest of blur transition logic unchanged ...
}
```

### Portal Pattern for Fly-Through Scene

```tsx
// In FlyThroughScene, the 3D content goes into a portal scene
const portalScene = useMemo(() => new THREE.Scene(), []);

return (
  <>
    {createPortal(
      <>
        <ambientLight ... />
        <directionalLight ... />
        <CubeField />
        <CameraRig />
      </>,
      portalScene
    )}
    <FlyThroughCompositor portalScene={portalScene} />
  </>
);
```

## Performance Considerations

- **Skip hacker passes when progress === 0**: During pure fly-through phases (A/E), we skip the two hacker shader passes entirely. Only 2 render passes needed (fly-through FBO + compositor).
- **Skip fly-through render when progress === 1**: During pure hacker phase (C), we could skip the fly-through render. But the camera should keep advancing along the spline so it resumes smoothly — we just skip the `gl.render` call.
- **FBO resolution**: Match viewport pixel size × DPR. Resize handler updates all 3 FBOs.
- **HalfFloatType** for hacker FBOs (same as current hacker-style implementation).

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| R3F auto-render conflicts with manual `gl.render` | Use `createPortal` to isolate 3D scene; only compositor quad is in main scene tree |
| Font texture (codepage12.png) needs mipmaps for `textureGrad` | Set `LinearMipMapLinearFilter` + `generateMipmaps = true` via `useTexture` |
| Context loss during multi-FBO pipeline | Existing `useWebGLRecovery` hook handles this — Canvas remounts, all FBOs recreated via `useMemo` |
| Camera keeps moving during hacker-only phase | Intentional — ensures smooth resume. CameraRig's `useFrame` always runs. |

## Summary of Changes

| File | Action |
|------|--------|
| `src/components/fly-through/FlyThroughScene.tsx` | Major rewrite — add portal, FBOs, compositor, hacker shader passes |
| `src/components/fly-through/FlyThroughCamera.ts` | No change |
| `src/hooks/useWebGLRecovery.ts` | No change |
| `src/app/[locale]/fly-through/page.tsx` | No change |
| `src/app/[locale]/hacker-style/*` | No change (shader code copied, not imported) |
| `src/app/[locale]/blur-transition/*` | No change (shader code adapted, not imported) |
