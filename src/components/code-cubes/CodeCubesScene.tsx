'use client';

import { Suspense, useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { useWebGLRecovery } from '@/hooks/useWebGLRecovery';

// ============ GLSL Shader Code ============

const fullscreenVert = /* glsl */ `in vec3 position;
void main() {
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

// Buffer A: text rendering using codepage12.png font atlas
const bufferAFrag = /* glsl */ `precision highp float;

uniform float iTime;
uniform vec2 iResolution;
uniform vec4 iMouse;
uniform sampler2D iChannel0;

#define RET(a) uv.y += 1.0; uv.x += a * 0.45
#define SPC uv.x -= 0.45
#define CHR(x) g += char_fn(uv, x); SPC

float char_fn(vec2 p, int c) {
  if (p.x < 0.0 || p.x > 1.0 || p.y < 0.0 || p.y > 1.0)
    return 0.0;
  vec2 ddx = dFdx(p / 16.0), ddy = dFdy(p / 16.0);
  return textureGrad(iChannel0, p / 16.0 + fract(vec2(c, 15 - c / 16) / 16.), ddx, ddy).r;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = fragCoord / iResolution.xy;
  uv.y -= 1.0;
  uv *= 16.0;
  uv.y += 1.0;

  float g = 0.0;
  CHR(47); CHR(47); SPC; CHR(70); CHR(114); CHR(111); CHR(109); SPC; CHR(68); CHR(101); CHR(97); CHR(110); CHR(84); CHR(104); CHR(101); CHR(67); CHR(111); CHR(100); CHR(101); CHR(114); CHR(46);
  RET(21.0);
  CHR(119); CHR(104); CHR(105); CHR(108); CHR(101); SPC; CHR(40); CHR(49); CHR(41);
  RET(9.0);
  CHR(123);
  RET(1.0); SPC; SPC; CHR(99); CHR(111); CHR(117); CHR(116); SPC; CHR(60); CHR(60); SPC; CHR(34); CHR(89); CHR(111); SPC; CHR(70); CHR(108); CHR(111); CHR(112); CHR(105); CHR(110); CHR(101); CHR(33); CHR(92); CHR(110); CHR(34); CHR(59);
  RET(26.0); SPC; SPC; CHR(105); CHR(110); CHR(105); CHR(116); CHR(95); CHR(69); CHR(118); CHR(118); CHR(118); CHR(118); CHR(105); CHR(108); CHR(40); CHR(34); CHR(66); CHR(114); CHR(111); CHR(115); CHR(107); CHR(105); CHR(34); CHR(41); CHR(59);
  RET(25.0); SPC; SPC; CHR(97); CHR(112); CHR(112); CHR(108); CHR(121); CHR(73); CHR(81); CHR(66); CHR(114); CHR(97); CHR(105); CHR(110); CHR(115); CHR(40); CHR(41); CHR(59);
  RET(18.0);
  SPC; SPC; CHR(65); CHR(114); CHR(116); CHR(79); CHR(102); CHR(67); CHR(111); CHR(100); CHR(101); SPC; CHR(43); CHR(61); SPC; CHR(66); CHR(105); CHR(103); CHR(87); CHR(105); CHR(110); CHR(103); CHR(115); CHR(59);
  RET(24.0);
  CHR(125);
  RET(1.0);
  RET(0.0);
  CHR(118); CHR(111); CHR(105); CHR(100); SPC; CHR(72); CHR(97); CHR(99); CHR(107); CHR(84); CHR(104); CHR(101); CHR(80); CHR(108); CHR(97); CHR(110); CHR(101); CHR(116); CHR(40); CHR(41); SPC; CHR(123);
  RET(22.0);
  SPC; SPC; CHR(47); CHR(47); SPC; CHR(84); CHR(79); CHR(68); CHR(79); SPC; CHR(45); SPC; CHR(87); CHR(97); CHR(116); CHR(99); CHR(104); SPC; CHR(72); CHR(97); CHR(99); CHR(107); CHR(101); CHR(114); CHR(115); CHR(46);
  RET(26.0);
  SPC; SPC; CHR(114); CHR(101); CHR(116); CHR(117); CHR(114); CHR(110); CHR(59);
  RET(9.0);
  CHR(125);

  vec3 col = vec3(g);
  fragColor = vec4(col, 1.0);
}

out vec4 outColor;
void main() {
  vec4 fragColor;
  mainImage(fragColor, gl_FragCoord.xy);
  outColor = fragColor;
}`;

// Image: raymarched 3D tower scene, reads bufferA as text texture
const imageFrag = /* glsl */ `precision highp float;

uniform float iTime;
uniform vec2 iResolution;
uniform vec4 iMouse;
uniform sampler2D iChannel0;

float time = 0.0;

float hash(float p) {
  return fract(sin(dot(p, 123.45)) * 5432.3);
}

mat2 rot(float a) {
  float c = cos(a);
  float s = sin(a);
  return mat2(c, s, -s, c);
}

float sdBox(vec3 p, vec3 b) {
  vec3 q = abs(p) - b;
  return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}

float sdLine(vec3 p, vec3 a, vec3 b) {
  vec3 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h);
}

float sdBolt(vec3 p, vec3 a, vec3 b, float id) {
  float d = 1e7;
  vec3 dp = (b - a) / 5.0;
  for (float i = 0.0; i < 5.0; i++) {
    float t = i + floor((time + id) * 2.0);
    d = min(d, sdLine(p, a + vec3(0.0, hash(t), 0.0), a + dp + vec3(0.0, hash(t + 1.0), 0.0)));
    a += dp;
  }
  return d;
}

float sdFramedBox(vec3 p, vec3 b) {
  p = abs(p) - b;
  vec3 q = abs(p);
  return min(min(
    length(max(vec3(p.x, q.y, q.z), 0.0)) + min(max(p.x, max(q.y, q.z)), 0.0),
    length(max(vec3(q.x, p.y, q.z), 0.0)) + min(max(q.x, max(p.y, q.z)), 0.0)),
    length(max(vec3(q.x, q.y, p.z), 0.0)) + min(max(q.x, max(q.y, p.z)), 0.0));
}

vec3 getRayDir(vec3 ro, vec3 lookAt, vec2 uv) {
  vec3 forward = normalize(lookAt - ro);
  vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), forward));
  vec3 up = cross(forward, right);
  return normalize(forward + right * uv.x + up * uv.y);
}

vec4 minD(vec4 a, vec4 b) {
  return a.x < b.x ? a : b;
}

const vec3 s = vec3(2.0, 6.0, 2.0);
vec2 sdTower(vec3 p) {
  p.y -= s.y;

  float outline = sdFramedBox(p, s);
  float glow = 0.001 / (0.001 + outline * outline);

  float d = sdBox(p + vec3(0.0, s.y, 0.0), vec3(s.x, 0.01, s.z));
  glow += 0.001 / (0.001 + d * d);

  d = sdBox(p, s);
  if (d > 0.0 && d < 0.075) {
    glow += 0.03;
    vec2 uv = (p.xy + s.xy) / (2.0 * s.xy);
    uv.x *= 0.8;
    uv.y = mod(uv.y * 1.6 - 0.5, 1.0);
    glow += texture(iChannel0, uv).r;
  }

  return vec2(d, glow);
}

void applyTowerGap(inout vec3 p) {
  p.z = mod(p.z, 9.0) - 4.5;
}

float bolt(vec3 p, float id) {
  float t = fract(time * 0.04 * hash(id) + id);
  if (id > 12.5) t = 1.0 - t;
  float h = mix(-50.0, s.y * 1.95, t);

  vec3 a = vec3(s.x, h, -s.z);
  vec3 b = vec3(s.x, h, s.z);

  if (hash(id) > 0.5) {
    a.x = -a.x;
    b.x = -b.x;
  }

  return sdBolt(p, a, b, id);
}

vec4 sdTowers(vec3 p) {
  float id = hash(floor(p.z / 9.0)) * 25.0;
  p.x = mod(p.x, 12.0) - 6.0;
  applyTowerGap(p);

  float boltD = bolt(p, id);
  float boltGlow = step(0.0, p.y) * 0.01 / (0.01 + boltD * boltD);

  return vec4(sdTower(p), 0.0, boltGlow);
}

vec3 sdFloor(vec3 p) {
  if (p.y > 3.0) {
    return vec3(1e10, 0.0, 0.0);
  }

  vec3 pp = p;
  applyTowerGap(p);

  p.x = abs(p.x + 1.6) - 0.4;
  p.z -= 4.5;

  const vec2 wh = vec2(0.1, 0.01);
  float d = sdBox(p, vec3(wh, 1e10));
  d = min(d, sdBox(p.zyx - vec3(0.0, 0.0, 100.0), vec3(wh, 100.0)));

  if (pp.x > 0.0) {
    d = min(d, sdBox(p - vec3(2.0, 0.0, 0.0), vec3(wh, 3.0)));
    d = min(d, sdBox(p - vec3(4.0, 0.0, -6.0), vec3(wh, 3.0)));
    d = min(d, sdBox(p - vec3(3.0, 0.0, -3.0), vec3(wh, 1.1).zyx));
  } else {
    d = min(d, sdBox(p - vec3(2.5, 0.0, -8.0), vec3(wh, 1.5)));
  }

  float glow = 0.001 / (0.001 + d * d);
  float t = time * 10.0;

  float pulse1 = sin((pp.z + t) * 0.02);
  float pulse2 = sin((pp.z + t) * 0.02 - 0.6);
  float pulse = step(0.999, pow(0.5 + 0.5 * max(pulse1, pulse2), 10.0));
  return vec3(d, glow - pulse, sqrt(glow) * pulse * 3.0);
}

vec4 map(vec3 p) {
  return minD(sdTowers(p), vec4(sdFloor(p), 0.0));
}

vec3 calcNormal(in vec3 p) {
  vec2 e = vec2(1.0, -1.0) * 0.5773 * 0.0005;
  return normalize(e.xyy * map(p + e.xyy).x +
           e.yyx * map(p + e.yyx).x +
           e.yxy * map(p + e.yxy).x +
           e.xxx * map(p + e.xxx).x);
}

vec3 vignette(vec3 col, vec2 fragCoord) {
  vec2 q = fragCoord.xy / iResolution.xy;
  col *= 0.5 + 0.5 * pow(16.0 * q.x * q.y * (1.0 - q.x) * (1.0 - q.y), 0.4);
  return col;
}

void initCamera(out vec3 ro, out vec3 rd, vec2 uv) {
  vec3 lookat;
  float intro = time / 32.0;

  ro = vec3(2.0 * sin(time * 0.05), 1.5 + 11.0 * smoothstep(0.0, 1.0, (0.5 + 0.5 * cos(time * 0.05))), time - 32.0 + 6.4);
  lookat = ro + vec3(-smoothstep(-2.0, 2.0, ro.x) * 0.5, -sin(time * 0.06) * 0.4, 2.0);
  if (intro < 1.2) {
    vec3 intro_ro = vec3(-6.0 * (1.0 - intro), 11.5 - time / 32.0, 6.7);
    vec3 intro_lookat = intro_ro + vec3(0.0, -0.5, 1.0);
    {
      float trans = clamp((intro - 1.0) * 5.0, 0.0, 1.0);
      ro = mix(intro_ro, ro, trans);
      lookat = mix(intro_lookat, lookat, trans);
    }
  }

  rd = getRayDir(ro, lookat, uv);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
  time = iTime * 8.0;

  vec3 ro, rd;
  initCamera(ro, rd, uv);

  vec3 col = vec3(0.3, 0.1, 0.4) * max(0.0, rd.y * 0.2);

  const float maxDist = 100.0;
  float d = 0.0;
  float alpha = 1.0;
  for (float steps = 0.0; steps < 80.0; steps++) {
    vec3 p = ro + rd * d;
    vec4 h = map(p);

    if (abs(h.x) < 0.005) {
      h.x = 0.1;
      alpha *= 0.2;
    }

    if (d >= maxDist)
      break;
    if (p.y < -0.5)
      break;

    float fog = pow(1.0 - d / maxDist, 3.0);
    vec3 whiteGlow = vec3(0.5, 0.6, 1.0);
    vec3 rgb = whiteGlow * max(0.0, (h.y - h.z)) + vec3(1.0, 0.4, 0.02) * h.z;
    rgb += whiteGlow * max(0.0, (h.y - h.w)) + vec3(0.2, 0.3, 1.0) * h.w;
    col += rgb * fog * alpha;

    d += abs(h.x);
  }

  col = pow(col, vec3(0.4545));
  col = vignette(col, fragCoord);
  fragColor = vec4(col, 1.0);
}

out vec4 outColor;
void main() {
  vec4 fragColor;
  mainImage(fragColor, gl_FragCoord.xy);
  outColor = fragColor;
}`;

// ============ React Components ============

function CodeCubesEffect() {
  const { gl, size } = useThree();
  const fontTexture = useTexture('/codepage12.png');
  const mouse = useRef(new THREE.Vector4(0, 0, 0, 0));

  // Configure font texture for mipmaps (needed by textureGrad)
  useMemo(() => {
    fontTexture.minFilter = THREE.LinearMipMapLinearFilter;
    fontTexture.magFilter = THREE.LinearFilter;
    fontTexture.generateMipmaps = true;
    fontTexture.wrapS = THREE.ClampToEdgeWrapping;
    fontTexture.wrapT = THREE.ClampToEdgeWrapping;
    fontTexture.needsUpdate = true;
  }, [fontTexture]);

  const dpr = gl.getPixelRatio();
  const pixelWidth = Math.floor(size.width * dpr);
  const pixelHeight = Math.floor(size.height * dpr);

  // Render target for Buffer A output
  const bufferATarget = useMemo(() => {
    return new THREE.WebGLRenderTarget(pixelWidth, pixelHeight, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      type: THREE.HalfFloatType,
      format: THREE.RGBAFormat,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Buffer A offscreen scene
  const { bufferAScene, bufferACamera, bufferAMaterial } = useMemo(() => {
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const material = new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: {
        iTime: { value: 0 },
        iResolution: { value: new THREE.Vector2(pixelWidth, pixelHeight) },
        iMouse: { value: new THREE.Vector4(0, 0, 0, 0) },
        iChannel0: { value: fontTexture },
      },
      vertexShader: fullscreenVert,
      fragmentShader: bufferAFrag,
    });
    const scene = new THREE.Scene();
    scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material));
    return { bufferAScene: scene, bufferACamera: camera, bufferAMaterial: material };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fontTexture]);

  // Image shader material (rendered by R3F on the fullscreen mesh)
  const imageMaterial = useMemo(() => {
    return new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: {
        iTime: { value: 0 },
        iResolution: { value: new THREE.Vector2(pixelWidth, pixelHeight) },
        iMouse: { value: new THREE.Vector4(0, 0, 0, 0) },
        iChannel0: { value: bufferATarget.texture },
      },
      vertexShader: fullscreenVert,
      fragmentShader: imageFrag,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bufferATarget]);

  // Handle resize
  useEffect(() => {
    const d = gl.getPixelRatio();
    const w = Math.floor(size.width * d);
    const h = Math.floor(size.height * d);
    bufferATarget.setSize(w, h);
    bufferAMaterial.uniforms.iResolution.value.set(w, h);
    imageMaterial.uniforms.iResolution.value.set(w, h);
  }, [size, gl, bufferATarget, bufferAMaterial, imageMaterial]);

  // Mouse tracking
  useEffect(() => {
    const d = gl.getPixelRatio();
    const handleMouseMove = (e: MouseEvent) => {
      mouse.current.x = e.clientX * d;
      mouse.current.y = (size.height - e.clientY) * d;
    };
    const handleMouseDown = (e: MouseEvent) => {
      mouse.current.set(
        e.clientX * d,
        (size.height - e.clientY) * d,
        e.clientX * d,
        (size.height - e.clientY) * d
      );
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
    };
  }, [size, gl]);

  // Cleanup
  useEffect(() => {
    return () => {
      bufferATarget.dispose();
      bufferAMaterial.dispose();
      imageMaterial.dispose();
    };
  }, [bufferATarget, bufferAMaterial, imageMaterial]);

  // Render loop
  useFrame((state) => {
    const time = state.clock.elapsedTime;

    // Update Buffer A uniforms & render to FBO
    bufferAMaterial.uniforms.iTime.value = time;
    bufferAMaterial.uniforms.iMouse.value.copy(mouse.current);
    gl.setRenderTarget(bufferATarget);
    gl.render(bufferAScene, bufferACamera);
    gl.setRenderTarget(null);

    // Update Image uniforms (R3F auto-renders the mesh below)
    imageMaterial.uniforms.iTime.value = time;
    imageMaterial.uniforms.iMouse.value.copy(mouse.current);
  });

  return (
    <mesh frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <primitive object={imageMaterial} attach="material" />
    </mesh>
  );
}

export default function CodeCubesScene() {
  const { contextLost, canvasKey, handleCreated } = useWebGLRecovery('CodeCubes');

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
        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4" />
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
            <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="font-medium">Loading Shader...</p>
          </div>
        }
      >
        <Canvas
          key={canvasKey}
          style={{ height: '100%', width: '100%', display: 'block' }}
          gl={{ antialias: false, alpha: false }}
          frameloop="always"
          dpr={[1, 2]}
          onCreated={handleCreated}
        >
          <CodeCubesEffect />
        </Canvas>
      </Suspense>
    </div>
  );
}
