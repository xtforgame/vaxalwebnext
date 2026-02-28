'use client';

import { Suspense, useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useTexture, useCubeTexture } from '@react-three/drei';
import * as THREE from 'three';
import { useWebGLRecovery } from '@/hooks/useWebGLRecovery';
import { FlyThroughCamera, DEFAULT_WAYPOINTS } from './FlyThroughCamera';

// ============ Constants ============

const CUBE_COUNT = 500;
const SPEED = 0.02;
const SCATTER_RADIUS = 50;

const DIAGONAL_DURATION = 14;

// Timeline phases (seconds within each loop)
const PHASE_A_END = 3; // fly-through only
const PHASE_B_END = PHASE_A_END + 3; // transition fly → hacker (3s)
const PHASE_C_END = PHASE_B_END + 1; // hacker only
const PHASE_D_END = PHASE_C_END + 3; // transition hacker → card (3s)
const PHASE_E_END = PHASE_D_END + DIAGONAL_DURATION - 1; // card display with DIAGONAL (7s)
const PHASE_F_END = PHASE_E_END + 3; // transition card → fly (3s)
const LOOP_DURATION = 50;

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
const NEON_PANELS: {
  pos: [number, number, number];
  rot: [number, number, number];
  color: string;
  video: string;
}[] = [
  // Left side (angled toward card)
  { pos: [-3.0, 5.0, -3], rot: [0, Math.PI / 6, 0], color: '#00ffff', video: '/video/BigBuckBunny.mp4' },
  { pos: [-3.5, 0.0, -4], rot: [0, Math.PI / 5, 0], color: '#00ffff', video: '/video/ElephantsDream.mp4' },
  { pos: [-3.0, -5.0, -3], rot: [0, Math.PI / 6, 0], color: '#00ffcc', video: '/video/BigBuckBunny.mp4' },
  // Right side (angled toward card)
  { pos: [3.0, 3.5, -3], rot: [0, -Math.PI / 6, 0], color: '#00ffff', video: '/video/ElephantsDream.mp4' },
  { pos: [3.5, -1.5, -4], rot: [0, -Math.PI / 5, 0], color: '#00ffff', video: '/video/BigBuckBunny.mp4' },
  { pos: [3.0, -5.0, -3], rot: [0, -Math.PI / 6, 0], color: '#00ffcc', video: '/video/ElephantsDream.mp4' },
];
const PANEL_VIDEO_W = 2.4;
const PANEL_VIDEO_H = 1.44;
const PANEL_FRAME_W = 2.8;
const PANEL_FRAME_H = 1.8;
const PANEL_FRAME_THICKNESS = 0.02;
const PANEL_FRAME_CUT = 0.15;

function buildNeonFrameGeometry(
  w: number, h: number, thickness: number, cutSize: number
): THREE.ExtrudeGeometry {
  const hw = w / 2;
  const hh = h / 2;
  const shape = new THREE.Shape();
  shape.moveTo(-hw + cutSize, hh);
  shape.lineTo(hw - cutSize, hh);
  shape.lineTo(hw, hh - cutSize);
  shape.lineTo(hw, -hh + cutSize);
  shape.lineTo(hw - cutSize, -hh);
  shape.lineTo(-hw + cutSize, -hh);
  shape.lineTo(-hw, -hh + cutSize);
  shape.lineTo(-hw, hh - cutSize);
  shape.lineTo(-hw + cutSize, hh);

  const innerHw = hw - thickness;
  const innerHh = hh - thickness;
  const innerCut = cutSize - thickness * 0.4;
  const hole = new THREE.Path();
  hole.moveTo(-innerHw + innerCut, innerHh);
  hole.lineTo(innerHw - innerCut, innerHh);
  hole.lineTo(innerHw, innerHh - innerCut);
  hole.lineTo(innerHw, -innerHh + innerCut);
  hole.lineTo(innerHw - innerCut, -innerHh);
  hole.lineTo(-innerHw + innerCut, -innerHh);
  hole.lineTo(-innerHw, -innerHh + innerCut);
  hole.lineTo(-innerHw, innerHh - innerCut);
  hole.lineTo(-innerHw + innerCut, innerHh);
  shape.holes.push(hole);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.02,
    bevelSegments: 3,
    curveSegments: 12,
  });
  geo.translate(0, 0, -thickness / 2);
  return geo;
}

const panelCrtVert = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const panelCrtFrag = /* glsl */ `
  uniform sampler2D map;
  uniform float time;
  uniform float powerOn; // 0=off, 0..1=booting, 1=fully on
  varying vec2 vUv;
  void main() {
    // Still off — fully transparent
    if (powerOn <= 0.0) {
      gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
      return;
    }

    // Flicker pattern: ON/OFF/ON/OFF/ON
    // t<0.3: ON, 0.3–0.6: OFF, 0.6–0.8: ON, 0.8–1.0: OFF, >=1.0: ON
    float t = powerOn;
    bool visible = (t < 0.3) || (t >= 0.6 && t < 0.8) || (t >= 1.0);
    if (!visible) {
      gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
      return;
    }

    // Chromatic aberration — RGB channel offset
    float aberration = 0.004;
    float r = texture2D(map, vUv + vec2(aberration, 0.0)).r;
    float g = texture2D(map, vUv).g;
    float b = texture2D(map, vUv - vec2(aberration, 0.0)).b;
    vec3 col = vec3(r, g, b);

    // CRT scanlines
    float scanline = sin(vUv.y * 800.0 - time * 10.0) * 0.08;
    col -= scanline;

    // Horizontal interference bands
    float interference = sin(vUv.y * 200.0 + time * 3.0) * 0.02;
    col += interference;

    // Radial vignette
    float edgeDist = distance(vUv, vec2(0.5));
    col *= smoothstep(0.8, 0.2, edgeDist);

    // Corner darkening
    col *= 1.0 - pow(edgeDist * 1.4, 2.5);

    // Sci-fi tint
    col *= vec3(0.92, 1.0, 1.05);

    gl_FragColor = vec4(col, 1.0);
  }
`;

// Glow plane behind neon frames (fake bloom)
const panelGlowVert = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const panelGlowFrag = /* glsl */ `
  uniform vec3 glowColor;
  uniform float intensity;
  uniform vec2 frameHalf;      // (halfW, halfH) in world units
  uniform float chamferThresh; // halfW + halfH - cutSize
  uniform vec2 glowHalf;       // glow plane half-size in world units
  varying vec2 vUv;
  void main() {
    // World-proportional coords (preserves aspect ratio)
    vec2 p = (vUv - 0.5) * glowHalf * 2.0;
    vec2 ap = abs(p);
    // Box SDF
    vec2 d = ap - frameHalf;
    float boxSD = length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
    // Chamfer plane SDF — 45° corner cuts in world space
    float chamferSD = (ap.x + ap.y - chamferThresh) * 0.7071;
    // Chamfered box = intersection of box + chamfer planes
    float sd = max(boxSD, chamferSD);
    // Glow peaks at edge, steep inward, gentle outward (tighter halo)
    float falloff = sd < 0.0 ? 40.0 : 10.0;
    float glow = exp(-abs(sd) * falloff) * intensity;
    gl_FragColor = vec4(glowColor * glow, glow);
  }
`;

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
uniform float uBrightness;
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
    fragColor = vec4(texture(iChannel0, texCoord).rgb * uBrightness, 1.0);
    return;
  }
  if (progress >= 1.0) {
    fragColor = vec4(texture(iChannel1, texCoord).rgb * uBrightness, 1.0);
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

  fragColor = vec4((color / total) * uBrightness, 1.0);
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

// Frustum detection temporaries (reused every frame)
const _frustum = new THREE.Frustum();
const _projScreenMat = new THREE.Matrix4();
const _tmpPos = new THREE.Vector3();
const POWER_ON_DURATION = 0.15; // seconds for CRT boot animation

// ============ All-in-One Renderer ============

function Renderer({ showPath }: { showPath: boolean }) {
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
    flyScene.background = skyboxCube;
    flyScene.backgroundIntensity = 2.5;
    flyScene.environment = skyboxCube;
    flyScene.environmentIntensity = 1.5;
    flyScene.add(new THREE.AmbientLight(0xffffff, 0.3));
    const dir1 = new THREE.DirectionalLight(0xffffff, 1.5);
    dir1.position.set(50, 50, 50);
    flyScene.add(dir1);
    const dir2 = new THREE.DirectionalLight(0x4488ff, 0.5);
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
        uBrightness: { value: 1.0 },
        iChannel0: { value: flyFBO.texture },
        iChannel1: { value: hackerImgFBO.texture },
      },
      vertexShader: fullscreenVert,
      fragmentShader: compositorFrag,
    });
    const compositorScene = new THREE.Scene();
    compositorScene.add(new THREE.Mesh(fsGeo, compositorMat));

    // ---- Card display scene ----
    const cardFBO = new THREE.WebGLRenderTarget(w, h, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
    });

    const cardScene = new THREE.Scene();
    cardScene.background = panoTexture;
    cardScene.environment = panoTexture;
    cardScene.backgroundRotation = new THREE.Euler(0, Math.PI, 0);
    cardScene.environmentRotation = new THREE.Euler(0, Math.PI, 0);

    cardScene.add(new THREE.AmbientLight(0xffffff, 1.0));
    const cardSpot = new THREE.SpotLight(0xffffff, 3, 0, 0.4, 1);
    cardSpot.position.set(5, 8, 5);
    cardScene.add(cardSpot);
    const cardBluePoint = new THREE.PointLight(0x3db5e6, 1.5);
    cardBluePoint.position.set(-5, -3, -5);
    cardScene.add(cardBluePoint);
    const cardWhitePoint = new THREE.PointLight(0xffffff, 1.0);
    cardWhitePoint.position.set(5, 3, 5);
    cardScene.add(cardWhitePoint);

    const cardGeo = new THREE.PlaneGeometry(CARD_WIDTH, CARD_HEIGHT);
    const cardMeshMat = new THREE.MeshPhysicalMaterial({
      map: cardTexture,
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
    cardScene.add(new THREE.Mesh(cardGeo, cardMeshMat));

    // ---- Neon video panels flanking the card ----
    const neonFrameGeo = buildNeonFrameGeometry(
      PANEL_FRAME_W, PANEL_FRAME_H, PANEL_FRAME_THICKNESS, PANEL_FRAME_CUT
    );
    const videoPlaneGeo = new THREE.PlaneGeometry(PANEL_VIDEO_W, PANEL_VIDEO_H, 1, 1);
    // Glow plane: 60% larger than frame so the bloom halo extends well beyond
    const glowPlaneGeo = new THREE.PlaneGeometry(
      PANEL_FRAME_W * 1.6, PANEL_FRAME_H * 1.6, 1, 1
    );

    // 1×1 black placeholder — videos are attached later via useEffect
    const placeholderTex = new THREE.DataTexture(
      new Uint8Array([0, 0, 0, 255]), 1, 1, THREE.RGBAFormat
    );
    placeholderTex.needsUpdate = true;

    const neonMaterials: THREE.MeshStandardMaterial[] = [];
    const crtMaterials: THREE.ShaderMaterial[] = [];
    const glowMaterials: THREE.ShaderMaterial[] = [];

    NEON_PANELS.forEach((cfg) => {
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

      const neonColor = new THREE.Color(cfg.color);

      // Neon frame — boosted emissive, color-matched surface
      const neonMat = new THREE.MeshStandardMaterial({
        color: neonColor,
        emissive: neonColor,
        emissiveIntensity: 5.0,
        roughness: 0.15,
        metalness: 0.9,
        toneMapped: false,
      });
      neonMaterials.push(neonMat);

      // Glow halo plane (fake bloom) — additive blending behind frame
      const glowMat = new THREE.ShaderMaterial({
        vertexShader: panelGlowVert,
        fragmentShader: panelGlowFrag,
        uniforms: {
          glowColor: { value: neonColor },
          intensity: { value: 1.2 },
          frameHalf: { value: new THREE.Vector2(PANEL_FRAME_W / 2, PANEL_FRAME_H / 2) },
          chamferThresh: { value: PANEL_FRAME_W / 2 + PANEL_FRAME_H / 2 - PANEL_FRAME_CUT },
          glowHalf: { value: new THREE.Vector2(PANEL_FRAME_W * 1.6 / 2, PANEL_FRAME_H * 1.6 / 2) },
        },
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      });
      glowMaterials.push(glowMat);

      const group = new THREE.Group();
      group.position.set(...cfg.pos);
      group.rotation.set(...cfg.rot);

      // Glow plane sits behind neon frame
      const glowMesh = new THREE.Mesh(glowPlaneGeo, glowMat);
      glowMesh.position.z = -0.06;
      group.add(glowMesh);
      group.add(new THREE.Mesh(neonFrameGeo, neonMat));
      group.add(new THREE.Mesh(videoPlaneGeo, crtMat));

      cardScene.add(group);
    });

    // Pre-compute world positions for frustum checks
    const panelPositions = NEON_PANELS.map(
      (cfg) => new THREE.Vector3(...cfg.pos)
    );

    const cardCam = new THREE.PerspectiveCamera(
      40, size.width / size.height, 0.1, 100
    );
    const diagPosCurve = new THREE.CatmullRomCurve3(
      DIAG_POSITIONS, false, 'catmullrom', 0.35
    );
    const diagLookCurve = new THREE.CatmullRomCurve3(
      DIAG_LOOK_ATS, false, 'catmullrom', 0.35
    );

    return {
      flyFBO,
      hackerBufFBO,
      hackerImgFBO,
      cardFBO,
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
      cardScene,
      cardCam,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fontTexture, cardTexture, panoTexture, skyboxCube]);

  const tRef = useRef(0);
  const warmupRef = useRef(false);
  const panelStatesRef = useRef(
    NEON_PANELS.map(() => ({ seen: false, startTime: -1 }))
  );
  const prevNeedsCardRef = useRef(false);

  // Handle resize
  useEffect(() => {
    const d = gl.getPixelRatio();
    const w = Math.floor(size.width * d);
    const h = Math.floor(size.height * d);
    res.flyFBO.setSize(w, h);
    res.hackerBufFBO.setSize(w, h);
    res.hackerImgFBO.setSize(w, h);
    res.cardFBO.setSize(w, h);
    res.hackerBufMat.uniforms.iResolution.value.set(w, h);
    res.hackerImgMat.uniforms.iResolution.value.set(w, h);
    res.compositorMat.uniforms.iResolution.value.set(w, h);
    res.cardCam.aspect = size.width / size.height;
    res.cardCam.updateProjectionMatrix();
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
      res.cardFBO.dispose();
      res.hackerBufMat.dispose();
      res.hackerImgMat.dispose();
      res.compositorMat.dispose();
      res.cardMeshMat.dispose();
      // Neon panel resources (videos cleaned up by their own useEffect)
      res.neonFrameGeo.dispose();
      res.videoPlaneGeo.dispose();
      res.glowPlaneGeo.dispose();
      res.placeholderTex.dispose();
      res.neonMaterials.forEach((m) => m.dispose());
      res.crtMaterials.forEach((m) => m.dispose());
      res.glowMaterials.forEach((m) => m.dispose());
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
        res.crtMaterials[i].uniforms.map.value = vTex;
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

      // Start loading
      video.src = cfg.video;
    });

    // Resume paused videos when tab becomes visible again
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
      // Reset CRT materials back to placeholder
      res.crtMaterials.forEach((m) => {
        m.uniforms.map.value = res.placeholderTex;
      });
    };
  }, [res]);

  // ---- Render loop (priority 1 → disables R3F auto-render) ----
  useFrame((state, delta) => {
    const time = state.clock.elapsedTime;
    const loopTime = time % LOOP_DURATION;

    // Warm-up: render card scene once on first frame to compile shaders & upload textures
    if (!warmupRef.current) {
      warmupRef.current = true;
      res.cardCam.position.copy(res.diagPosCurve.getPointAt(0));
      res.cardCam.lookAt(res.diagLookCurve.getPointAt(0));
      gl.setRenderTarget(res.cardFBO);
      gl.render(res.cardScene, res.cardCam);
    }

    // Advance fly-through camera along spline (always)
    tRef.current = (tRef.current + delta * SPEED) % 1;
    const { position, lookAt } = res.flyCam.evaluate(tRef.current);
    camera.position.copy(position);
    camera.lookAt(lookAt);
    res.pointLight.position.copy(position);

    // Determine which scenes are visible and compositor inputs
    let needsFly = false;
    let needsHacker = false;
    let needsCard = false;
    let ch0 = res.flyFBO.texture;
    let ch1 = res.flyFBO.texture;
    let prog = 0;
    let brightness = 1.0;
    const CARD_BRIGHTNESS = 1.4;

    if (loopTime < PHASE_A_END) {
      // Pure fly-through
      needsFly = true;
      ch0 = res.flyFBO.texture;
    } else if (loopTime < PHASE_B_END) {
      // Transition fly → hacker
      needsFly = true;
      needsHacker = true;
      ch0 = res.flyFBO.texture;
      ch1 = res.hackerImgFBO.texture;
      prog = smoothstep01((loopTime - PHASE_A_END) / (PHASE_B_END - PHASE_A_END));
    } else if (loopTime < PHASE_C_END) {
      // Pure hacker
      needsHacker = true;
      ch0 = res.hackerImgFBO.texture;
    } else if (loopTime < PHASE_D_END) {
      // Transition hacker → card — ramp brightness up with transition
      needsHacker = true;
      needsCard = true;
      ch0 = res.hackerImgFBO.texture;
      ch1 = res.cardFBO.texture;
      prog = smoothstep01((loopTime - PHASE_C_END) / (PHASE_D_END - PHASE_C_END));
      brightness = 1.0 + (CARD_BRIGHTNESS - 1.0) * prog;
    } else if (loopTime < PHASE_E_END) {
      // Pure card (DIAGONAL playing)
      needsCard = true;
      ch0 = res.cardFBO.texture;
      brightness = CARD_BRIGHTNESS;
    } else if (loopTime < PHASE_F_END) {
      // Transition card → fly — ramp brightness back down
      needsCard = true;
      needsFly = true;
      ch0 = res.cardFBO.texture;
      ch1 = res.flyFBO.texture;
      prog = smoothstep01((loopTime - PHASE_E_END) / (PHASE_F_END - PHASE_E_END));
      brightness = CARD_BRIGHTNESS - (CARD_BRIGHTNESS - 1.0) * prog;
    } else {
      // Pure fly-through
      needsFly = true;
      ch0 = res.flyFBO.texture;
    }

    // 1. Render fly-through scene
    if (needsFly) {
      gl.setRenderTarget(res.flyFBO);
      gl.render(res.flyScene, camera);
    }

    // 2. Render hacker passes
    if (needsHacker) {
      res.hackerBufMat.uniforms.iTime.value = time;
      gl.setRenderTarget(res.hackerBufFBO);
      gl.render(res.hackerBufScene, res.orthoCam);

      res.hackerImgMat.uniforms.iTime.value = time;
      gl.setRenderTarget(res.hackerImgFBO);
      gl.render(res.hackerImgScene, res.orthoCam);
    }

    // 3. Render card scene with DIAGONAL camera
    if (needsCard) {
      const diagStart = PHASE_C_END + (PHASE_D_END - PHASE_C_END) * 0.4;
      const cardT = Math.max(0, Math.min(1,
        (loopTime - diagStart) / DIAGONAL_DURATION
      ));
      const cardEased = smoothstep01(cardT);
      res.cardCam.position.copy(res.diagPosCurve.getPointAt(cardEased));
      const lookTarget = res.diagLookCurve.getPointAt(cardEased);
      res.cardCam.lookAt(lookTarget);

      // Frustum detection + CRT power-on animation
      const neonTime = state.clock.getElapsedTime();
      res.cardCam.updateMatrixWorld();
      _projScreenMat.multiplyMatrices(
        res.cardCam.projectionMatrix,
        res.cardCam.matrixWorldInverse
      );
      _frustum.setFromProjectionMatrix(_projScreenMat);

      const states = panelStatesRef.current;
      for (let i = 0; i < res.crtMaterials.length; i++) {
        _tmpPos.copy(res.panelPositions[i]);
        const inView = _frustum.containsPoint(_tmpPos);

        if (inView && !states[i].seen) {
          states[i].seen = true;
          states[i].startTime = neonTime;
        }

        let powerOn = 0;
        if (states[i].seen) {
          const elapsed = neonTime - states[i].startTime;
          powerOn = Math.min(1, elapsed / POWER_ON_DURATION);
        }

        res.crtMaterials[i].uniforms.powerOn.value = powerOn;
        res.crtMaterials[i].uniforms.time.value = neonTime;
      }

      gl.setRenderTarget(res.cardFBO);
      gl.render(res.cardScene, res.cardCam);
    }

    // Reset panel power-on states when leaving card phase
    if (prevNeedsCardRef.current && !needsCard) {
      const states = panelStatesRef.current;
      for (let i = 0; i < states.length; i++) {
        states[i].seen = false;
        states[i].startTime = -1;
      }
      for (let i = 0; i < res.crtMaterials.length; i++) {
        res.crtMaterials[i].uniforms.powerOn.value = 0;
      }
    }
    prevNeedsCardRef.current = needsCard;

    // 4. Compositor to screen
    res.compositorMat.uniforms.iChannel0.value = ch0;
    res.compositorMat.uniforms.iChannel1.value = ch1;
    res.compositorMat.uniforms.uProgress.value = prog;
    res.compositorMat.uniforms.uBrightness.value = brightness;
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
