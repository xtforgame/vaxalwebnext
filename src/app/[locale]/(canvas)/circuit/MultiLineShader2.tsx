'use client';

import { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

/* ── shared vertex shader ── */
const vs = /* glsl */ `
void main() {
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

/* ── common GLSL ── */
const common = /* glsl */ `
const float br = 0.7;

vec3 hash33(vec3 p3) {
  p3 = fract(p3 * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yxz + 33.33);
  return fract((p3.xxy + p3.yxx) * p3.zyx);
}

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
`;

/* ── Buffer A: particle direction / life / branching ── */
const fsBufferA = /* glsl */ `
uniform vec2 iResolution;
uniform int iFrame;
uniform sampler2D iChannel0; // self (prev)
` + common + /* glsl */ `

const float psr  = 1e-6;
const float lr   = 0.99;
const float blrd = 0.00;
const float lbt  = 0.1;
const float pi   = 3.14159;
const float o    = -1.0;
const float sp   = 1e-4;

#define BRANCH 1
#define ONLY_BRANCH_BG_TRAILS 0

mat2 rot(float t) {
  return mat2(cos(t), sin(t), -sin(t), cos(t));
}

void main() {
  vec2 fragCoord = gl_FragCoord.xy;
  vec2 r = iResolution;
  vec2 uv = fragCoord / r;

  vec3 h = hash33(vec3(fragCoord, 1.0));
  vec4 c;
  vec4 p = texture2D(iChannel0, uv);

  if (iFrame < 10) {
    float angle = -0.3;
    p = vec4(0);
    vec2 axis = vec2(1.0);
    if (h.x < psr) {
      p.xy = floor(axis * rot(angle) + 0.5);
      p.z = 1.0;
      p.w = hash12(fragCoord);
    }
  } else {
    vec2 d = vec2(0);
    float ww = 0.0;
    int split = 0;

    for (int x = -1; x <= 1; ++x) {
      for (int y = -1; y <= 1; ++y) {
        vec4 n = texture2D(iChannel0, uv + vec2(float(x), float(y)) / r);
        if (n.xy == o * vec2(float(x), float(y))) {
          if (n.xy != vec2(0)) { d = n.xy; ww = n.w; }
        }
        if (n.xy == -1.0 * o * vec2(float(x), float(y)) && h.x < sp) {
          if (n.xy != vec2(0)) split += 1;
        }
      }
    }

    bool bbgt = ONLY_BRANCH_BG_TRAILS == 1 ? ww < br : true;

    // trail decay
    if (p.z > 0.0) {
      p.xy *= 0.0;
      p.z *= p.w < br ? lr : min(p.w, lr - blrd);
    }

    if (d != vec2(0)) {
      if (BRANCH == 1 && p.z > lbt && bbgt) {
        d = floor(d * rot(pi / (h.x < 0.5 ? 4.0 : -4.0)) + 0.5);
      }
      p.xy = d;
      p.z = 1.0;
      p.w = ww;
    }

    if (BRANCH == 1 && split == 1 && bbgt) {
      d = floor(d * rot(pi / (h.x < 1e-3 ? -4.0 : 4.0)) + 0.5);
      p.xy = d;
      p.z = 1.0;
    }
  }

  c = p;
  gl_FragColor = c;
}
`;

/* ── Buffer B: color mapping ── */
const fsBufferB = /* glsl */ `
uniform vec2 iResolution;
uniform sampler2D iChannel0; // bufferA
` + common + /* glsl */ `

const vec3 pc  = vec3(1.0);
const vec3 ctc = vec3(26.0, 21.0, 54.0) / 255.0;
const vec3 btc = vec3(0.0, 255.0, 242.0) / 255.0;
const vec3 bgc = vec3(7.0, 3.0, 33.0) / 255.0;
const float lum = 4.0;

#define INNER_RADIUS 0.5
#define OUTER_RADIUS 0.85
#define MIX_RATE 0.4

vec3 vig(vec2 uv) {
  vec2 center = vec2(0.5);
  float dist = 1.0 - distance(uv, center);
  float v = smoothstep(INNER_RADIUS, OUTER_RADIUS, dist);
  vec3 col = vec3(0.5);
  return mix(col, col * v, MIX_RATE);
}

vec3 dir_to_col(vec4 p, vec2 uv) {
  vec2 dir = p.xy;
  float life = p.z;
  float h = p.w;
  vec3 bg = bgc * vig(uv);
  vec3 result;

  if (vec3(dir, life) == vec3(0)) {
    result = bg;
  } else if (dir == vec2(0)) {
    vec3 tc = h < br ? ctc : btc * 2.0;
    result = mix(tc, bg, 1.0 - life);
  } else {
    result = pc;
  }

  return result * lum;
}

void main() {
  vec2 fragCoord = gl_FragCoord.xy;
  vec2 uv = fragCoord / iResolution;
  vec4 pmap = texture2D(iChannel0, uv);
  gl_FragColor = vec4(dir_to_col(pmap, uv), 1.0);
}
`;

/* ── Image: passthrough with 0.5px offset ── */
const fsImage = /* glsl */ `
uniform vec2 iResolution;
uniform sampler2D iChannel0; // bufferB

void main() {
  vec2 fragCoord = gl_FragCoord.xy;
  vec2 uv = (fragCoord + vec2(0.5)) / iResolution;
  gl_FragColor = texture2D(iChannel0, uv);
}
`;

/* ── helpers ── */
function createRT(w: number, h: number) {
  return new THREE.WebGLRenderTarget(w, h, {
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    format: THREE.RGBAFormat,
    type: THREE.FloatType,
  });
}

function createMaterial(fs: string, uniforms: Record<string, THREE.IUniform>) {
  return new THREE.ShaderMaterial({
    vertexShader: vs,
    fragmentShader: fs,
    uniforms,
    depthTest: false,
    depthWrite: false,
  });
}

/* ── Component ── */
export default function MultiLineShader2() {
  const { gl, size, viewport } = useThree();
  const frameRef = useRef(0);
  const flipRef = useRef(0);

  const w = Math.floor(size.width * viewport.dpr);
  const h = Math.floor(size.height * viewport.dpr);

  const { targetA, targetB, matA, matB, matImage, quadScene, quadCamera } = useMemo(() => {
    const tA = [createRT(w, h), createRT(w, h)];
    const tB = createRT(w, h); // B doesn't self-read, no ping-pong needed

    const mA = createMaterial(fsBufferA, {
      iResolution: { value: new THREE.Vector2(w, h) },
      iFrame: { value: 0 },
      iChannel0: { value: null },
    });

    const mB = createMaterial(fsBufferB, {
      iResolution: { value: new THREE.Vector2(w, h) },
      iChannel0: { value: null },
    });

    const mI = createMaterial(fsImage, {
      iResolution: { value: new THREE.Vector2(w, h) },
      iChannel0: { value: null },
    });

    const scene = new THREE.Scene();
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    mesh.frustumCulled = false;
    scene.add(mesh);
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    return { targetA: tA, targetB: tB, matA: mA, matB: mB, matImage: mI, quadScene: { scene, mesh }, quadCamera: camera };
  }, [w, h]);

  // cleanup
  useEffect(() => {
    frameRef.current = 0;
    flipRef.current = 0;
    return () => {
      targetA.forEach((t) => t.dispose());
      targetB.dispose();
      matA.dispose();
      matB.dispose();
      matImage.dispose();
    };
  }, [targetA, targetB, matA, matB, matImage]);

  useFrame(() => {
    const read = flipRef.current;
    const write = 1 - read;
    flipRef.current = write;

    const res = new THREE.Vector2(w, h);
    matA.uniforms.iResolution.value = res;
    matB.uniforms.iResolution.value = res;
    matImage.uniforms.iResolution.value = res;

    // ── Buffer A ──
    matA.uniforms.iFrame.value = frameRef.current;
    matA.uniforms.iChannel0.value = targetA[read].texture;
    quadScene.mesh.material = matA;
    gl.setRenderTarget(targetA[write]);
    gl.render(quadScene.scene, quadCamera);

    // ── Buffer B ──
    matB.uniforms.iChannel0.value = targetA[write].texture;
    quadScene.mesh.material = matB;
    gl.setRenderTarget(targetB);
    gl.render(quadScene.scene, quadCamera);

    // ── Image ──
    matImage.uniforms.iChannel0.value = targetB.texture;
    gl.setRenderTarget(null);

    frameRef.current++;
  });

  return (
    <mesh frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <primitive object={matImage} attach="material" />
    </mesh>
  );
}
