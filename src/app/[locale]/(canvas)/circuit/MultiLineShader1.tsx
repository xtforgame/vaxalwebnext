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

/* ── common GLSL (hash + noise) ── */
const common = /* glsl */ `
float hash21(vec2 p) {
  p = fract(p * vec2(234.34, 435.345));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}

vec2 hash2(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
}

float simplex_noise(in vec2 p) {
  const float K1 = 0.366025404;
  const float K2 = 0.211324865;
  vec2 i = floor(p + (p.x + p.y) * K1);
  vec2 a = p - i + (i.x + i.y) * K2;
  float m = step(a.y, a.x);
  vec2 o = vec2(m, 1.0 - m);
  vec2 b = a - o + K2;
  vec2 c = a - 1.0 + 2.0 * K2;
  vec3 h = max(0.5 - vec3(dot(a, a), dot(b, b), dot(c, c)), 0.0);
  vec3 n = h * h * h * h * vec3(dot(a, hash2(i)), dot(b, hash2(i + o)), dot(c, hash2(i + 1.0)));
  return dot(n, vec3(70.0));
}

#define NSIZE 1.25
#define NSPEED 0.12
vec3 curl_noise(vec2 p) {
  const float dt = 0.001;
  vec2 ds = vec2(dt, 0.0);
  p /= NSIZE;
  float n0 = simplex_noise(p);
  float n1 = simplex_noise(p + ds.xy);
  float n2 = simplex_noise(p + ds.yx);
  vec2 grad = vec2(n1 - n0, n2 - n0) / ds.x;
  vec2 curl = vec2(grad.y, -grad.x);
  return vec3(curl, n0) * NSIZE * NSPEED;
}
`;

/* ── Buffer A: particle position update ── */
const fsBufferA = /* glsl */ `
uniform vec2 iResolution;
uniform float iTimeDelta;
uniform int iFrame;
uniform sampler2D iChannel0; // self (prev)
uniform sampler2D iChannel1; // bufferB (prev)
` + common + /* glsl */ `
void main() {
  vec2 fragCoord = gl_FragCoord.xy;
  vec2 uv = fragCoord / iResolution;
  vec2 puv = (fragCoord * 2.0 - iResolution) / iResolution.y;

  if (iFrame == 0) {
    gl_FragColor = vec4(puv, puv);
  } else {
    vec2 p0 = texture2D(iChannel0, uv).xy;

    vec2 v0 = curl_noise(p0 * 2.0).xy;
    v0 = normalize(v0) * 1.99;
    v0 = vec2(float(int(v0.x)), float(int(v0.y)));

    vec2 p1 = p0 + v0 * iTimeDelta;

    vec4 c = texture2D(iChannel1, uv);

    if (c.y <= 0.0) {
      gl_FragColor = vec4(puv, puv);
    } else {
      gl_FragColor = vec4(p1, p0);
    }
  }
}
`;

/* ── Buffer B: draw line segments + trail fade + life ── */
const fsBufferB = /* glsl */ `
uniform vec2 iResolution;
uniform sampler2D iChannel0; // bufferA
uniform sampler2D iChannel1; // self (prev)

#define COL 36
#define ROW 20
#define DW (1.0 / float(COL))
#define DH (1.0 / float(ROW))

#define LINE_WIDTH 0.012
#define TRAIL_FADE 0.97
#define MAXLIFE 400.0
#define MINLIFE 100.0
` + common + /* glsl */ `
vec2 sdSegment(vec2 p, vec2 d) {
  float lp = dot(p, d) / dot(d, d);
  return p - d * clamp(lp, 0.0, 1.0);
}

void main() {
  vec2 fragCoord = gl_FragCoord.xy;
  vec2 uv = fragCoord / iResolution;
  vec2 puv = (fragCoord * 2.0 - iResolution) / iResolution.y;

  vec4 col = texture2D(iChannel1, uv);
  col.x *= TRAIL_FADE;

  for (int ix = 0; ix < COL; ix++) {
    for (int iy = 0; iy < ROW; iy++) {
      vec2 gid;
      gid.x = DW * (float(ix) + 0.5);
      gid.y = DH * (float(iy) + 0.5);
      vec4 ppos = texture2D(iChannel0, gid);
      vec2 dn = sdSegment(puv - ppos.xy, ppos.zw - ppos.xy);
      float a = smoothstep(LINE_WIDTH, 0.0, length(dn));
      col.x = max(col.x, a);
    }
  }

  col.x = clamp(col.x, 0.0, 1.0);

  if (col.y > -1.0) {
    col.y -= 1.0;
  } else {
    col.y = hash21(uv);
    col.y = mix(MINLIFE, MAXLIFE, col.y);
  }

  gl_FragColor = col;
}
`;

/* ── Image: final output ── */
const fsImage = /* glsl */ `
uniform vec2 iResolution;
uniform sampler2D iChannel0; // bufferB
` + common + /* glsl */ `
void main() {
  vec2 fragCoord = gl_FragCoord.xy;
  vec2 uv = fragCoord / iResolution;
  vec2 puv = (fragCoord * 2.0 - iResolution) / iResolution.y;

  vec3 col = vec3(0.0);
  col += texture2D(iChannel0, uv).x;
  col.rg += curl_noise(puv).xy * 0.5;

  gl_FragColor = vec4(col, 1.0);
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
export default function MultiLineShader1() {
  const { gl, size, viewport } = useThree();
  const frameRef = useRef(0);
  const flipRef = useRef(0);

  const w = Math.floor(size.width * viewport.dpr);
  const h = Math.floor(size.height * viewport.dpr);

  const { targetA, targetB, matA, matB, matImage, quadScene, quadCamera } = useMemo(() => {
    const tA = [createRT(w, h), createRT(w, h)];
    const tB = [createRT(w, h), createRT(w, h)];

    const mA = createMaterial(fsBufferA, {
      iResolution: { value: new THREE.Vector2(w, h) },
      iTimeDelta: { value: 0 },
      iFrame: { value: 0 },
      iChannel0: { value: null },
      iChannel1: { value: null },
    });

    const mB = createMaterial(fsBufferB, {
      iResolution: { value: new THREE.Vector2(w, h) },
      iChannel0: { value: null },
      iChannel1: { value: null },
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
      targetB.forEach((t) => t.dispose());
      matA.dispose();
      matB.dispose();
      matImage.dispose();
    };
  }, [targetA, targetB, matA, matB, matImage]);

  useFrame((_, delta) => {
    const read = flipRef.current;
    const write = 1 - read;
    flipRef.current = write;

    const res = matA.uniforms.iResolution.value as THREE.Vector2;
    res.set(w, h);
    matB.uniforms.iResolution.value = res;
    matImage.uniforms.iResolution.value = res;

    // ── Buffer A ──
    matA.uniforms.iFrame.value = frameRef.current;
    matA.uniforms.iTimeDelta.value = delta;
    matA.uniforms.iChannel0.value = targetA[read].texture;
    matA.uniforms.iChannel1.value = targetB[read].texture;
    quadScene.mesh.material = matA;
    gl.setRenderTarget(targetA[write]);
    gl.render(quadScene.scene, quadCamera);

    // ── Buffer B ──
    matB.uniforms.iChannel0.value = targetA[write].texture;
    matB.uniforms.iChannel1.value = targetB[read].texture;
    quadScene.mesh.material = matB;
    gl.setRenderTarget(targetB[write]);
    gl.render(quadScene.scene, quadCamera);

    // ── Image (rendered by R3F scene) ──
    matImage.uniforms.iChannel0.value = targetB[write].texture;
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
