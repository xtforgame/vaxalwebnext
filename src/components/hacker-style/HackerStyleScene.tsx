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

const imageFrag = /* glsl */ `precision highp float;

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

// ============ React Components ============

function HackerEffect() {
  const { gl, size } = useThree();
  const fontTexture = useTexture('/codepage12.png');
  const mouse = useRef(new THREE.Vector4(0, 0, 0, 0));

  // Configure font texture for mipmaps (needed by textureLod / textureGrad)
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

  // Mouse tracking (Shadertoy convention: .xy = current pos, .zw = click pos)
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

export default function HackerStyleScene() {
  const { contextLost, canvasKey, handleCreated } = useWebGLRecovery('HackerStyle');

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
        <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mb-4" />
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
            <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mb-4" />
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
          <HackerEffect />
        </Canvas>
      </Suspense>
    </div>
  );
}
