import { FRAME_VERT_COUNT } from './neonFrameGeometry';

// ============ Panel CRT shaders ============

export const panelCrtVert = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const panelCrtFrag = /* glsl */ `
  uniform sampler2D map;
  uniform float time;
  uniform float powerOn; // 0=off, 0..1=booting, 1=fully on
  uniform float uVideoAspect;  // video width / height
  uniform float uPlaneAspect;  // plane width / height
  varying vec2 vUv;

  // Remap UVs for contain-fit (letterbox / pillarbox)
  vec2 containUV(vec2 uv) {
    if (uVideoAspect > uPlaneAspect) {
      // Video wider → fit width, letterbox top/bottom
      float scale = uPlaneAspect / uVideoAspect;
      uv.y = (uv.y - 0.5) / scale + 0.5;
    } else {
      // Video taller → fit height, pillarbox left/right
      float scale = uVideoAspect / uPlaneAspect;
      uv.x = (uv.x - 0.5) / scale + 0.5;
    }
    return uv;
  }

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

    // Contain-fit UV mapping
    vec2 cuv = containUV(vUv);
    bool outOfBounds = cuv.x < 0.0 || cuv.x > 1.0 || cuv.y < 0.0 || cuv.y > 1.0;

    // Chromatic aberration — RGB channel offset (applied in contain UV space)
    float aberration = 0.004;
    vec3 col;
    if (outOfBounds) {
      col = vec3(0.0);
    } else {
      float r = texture2D(map, cuv + vec2(aberration, 0.0)).r;
      float g = texture2D(map, cuv).g;
      float b = texture2D(map, cuv - vec2(aberration, 0.0)).b;
      col = vec3(r, g, b);
    }

    // CRT scanlines (in original UV space for consistent line density)
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

// ============ Panel glow shaders ============

export const panelGlowVert = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const panelGlowFrag = /* glsl */ `
  uniform vec3 glowColor;
  uniform float intensity;
  uniform vec2 frameVerts[${FRAME_VERT_COUNT}]; // outer contour in world units
  uniform vec2 glowHalf;       // glow plane half-size in world units
  varying vec2 vUv;

  // Polygon signed-distance (Inigo Quilez)
  float polySD(vec2 p) {
    float d = dot(p - frameVerts[0], p - frameVerts[0]);
    float s = 1.0;
    for (int i = 0, j = ${FRAME_VERT_COUNT - 1}; i < ${FRAME_VERT_COUNT}; j = i, i++) {
      vec2 e = frameVerts[j] - frameVerts[i];
      vec2 w = p - frameVerts[i];
      vec2 b = w - e * clamp(dot(w, e) / dot(e, e), 0.0, 1.0);
      d = min(d, dot(b, b));
      bvec3 cond = bvec3(p.y >= frameVerts[i].y, p.y < frameVerts[j].y,
                          e.x * w.y > e.y * w.x);
      if (all(cond) || all(not(cond))) s *= -1.0;
    }
    return s * sqrt(d);
  }

  void main() {
    vec2 p = (vUv - 0.5) * glowHalf * 2.0;
    float sd = polySD(p);
    float falloff = sd < 0.0 ? 40.0 : 10.0;
    float glow = exp(-abs(sd) * falloff) * intensity;
    gl_FragColor = vec4(glowColor * glow, glow);
  }
`;

// ============ Fullscreen vertex shader ============

export const fullscreenVert = /* glsl */ `in vec3 position;
void main() {
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

// ============ Common GLSL ============

export const commonGLSL = /* glsl */ `
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

// ============ Hacker buffer A fragment ============

export const bufferAFrag = /* glsl */ `precision highp float;

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

// ============ Hacker image fragment ============

export const hackerImageFrag = /* glsl */ `precision highp float;

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

// ============ Compositor fragment ============

export const compositorFrag = /* glsl */ `precision highp float;

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
