'use client';

import { Suspense, useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { useWebGLRecovery } from '@/hooks/useWebGLRecovery';
import { FlyThroughCamera, DEFAULT_WAYPOINTS } from './FlyThroughCamera';

// ============ Constants ============

const CUBE_COUNT = 200;
const SPEED = 0.02;
const SCATTER_RADIUS = 25;

// Timeline phases (seconds within each loop)
const PHASE_A_END = 15; // fly-through only
const PHASE_B_END = 18; // transition → hacker (3s)
const PHASE_C_END = 19; // hacker only
const PHASE_D_END = 22; // transition → fly-through (3s)
const LOOP_DURATION = 50;

// ============ GLSL Shaders ============

const fullscreenVert = /* glsl */ `in vec3 position;
void main() {
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

const commonGLSL = /* glsl */ `
#define GRID_X 32.0
#define GRID_Y 9.0
#define FBM

float random(in vec2 uv) {
  return fract(sin(dot(uv.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

float noise(in vec2 uv) {
  vec2 i = floor(uv);
  vec2 f = fract(uv);
  float a = random(i);
  float b = random(i + vec2(1.0, 0.0));
  float c = random(i + vec2(0.0, 1.0));
  float d = random(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) +
         (c - a) * u.y * (1.0 - u.x) +
         (d - b) * u.x * u.y;
}

float sdBox(in vec2 p, in vec2 b) {
  vec2 d = abs(p) - b;
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}
`;

const bufferAFrag = /* glsl */ `precision highp float;

uniform float iTime;
uniform vec2 iResolution;
uniform vec4 iMouse;
uniform sampler2D iChannel0;

${commonGLSL}

float getChar(
  vec2 uvid,
  vec2 uvst,
  vec2 uv,
  vec2 id,
  float dmult,
  float gmip,
  float gmult
) {
  vec2 dx = (dFdx(uv) * vec2(GRID_X, GRID_Y) / 16.0) * dmult;
  vec2 dy = (dFdy(uv) * vec2(GRID_X, GRID_Y) / 16.0) * dmult;
  vec2 s = (uvst - 0.5) / 16.0 + 1.0 / 32.0 + id / 16.0;
  float ch = textureGrad(iChannel0, s, dx, dy).r;
  ch = max(ch, textureLod(iChannel0, s, gmip).r * gmult
          * smoothstep(0.1, 0.0, sdBox(uvst - 0.5, vec2(0.36))));
  ch *= step(sdBox(uvst - 0.5, vec2(1.0)), 0.0);
  return ch;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = fragCoord / iResolution.xy;
  vec2 uvid = floor(uv * vec2(GRID_X, GRID_Y));
  vec2 uvst = fract(uv * vec2(GRID_X, GRID_Y));

  float randX = random(uvid.xx) * 3.0;
  float progress = iTime * (randX * 0.3 + 0.4) + randX * (GRID_Y - 0.01) + 1.0;
  float rowLength = floor(progress);
  float iter = floor(rowLength / (GRID_Y + 2.0));
  rowLength = mod(rowLength, GRID_Y + 2.0);

  float ch = 0.0;
  float time = 0.0;
  float glowMip = 3.0;
  float glowMult = 1.0;

  float timer = mod(progress, GRID_Y + 2.0) / (GRID_Y + 2.0);

  if (uvid.y > GRID_Y - rowLength - 1.0) {
    if (uvid.y == GRID_Y - rowLength) {
      time = floor(mod(iTime * 26.0, 260.0));
      glowMip = 3.6;
      glowMult = 2.6;
    }
    uvid /= vec2(GRID_X, GRID_Y);
    vec2 cid = vec2(
      floor(random(uvid + iter) * 14.0 + 1.0),
      floor(random(uvid + 0.5 + time) * 5.0 + 8.0)
    );
    float dmult = clamp((GRID_Y - timer * GRID_Y * 2.0), 1.0, 6.0);
    ch = getChar(uvid, uvst, uv, cid, dmult, glowMip, glowMult);
  }

  vec3 blue = vec3(0.0, 0.8, 1.0);
  vec3 green = vec3(0.0, 1.0, 0.8);
  vec3 col = mix(blue, green, random(uvid + iter)) * ch;

  col.r = mod(iter * 0.01 + random(uvid.xx), 1.0);

  fragColor = vec4(col, timer);
}

out vec4 outColor;
void main() {
  vec4 fragColor;
  mainImage(fragColor, gl_FragCoord.xy);
  outColor = fragColor;
}`;

const hackerImageFrag = /* glsl */ `precision highp float;

uniform float iTime;
uniform vec2 iResolution;
uniform vec4 iMouse;
uniform sampler2D iChannel0;

${commonGLSL}

#define NUM_OCTAVES 3
#ifdef FBM
float fbm(in vec2 uv) {
  float v = 0.0;
  float a = 0.55;
  vec2 shift = vec2(10.0);
  mat2 rot = mat2(cos(0.001 * iTime), tan(0.005),
                  -sin(0.005), cos(0.001 * iTime));
  for (int i = 0; i < NUM_OCTAVES; ++i) {
    v += a * noise(uv);
    uv = rot * uv * 2.0 + shift;
    a *= 0.5;
  }
  return v;
}
#endif

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;

  vec2 mc = (iMouse.xy - 0.5 * iResolution.xy) / iResolution.y;
  if (length(iMouse.xy) < 20.0) {
    mc = vec2(0.0);
  }

  vec3 blue = vec3(0.3, 0.35, 0.4);
  float n = noise((uv.xx + iTime * 0.02) * 20.0) * max(-uv.x, 0.0);
  n += noise((uv.xx + iTime * -0.02) * 20.0) * max(uv.x, 0.0);

  float frbm = 0.4;
  #ifdef FBM
  frbm = fbm(uv * 6.0 + vec2(0.0, iTime * 0.2));
  #endif
  float s = max((uv.y / abs(uv.x) + 0.5) * abs(uv.x), 0.0);
  vec3 col = mix(vec3(0.0), blue, (n + frbm) * s);

  for (float i = 0.0; i < GRID_X; i++) {
    float coord = ((i * iResolution.x + 0.5) / (GRID_X - 1.0));
    vec2 t = texelFetch(iChannel0, ivec2(coord, iResolution.y - 0.5), 0).xw;

    vec2 stuv = uv * (2.0 - t.y * 2.0) *
      vec2(GRID_Y, GRID_X) / (GRID_X > GRID_Y ? GRID_Y : GRID_X) + 0.5;

    vec2 st = vec2(stuv.x + i / GRID_X - 0.5, stuv.y - 0.5);
    vec2 epos = vec2(random(vec2(i + t.x)) * 0.6 - 0.3, random(vec2(i + t.x + 0.1)) + 0.3);

    st += mix(epos * vec2(0.5, 3.0) - vec2(0.0, 3.0), epos, t.y);
    st += mc * 0.25;

    float sbox = step(sdBox(
      st - vec2((i + 0.5) / GRID_X, 0.5),
      vec2(0.5 / GRID_X, 0.5)),
      0.0);

    float fade = min(t.y * 2.0, 1.0) * clamp((1.0 - t.y) * 10.0, 0.0, 1.0);

    vec3 tex = texture(iChannel0, st).rgb;
    tex.r = 0.3 * (tex.g + tex.b);
    col += tex * sbox * fade;
  }

  fragColor = vec4(col, 1.0);
}

out vec4 outColor;
void main() {
  vec4 fragColor;
  mainImage(fragColor, gl_FragCoord.xy);
  outColor = fragColor;
}`;

const compositorFrag = /* glsl */ `precision highp float;

uniform vec2 iResolution;
uniform float uProgress;
uniform sampler2D iChannel0;
uniform sampler2D iChannel1;

const float strength = 0.3;
const float PI = 3.141592653589793;

float Linear_ease(in float begin, in float change, in float duration, in float time) {
  return change * time / duration + begin;
}

float Exponential_easeInOut(in float begin, in float change, in float duration, in float time) {
  if (time == 0.0) return begin;
  else if (time == duration) return begin + change;
  time = time / (duration / 2.0);
  if (time < 1.0) return change / 2.0 * pow(2.0, 10.0 * (time - 1.0)) + begin;
  return change / 2.0 * (-pow(2.0, -10.0 * (time - 1.0)) + 2.0) + begin;
}

float Sinusoidal_easeInOut(in float begin, in float change, in float duration, in float time) {
  return -change / 2.0 * (cos(PI * time / duration) - 1.0) + begin;
}

float rand(in vec3 scale, in float seed) {
  return fract(sin(dot(gl_FragCoord.xyz + seed, scale)) * 43758.5453 + seed);
}

vec3 crossFade(in vec2 uv, in float dissolve) {
  return mix(texture(iChannel0, uv).rgb, texture(iChannel1, uv).rgb, dissolve);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 texCoord = fragCoord.xy / iResolution.xy;
  float progress = uProgress;

  // Fast path: no transition
  if (progress <= 0.0) {
    fragColor = vec4(texture(iChannel0, texCoord).rgb, 1.0);
    return;
  }
  if (progress >= 1.0) {
    fragColor = vec4(texture(iChannel1, texCoord).rgb, 1.0);
    return;
  }

  vec2 center = vec2(Linear_ease(0.5, 0.0, 1.0, progress), 0.5);
  float dissolve = Exponential_easeInOut(0.0, 1.0, 1.0, progress);
  float str = Sinusoidal_easeInOut(0.0, strength, 0.5, progress);

  vec3 color = vec3(0.0);
  float total = 0.0;
  vec2 toCenter = center - texCoord;

  float offset = rand(vec3(12.9898, 78.233, 151.7182), 0.0) * 0.5;

  for (float t = 0.0; t <= 20.0; t++) {
    float percent = (t + offset) / 20.0;
    float weight = 1.0 * (percent - percent * percent);
    color += crossFade(texCoord + toCenter * percent * str, dissolve) * weight;
    total += weight;
  }

  fragColor = vec4(color / total, 1.0);
}

out vec4 outColor;
void main() {
  vec4 fragColor;
  mainImage(fragColor, gl_FragCoord.xy);
  outColor = fragColor;
}`;

// ============ Helpers ============

function smoothstep01(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

function computeProgress(loopTime: number): number {
  if (loopTime < PHASE_A_END) return 0;
  if (loopTime < PHASE_B_END)
    return smoothstep01((loopTime - PHASE_A_END) / (PHASE_B_END - PHASE_A_END));
  if (loopTime < PHASE_C_END) return 1;
  if (loopTime < PHASE_D_END)
    return 1 - smoothstep01((loopTime - PHASE_C_END) / (PHASE_D_END - PHASE_C_END));
  return 0;
}

// ============ All-in-One Renderer ============

function Renderer({ showPath }: { showPath: boolean }) {
  const { gl, size, camera } = useThree();
  const fontTexture = useTexture('/codepage12.png');

  // Configure font texture mipmaps (needed by textureGrad / textureLod)
  useMemo(() => {
    fontTexture.minFilter = THREE.LinearMipMapLinearFilter;
    fontTexture.magFilter = THREE.LinearFilter;
    fontTexture.generateMipmaps = true;
    fontTexture.wrapS = THREE.ClampToEdgeWrapping;
    fontTexture.wrapT = THREE.ClampToEdgeWrapping;
    fontTexture.needsUpdate = true;
  }, [fontTexture]);

  // Create all resources (scenes, FBOs, materials) once
  const res = useMemo(() => {
    const d = gl.getPixelRatio();
    const w = Math.floor(size.width * d);
    const h = Math.floor(size.height * d);

    // ---- FBOs ----
    const flyFBO = new THREE.WebGLRenderTarget(w, h, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
    });
    const hackerBufFBO = new THREE.WebGLRenderTarget(w, h, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      type: THREE.HalfFloatType,
      format: THREE.RGBAFormat,
    });
    const hackerImgFBO = new THREE.WebGLRenderTarget(w, h, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      type: THREE.HalfFloatType,
      format: THREE.RGBAFormat,
    });

    const orthoCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const fsGeo = new THREE.PlaneGeometry(2, 2);

    // ---- Fly-through scene ----
    const flyScene = new THREE.Scene();
    flyScene.add(new THREE.AmbientLight(0xffffff, 0.3));
    const dir1 = new THREE.DirectionalLight(0xffffff, 1);
    dir1.position.set(50, 50, 50);
    flyScene.add(dir1);
    const dir2 = new THREE.DirectionalLight(0x4488ff, 0.3);
    dir2.position.set(-30, -20, -40);
    flyScene.add(dir2);
    const pointLight = new THREE.PointLight(0xffffff, 2, 30);
    flyScene.add(pointLight);

    // Instanced cubes
    const cubeGeo = new THREE.BoxGeometry(1, 1, 1);
    const cubeMat = new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.3 });
    const cubes = new THREE.InstancedMesh(cubeGeo, cubeMat, CUBE_COUNT);
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    for (let i = 0; i < CUBE_COUNT; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * SCATTER_RADIUS;
      dummy.position.set(
        Math.cos(angle) * radius + (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 40,
        Math.random() * 110 - 15
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
    flyScene.add(cubes);

    // Path visualization
    const flyCam = new FlyThroughCamera(DEFAULT_WAYPOINTS, 0.35);
    const pathGeo = new THREE.TubeGeometry(flyCam.getCurve(), 200, 0.15, 8, true);
    const pathMesh = new THREE.Mesh(
      pathGeo,
      new THREE.MeshBasicMaterial({ color: 0x00ffff, opacity: 0.35, transparent: true })
    );
    pathMesh.visible = false;
    flyScene.add(pathMesh);

    // ---- Hacker buffer A scene ----
    const hackerBufMat = new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: {
        iTime: { value: 0 },
        iResolution: { value: new THREE.Vector2(w, h) },
        iMouse: { value: new THREE.Vector4(0, 0, 0, 0) },
        iChannel0: { value: fontTexture },
      },
      vertexShader: fullscreenVert,
      fragmentShader: bufferAFrag,
    });
    const hackerBufScene = new THREE.Scene();
    hackerBufScene.add(new THREE.Mesh(fsGeo, hackerBufMat));

    // ---- Hacker image scene ----
    const hackerImgMat = new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: {
        iTime: { value: 0 },
        iResolution: { value: new THREE.Vector2(w, h) },
        iMouse: { value: new THREE.Vector4(0, 0, 0, 0) },
        iChannel0: { value: hackerBufFBO.texture },
      },
      vertexShader: fullscreenVert,
      fragmentShader: hackerImageFrag,
    });
    const hackerImgScene = new THREE.Scene();
    hackerImgScene.add(new THREE.Mesh(fsGeo, hackerImgMat));

    // ---- Compositor scene (blur-transition) ----
    const compositorMat = new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: {
        iResolution: { value: new THREE.Vector2(w, h) },
        uProgress: { value: 0 },
        iChannel0: { value: flyFBO.texture },
        iChannel1: { value: hackerImgFBO.texture },
      },
      vertexShader: fullscreenVert,
      fragmentShader: compositorFrag,
    });
    const compositorScene = new THREE.Scene();
    compositorScene.add(new THREE.Mesh(fsGeo, compositorMat));

    return {
      flyFBO,
      hackerBufFBO,
      hackerImgFBO,
      orthoCam,
      flyScene,
      pointLight,
      flyCam,
      pathMesh,
      hackerBufScene,
      hackerBufMat,
      hackerImgScene,
      hackerImgMat,
      compositorScene,
      compositorMat,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fontTexture]);

  const tRef = useRef(0);

  // Handle resize
  useEffect(() => {
    const d = gl.getPixelRatio();
    const w = Math.floor(size.width * d);
    const h = Math.floor(size.height * d);
    res.flyFBO.setSize(w, h);
    res.hackerBufFBO.setSize(w, h);
    res.hackerImgFBO.setSize(w, h);
    res.hackerBufMat.uniforms.iResolution.value.set(w, h);
    res.hackerImgMat.uniforms.iResolution.value.set(w, h);
    res.compositorMat.uniforms.iResolution.value.set(w, h);
  }, [size, gl, res]);

  // Toggle path visibility
  useEffect(() => {
    res.pathMesh.visible = showPath;
  }, [showPath, res]);

  // Cleanup
  useEffect(() => {
    return () => {
      res.flyFBO.dispose();
      res.hackerBufFBO.dispose();
      res.hackerImgFBO.dispose();
      res.hackerBufMat.dispose();
      res.hackerImgMat.dispose();
      res.compositorMat.dispose();
    };
  }, [res]);

  // ---- Render loop (priority 1 → disables R3F auto-render) ----
  useFrame((state, delta) => {
    const time = state.clock.elapsedTime;
    const loopTime = time % LOOP_DURATION;
    const progress = computeProgress(loopTime);

    // Advance camera along spline (always, even during hacker phase)
    tRef.current = (tRef.current + delta * SPEED) % 1;
    const { position, lookAt } = res.flyCam.evaluate(tRef.current);
    camera.position.copy(position);
    camera.lookAt(lookAt);
    res.pointLight.position.copy(position);

    // 1. Render fly-through scene to FBO (skip when fully in hacker)
    if (progress < 1) {
      gl.setRenderTarget(res.flyFBO);
      gl.render(res.flyScene, camera);
    }

    // 2. Render hacker passes to FBOs (skip when fully in fly-through)
    if (progress > 0) {
      res.hackerBufMat.uniforms.iTime.value = time;
      gl.setRenderTarget(res.hackerBufFBO);
      gl.render(res.hackerBufScene, res.orthoCam);

      res.hackerImgMat.uniforms.iTime.value = time;
      gl.setRenderTarget(res.hackerImgFBO);
      gl.render(res.hackerImgScene, res.orthoCam);
    }

    // 3. Render compositor to screen
    res.compositorMat.uniforms.uProgress.value = progress;
    gl.setRenderTarget(null);
    gl.render(res.compositorScene, res.orthoCam);
  }, 1);

  return null;
}

// ============ Exported Component ============

export default function FlyThroughScene() {
  const { contextLost, canvasKey, handleCreated } = useWebGLRecovery('FlyThrough');
  const [showPath, setShowPath] = useState(false);

  if (contextLost) {
    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: '#000',
          zIndex: 100,
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
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: '#000',
        zIndex: 100,
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
          <Renderer showPath={showPath} />
        </Canvas>
      </Suspense>

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
        }}
      >
        {showPath ? 'HIDE PATH' : 'SHOW PATH'}
      </button>
    </div>
  );
}
