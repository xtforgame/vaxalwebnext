'use client';

import {
  Suspense,
  useRef,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useWebGLRecovery } from '@/hooks/useWebGLRecovery';
import SwipeRevealText from '@/components/SwipeRevealText';
import './image-gen-v2.css';

// ============ Constants ============

const CARD_WIDTH_PX = 400;
const CARD_GAP_PX = 280;
const CARD_COUNT = 5;
const PARTICLE_COUNT = 400;
const SCROLL_SPEED = 100; // px/s — configurable scroll speed

const CARD_IMAGES = [
  { src: '/images/styles/01.png', naturalWidth: 652, naturalHeight: 1110 },
  { src: '/images/styles/02.png', naturalWidth: 1000, naturalHeight: 1460 },
  { src: '/images/styles/03.png', naturalWidth: 600, naturalHeight: 968 },
  { src: '/images/styles/04.png', naturalWidth: 652, naturalHeight: 1316 },
  { src: '/images/styles/05.png', naturalWidth: 654, naturalHeight: 1234 },
];

// Precompute card heights at CARD_WIDTH_PX
const CARD_HEIGHTS = CARD_IMAGES.map((img) =>
  Math.round(CARD_WIDTH_PX * (img.naturalHeight / img.naturalWidth))
);
const MAX_CARD_HEIGHT = Math.max(...CARD_HEIGHTS);

function getCardHeight(index: number): number {
  return CARD_HEIGHTS[index % CARD_HEIGHTS.length];
}

// Title texts shown sequentially as each card passes the scanner
const CARD_TITLES = [
  '> 生一個都市休閒風的文案和附圖給我，感謝',
  '> 幫我產一張背對鏡頭的西外穿搭，以及相應的介紹文案',
  '> 我想發跟西褲相關的限動，請你幫我產一張圖',
  '> 請你使用資料庫的穿搭任意搭配，產生一張生活照並且附帶文案',
  '> 請幫使用者產生一個毛衣系列穿搭貼文，並附上CTA',
];
const SCRAMBLE_CHARS = '!<>-_\\/[]{}—=+*^?#________';

// ============ Code Generation for ASCII Cards ============

function generateCode(width: number, height: number): string {
  const randInt = (min: number, max: number) =>
    Math.floor(Math.random() * (max - min + 1)) + min;
  const pick = <T,>(arr: T[]): T => arr[randInt(0, arr.length - 1)];

  const header = [
    '// compiled preview • scanner demo',
    '/* generated for visual effect – not executed */',
    'const SCAN_WIDTH = 8;',
    'const FADE_ZONE = 35;',
    'const MAX_PARTICLES = 2500;',
    'const TRANSITION = 0.05;',
  ];

  const helpers = [
    'function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }',
    'function lerp(a, b, t) { return a + (b - a) * t; }',
    'const now = () => performance.now();',
    'function rng(min, max) { return Math.random() * (max - min) + min; }',
  ];

  const particleBlock = (idx: number) => [
    `class Particle${idx} {`,
    '  constructor(x, y, vx, vy, r, a) {',
    '    this.x = x; this.y = y;',
    '    this.vx = vx; this.vy = vy;',
    '    this.r = r; this.a = a;',
    '  }',
    '  step(dt) { this.x += this.vx * dt; this.y += this.vy * dt; }',
    '}',
  ];

  const scannerBlock = [
    'const scanner = {',
    '  x: Math.floor(window.innerWidth / 2),',
    '  width: SCAN_WIDTH,',
    '  glow: 3.5,',
    '};',
    '',
    'function drawParticle(ctx, p) {',
    '  ctx.globalAlpha = clamp(p.a, 0, 1);',
    '  ctx.drawImage(gradient, p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);',
    '}',
  ];

  const loopBlock = [
    'function tick(t) {',
    '  // requestAnimationFrame(tick);',
    '  const dt = 0.016;',
    '  // update & render',
    '}',
  ];

  const misc = [
    'const state = { intensity: 1.2, particles: MAX_PARTICLES };',
    'const bounds = { w: window.innerWidth, h: 300 };',
    "const gradient = document.createElement('canvas');",
    "const ctx = gradient.getContext('2d');",
    "ctx.globalCompositeOperation = 'lighter';",
    '// ascii overlay is masked with a 3-phase gradient',
  ];

  const library: string[] = [];
  header.forEach((l) => library.push(l));
  helpers.forEach((l) => library.push(l));
  for (let b = 0; b < 3; b++)
    particleBlock(b).forEach((l) => library.push(l));
  scannerBlock.forEach((l) => library.push(l));
  loopBlock.forEach((l) => library.push(l));
  misc.forEach((l) => library.push(l));

  for (let i = 0; i < 40; i++) {
    const n1 = randInt(1, 9);
    const n2 = randInt(10, 99);
    library.push(`const v${i} = (${n1} + ${n2}) * 0.${randInt(1, 9)};`);
  }
  for (let i = 0; i < 20; i++) {
    library.push(
      `if (state.intensity > ${1 + (i % 3)}) { scanner.glow += 0.01; }`
    );
  }

  let flow = library.join(' ');
  flow = flow.replace(/\s+/g, ' ').trim();
  const totalChars = width * height;
  while (flow.length < totalChars + width) {
    const extra = pick(library).replace(/\s+/g, ' ').trim();
    flow += ' ' + extra;
  }

  let out = '';
  let offset = 0;
  for (let row = 0; row < height; row++) {
    let line = flow.slice(offset, offset + width);
    if (line.length < width) line = line + ' '.repeat(width - line.length);
    out += line + (row < height - 1 ? '\n' : '');
    offset += width;
  }
  return out;
}

function calculateCodeDimensions(cardWidth: number, cardHeight: number) {
  const fontSize = 12;
  const lineHeight = 15;
  const charWidth = 7.2;
  return {
    width: Math.floor(cardWidth / charWidth),
    height: Math.floor(cardHeight / lineHeight),
    fontSize,
    lineHeight,
  };
}

// ============ Hacker Text Scramble ============

function scrambleText(
  el: HTMLElement,
  newText: string,
  animRef: React.RefObject<number>
) {
  const oldText = el.innerText;
  const length = Math.max(oldText.length, newText.length);
  const queue: {
    from: string;
    to: string;
    start: number;
    end: number;
    char?: string;
  }[] = [];

  for (let i = 0; i < length; i++) {
    const from = oldText[i] || '';
    const to = newText[i] || '';
    const start = Math.floor(Math.random() * 40);
    const end = start + Math.floor(Math.random() * 40);
    queue.push({ from, to, start, end });
  }

  cancelAnimationFrame(animRef.current);
  let frame = 0;

  const update = () => {
    let output = '';
    let complete = 0;

    for (let i = 0; i < queue.length; i++) {
      const { from, to, start, end } = queue[i];
      if (frame >= end) {
        complete++;
        output += to;
      } else if (frame >= start) {
        if (!queue[i].char || Math.random() < 0.28) {
          queue[i].char =
            SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
        }
        output += `<span style="color:#00ff88;text-shadow:0 0 12px currentColor">${queue[i].char}</span>`;
      } else {
        output += from;
      }
    }

    el.innerHTML = output;

    if (complete < queue.length) {
      animRef.current = requestAnimationFrame(update);
      frame++;
    }
  };

  update();
}

// ============ R3F Particle System (background floating particles) ============

function ParticleField() {
  const pointsRef = useRef<THREE.Points>(null);
  const velocitiesRef = useRef<Float32Array | null>(null);
  const { size } = useThree();

  const { geometry, material } = useMemo(() => {
    const count = PARTICLE_COUNT;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const alphas = new Float32Array(count);
    const velocities = new Float32Array(count);

    // Create radial-gradient particle texture
    const cvs = document.createElement('canvas');
    cvs.width = 100;
    cvs.height = 100;
    const c = cvs.getContext('2d')!;
    const half = cvs.width / 2;
    const hue = 217;
    const grad = c.createRadialGradient(half, half, 0, half, half, half);
    grad.addColorStop(0.025, '#fff');
    grad.addColorStop(0.1, `hsl(${hue}, 61%, 33%)`);
    grad.addColorStop(0.25, `hsl(${hue}, 64%, 6%)`);
    grad.addColorStop(1, 'transparent');
    c.fillStyle = grad;
    c.beginPath();
    c.arc(half, half, half, 0, Math.PI * 2);
    c.fill();
    const texture = new THREE.CanvasTexture(cvs);

    const w = typeof window !== 'undefined' ? window.innerWidth : 1920;

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * w * 2;
      positions[i * 3 + 1] = (Math.random() - 0.5) * MAX_CARD_HEIGHT;
      positions[i * 3 + 2] = 0;

      colors[i * 3] = 1;
      colors[i * 3 + 1] = 1;
      colors[i * 3 + 2] = 1;

      alphas[i] = (Math.random() * 8 + 2) / 10;
      velocities[i] = Math.random() * 60 + 30;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));

    velocitiesRef.current = velocities;

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        pointTexture: { value: texture },
        size: { value: 15.0 },
      },
      vertexShader: `
        attribute float alpha;
        varying float vAlpha;
        varying vec3 vColor;
        uniform float size;

        void main() {
          vAlpha = alpha;
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform sampler2D pointTexture;
        varying float vAlpha;
        varying vec3 vColor;

        void main() {
          gl_FragColor = vec4(vColor, vAlpha) * texture2D(pointTexture, gl_PointCoord);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: true,
    });

    return { geometry: geo, material: mat };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame(() => {
    if (!pointsRef.current || !velocitiesRef.current) return;

    const positions = pointsRef.current.geometry.attributes.position
      .array as Float32Array;
    const alphas = pointsRef.current.geometry.attributes.alpha
      .array as Float32Array;
    const velocities = velocitiesRef.current;
    const time = Date.now() * 0.001;
    const halfW = size.width / 2;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3] += velocities[i] * 0.016;

      if (positions[i * 3] > halfW + 100) {
        positions[i * 3] = -halfW - 100;
        positions[i * 3 + 1] = (Math.random() - 0.5) * MAX_CARD_HEIGHT;
      }

      positions[i * 3 + 1] += Math.sin(time + i * 0.1) * 0.5;

      const twinkle = Math.floor(Math.random() * 10);
      if (twinkle === 1 && alphas[i] > 0) {
        alphas[i] -= 0.05;
      } else if (twinkle === 2 && alphas[i] < 1) {
        alphas[i] += 0.05;
      }
      alphas[i] = Math.max(0, Math.min(1, alphas[i]));
    }

    pointsRef.current.geometry.attributes.position.needsUpdate = true;
    pointsRef.current.geometry.attributes.alpha.needsUpdate = true;
  });

  return <points ref={pointsRef} geometry={geometry} material={material} />;
}

// ============ 2D Scanner Canvas (light bar + emanating particles) ============

interface ScannerParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  originalAlpha: number;
  decay: number;
  life: number;
  time: number;
  startX: number;
  twinkleSpeed: number;
  twinkleAmount: number;
}

const SCANNER_HEIGHT = MAX_CARD_HEIGHT + 100;

function ScannerOverlay({
  scanningActiveRef,
}: {
  scanningActiveRef: React.MutableRefObject<boolean>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    let w = window.innerWidth;
    const h = SCANNER_HEIGHT;
    const lightBarWidth = 3;
    let lightBarX = w / 2;

    // Scanner parameters
    const baseIntensity = 0.8;
    const baseMaxParticles = 800;
    const baseFadeZone = 60;
    const scanTargetIntensity = 1.8;
    const scanTargetParticles = 2500;
    const scanTargetFadeZone = 35;
    const transitionSpeed = 0.05;

    let currentIntensity = baseIntensity;
    let currentMaxParticles = baseMaxParticles;
    let currentFadeZone = baseFadeZone;
    let intensity = baseIntensity;
    let maxParticles = baseMaxParticles;
    let fadeZone = baseFadeZone;
    let currentGlowIntensity = 1;

    // Setup canvas
    canvas.width = w;
    canvas.height = h;

    // Pre-rendered particle gradient
    const gradientCanvas = document.createElement('canvas');
    gradientCanvas.width = 16;
    gradientCanvas.height = 16;
    const gCtx = gradientCanvas.getContext('2d')!;
    const ghalf = 8;
    const grad = gCtx.createRadialGradient(
      ghalf,
      ghalf,
      0,
      ghalf,
      ghalf,
      ghalf
    );
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.3, 'rgba(196, 181, 253, 0.8)');
    grad.addColorStop(0.7, 'rgba(139, 92, 246, 0.4)');
    grad.addColorStop(1, 'transparent');
    gCtx.fillStyle = grad;
    gCtx.beginPath();
    gCtx.arc(ghalf, ghalf, ghalf, 0, Math.PI * 2);
    gCtx.fill();

    // Particles (1-indexed like original)
    const particles: (ScannerParticle | null)[] = [null];
    let count = 0;

    const randomFloat = (min: number, max: number) =>
      Math.random() * (max - min) + min;

    const createParticle = (): ScannerParticle => {
      const intensityRatio = intensity / baseIntensity;
      const speedMultiplier = 1 + (intensityRatio - 1) * 1.2;
      const sizeMultiplier = 1 + (intensityRatio - 1) * 0.7;

      return {
        x:
          lightBarX + randomFloat(-lightBarWidth / 2, lightBarWidth / 2),
        y: randomFloat(0, h),
        vx: randomFloat(0.2, 1.0) * speedMultiplier,
        vy: randomFloat(-0.15, 0.15) * speedMultiplier,
        radius: randomFloat(0.4, 1) * sizeMultiplier,
        alpha: randomFloat(0.6, 1),
        originalAlpha: 0,
        decay: randomFloat(0.005, 0.025) * (2 - intensityRatio * 0.5),
        life: 1.0,
        time: 0,
        startX: 0,
        twinkleSpeed: randomFloat(0.02, 0.08) * speedMultiplier,
        twinkleAmount: randomFloat(0.1, 0.25),
      };
    };

    // Initialize particles
    for (let i = 0; i < baseMaxParticles; i++) {
      const p = createParticle();
      p.originalAlpha = p.alpha;
      p.startX = p.x;
      count++;
      particles[count] = p;
    }

    const resetParticle = (p: ScannerParticle) => {
      p.x =
        lightBarX + randomFloat(-lightBarWidth / 2, lightBarWidth / 2);
      p.y = randomFloat(0, h);
      p.vx = randomFloat(0.2, 1.0);
      p.vy = randomFloat(-0.15, 0.15);
      p.alpha = randomFloat(0.6, 1);
      p.originalAlpha = p.alpha;
      p.life = 1.0;
      p.time = 0;
      p.startX = p.x;
    };

    const updateParticle = (p: ScannerParticle) => {
      p.x += p.vx;
      p.y += p.vy;
      p.time++;
      p.alpha =
        p.originalAlpha * p.life +
        Math.sin(p.time * p.twinkleSpeed) * p.twinkleAmount;
      p.life -= p.decay;
      if (p.x > w + 10 || p.life <= 0) resetParticle(p);
    };

    const drawParticle = (p: ScannerParticle) => {
      if (p.life <= 0) return;
      let fadeAlpha = 1;
      if (p.y < fadeZone) fadeAlpha = p.y / fadeZone;
      else if (p.y > h - fadeZone) fadeAlpha = (h - p.y) / fadeZone;
      fadeAlpha = Math.max(0, Math.min(1, fadeAlpha));
      ctx.globalAlpha = p.alpha * fadeAlpha;
      ctx.drawImage(
        gradientCanvas,
        p.x - p.radius,
        p.y - p.radius,
        p.radius * 2,
        p.radius * 2
      );
    };

    const drawLightBar = () => {
      const scanning = scanningActiveRef.current;

      // Vertical fade mask gradient
      const verticalGrad = ctx.createLinearGradient(0, 0, 0, h);
      verticalGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
      verticalGrad.addColorStop(
        fadeZone / h,
        'rgba(255, 255, 255, 1)'
      );
      verticalGrad.addColorStop(
        1 - fadeZone / h,
        'rgba(255, 255, 255, 1)'
      );
      verticalGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

      ctx.globalCompositeOperation = 'lighter';

      const targetGlow = scanning ? 3.5 : 1;
      currentGlowIntensity +=
        (targetGlow - currentGlowIntensity) * transitionSpeed;
      const glow = currentGlowIntensity;
      const lw = lightBarWidth;

      // Core line
      const coreGrad = ctx.createLinearGradient(
        lightBarX - lw / 2,
        0,
        lightBarX + lw / 2,
        0
      );
      coreGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
      coreGrad.addColorStop(
        0.3,
        `rgba(255, 255, 255, ${0.9 * glow})`
      );
      coreGrad.addColorStop(
        0.5,
        `rgba(255, 255, 255, ${1 * glow})`
      );
      coreGrad.addColorStop(
        0.7,
        `rgba(255, 255, 255, ${0.9 * glow})`
      );
      coreGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

      ctx.globalAlpha = 1;
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.roundRect(lightBarX - lw / 2, 0, lw, h, 15);
      ctx.fill();

      // Glow layer 1
      const g1 = ctx.createLinearGradient(
        lightBarX - lw * 2,
        0,
        lightBarX + lw * 2,
        0
      );
      g1.addColorStop(0, 'rgba(139, 92, 246, 0)');
      g1.addColorStop(
        0.5,
        `rgba(196, 181, 253, ${0.8 * glow})`
      );
      g1.addColorStop(1, 'rgba(139, 92, 246, 0)');
      ctx.globalAlpha = scanning ? 1.0 : 0.8;
      ctx.fillStyle = g1;
      ctx.beginPath();
      ctx.roundRect(lightBarX - lw * 2, 0, lw * 4, h, 25);
      ctx.fill();

      // Glow layer 2
      const g2 = ctx.createLinearGradient(
        lightBarX - lw * 4,
        0,
        lightBarX + lw * 4,
        0
      );
      g2.addColorStop(0, 'rgba(139, 92, 246, 0)');
      g2.addColorStop(
        0.5,
        `rgba(139, 92, 246, ${0.4 * glow})`
      );
      g2.addColorStop(1, 'rgba(139, 92, 246, 0)');
      ctx.globalAlpha = scanning ? 0.8 : 0.6;
      ctx.fillStyle = g2;
      ctx.beginPath();
      ctx.roundRect(lightBarX - lw * 4, 0, lw * 8, h, 35);
      ctx.fill();

      // Glow layer 3 (only when scanning)
      if (scanning) {
        const g3 = ctx.createLinearGradient(
          lightBarX - lw * 8,
          0,
          lightBarX + lw * 8,
          0
        );
        g3.addColorStop(0, 'rgba(139, 92, 246, 0)');
        g3.addColorStop(0.5, 'rgba(139, 92, 246, 0.2)');
        g3.addColorStop(1, 'rgba(139, 92, 246, 0)');
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = g3;
        ctx.beginPath();
        ctx.roundRect(lightBarX - lw * 8, 0, lw * 16, h, 45);
        ctx.fill();
      }

      // Apply vertical fade mask
      ctx.globalCompositeOperation = 'destination-in';
      ctx.globalAlpha = 1;
      ctx.fillStyle = verticalGrad;
      ctx.fillRect(0, 0, w, h);
    };

    const render = () => {
      const scanning = scanningActiveRef.current;
      const tI = scanning ? scanTargetIntensity : baseIntensity;
      const tP = scanning ? scanTargetParticles : baseMaxParticles;
      const tF = scanning ? scanTargetFadeZone : baseFadeZone;

      currentIntensity += (tI - currentIntensity) * transitionSpeed;
      currentMaxParticles += (tP - currentMaxParticles) * transitionSpeed;
      currentFadeZone += (tF - currentFadeZone) * transitionSpeed;

      intensity = currentIntensity;
      maxParticles = Math.floor(currentMaxParticles);
      fadeZone = currentFadeZone;

      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, w, h);

      drawLightBar();

      ctx.globalCompositeOperation = 'lighter';
      for (let i = 1; i <= count; i++) {
        const p = particles[i];
        if (p) {
          updateParticle(p);
          drawParticle(p);
        }
      }

      // Spawn new particles based on intensity
      if (Math.random() < intensity && count < maxParticles) {
        const p = createParticle();
        p.originalAlpha = p.alpha;
        p.startX = p.x;
        count++;
        particles[count] = p;
      }

      const ratio = intensity / baseIntensity;

      if (ratio > 1.1 && Math.random() < (ratio - 1.0) * 1.2) {
        const p = createParticle();
        p.originalAlpha = p.alpha;
        p.startX = p.x;
        count++;
        particles[count] = p;
      }
      if (ratio > 1.3 && Math.random() < (ratio - 1.3) * 1.4) {
        const p = createParticle();
        p.originalAlpha = p.alpha;
        p.startX = p.x;
        count++;
        particles[count] = p;
      }
      if (ratio > 1.5 && Math.random() < (ratio - 1.5) * 1.8) {
        const p = createParticle();
        p.originalAlpha = p.alpha;
        p.startX = p.x;
        count++;
        particles[count] = p;
      }
      if (ratio > 2.0 && Math.random() < (ratio - 2.0) * 2.0) {
        const p = createParticle();
        p.originalAlpha = p.alpha;
        p.startX = p.x;
        count++;
        particles[count] = p;
      }

      // Trim excess particles
      if (count > maxParticles + 200) {
        const excess = Math.min(15, count - maxParticles);
        for (let i = 0; i < excess; i++) {
          particles[count - i] = null;
        }
        count -= excess;
      }
    };

    const animate = () => {
      render();
      animFrameRef.current = requestAnimationFrame(animate);
    };
    animate();

    const onResize = () => {
      w = window.innerWidth;
      lightBarX = w / 2;
      canvas.width = w;
      canvas.height = h;
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', onResize);
    };
  }, [scanningActiveRef]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: '50%',
        left: -3,
        transform: 'translateY(-50%)',
        width: '100vw',
        height: SCANNER_HEIGHT,
        zIndex: 15,
        pointerEvents: 'none',
      }}
    />
  );
}

// ============ Card Wrapper ============

function CardWrapper({
  index,
  initialCode,
  cardHeight,
}: {
  index: number;
  initialCode: string;
  cardHeight: number;
}) {
  const imgData = CARD_IMAGES[index % CARD_IMAGES.length];

  const handleImageError = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const img = e.currentTarget;
      const cvs = document.createElement('canvas');
      cvs.width = CARD_WIDTH_PX;
      cvs.height = cardHeight;
      const c = cvs.getContext('2d')!;
      const grad = c.createLinearGradient(0, 0, CARD_WIDTH_PX, cardHeight);
      grad.addColorStop(0, '#667eea');
      grad.addColorStop(1, '#764ba2');
      c.fillStyle = grad;
      c.fillRect(0, 0, CARD_WIDTH_PX, cardHeight);
      img.src = cvs.toDataURL();
    },
    [cardHeight]
  );

  return (
    <div
      className="ig2-card-wrapper"
      data-card-height={cardHeight}
      style={{ height: cardHeight }}
    >
      <div className="ig2-card ig2-card-normal">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="ig2-card-image"
          src={imgData.src}
          alt="Card"
          onError={handleImageError}
          draggable={false}
        />
      </div>
      <div className="ig2-card ig2-card-ascii">
        <div className="ig2-ascii-content" suppressHydrationWarning>{initialCode}</div>
      </div>
    </div>
  );
}

// ============ Control Button Style ============

const controlBtnStyle: React.CSSProperties = {
  padding: '10px 20px',
  background: 'rgba(255, 255, 255, 0.2)',
  border: 'none',
  borderRadius: 25,
  color: 'white',
  fontWeight: 'bold',
  cursor: 'pointer',
  backdropFilter: 'blur(5px)',
  fontSize: 14,
};

// ============ Main Exported Component ============

export default function ImageGenSceneV2() {
  const { contextLost, canvasKey, handleCreated } =
    useWebGLRecovery('ImageGenV2');

  // Shared ref: scanner particles read this, card stream writes it
  const scanningActiveRef = useRef<boolean>(false);

  // Card stream state (all ref-based for performance)
  const cardLineRef = useRef<HTMLDivElement>(null);
  const positionRef = useRef(0);
  const isAnimatingRef = useRef(true);
  const lastTimeRef = useRef(0);
  const animFrameRef = useRef(0);
  const containerWidthRef = useRef(0);
  const cardLineWidthRef = useRef(0);

  // Title scramble refs
  const titleRef = useRef<HTMLDivElement>(null);
  const scrambleAnimRef = useRef(0);
  const titleCounterRef = useRef(0);
  const firstTitleFiredRef = useRef(false);

  // Play/pause state (only button text needs re-render)
  const [isPlaying, setIsPlaying] = useState(true);

  // Generate initial ASCII code texts (per-card heights)
  const initialCodes = useMemo(() => {
    return Array.from({ length: CARD_COUNT }, (_, i) => {
      const h = getCardHeight(i);
      const { width, height } = calculateCodeDimensions(CARD_WIDTH_PX, h);
      return generateCode(width, height);
    });
  }, []);

  // Dimension calculation
  const calculateDimensions = useCallback(() => {
    containerWidthRef.current =
      typeof window !== 'undefined' ? window.innerWidth : 0;
    cardLineWidthRef.current =
      (CARD_WIDTH_PX + CARD_GAP_PX) * CARD_COUNT;
  }, []);

  // Card clipping update (called every frame)
  const updateCardClipping = useCallback(() => {
    if (!cardLineRef.current) return;

    const scannerX = window.innerWidth / 2;
    const scannerWidth = 8;
    const scannerLeft = scannerX - scannerWidth / 2;
    const scannerRight = scannerX + scannerWidth / 2;
    let anyScanningActive = false;

    const wrappers =
      cardLineRef.current.querySelectorAll('.ig2-card-wrapper');

    wrappers.forEach((wrapper) => {
      const rect = wrapper.getBoundingClientRect();
      const cardLeft = rect.left;
      const cardRight = rect.right;
      const cardWidth = rect.width;

      // First title: trigger early when the first card approaches
      if (
        !firstTitleFiredRef.current &&
        titleCounterRef.current === 0 &&
        scannerLeft - cardRight < CARD_GAP_PX &&
        titleRef.current
      ) {
        firstTitleFiredRef.current = true;
        scrambleText(
          titleRef.current,
          CARD_TITLES[0],
          scrambleAnimRef
        );
        titleCounterRef.current = 1;
      }

      // Subsequent titles: trigger when each card fully passes the scanner
      if (
        !wrapper.hasAttribute('data-title-triggered') &&
        cardLeft > scannerRight
      ) {
        wrapper.setAttribute('data-title-triggered', 'true');
        if (
          titleRef.current &&
          titleCounterRef.current < CARD_TITLES.length
        ) {
          scrambleText(
            titleRef.current,
            CARD_TITLES[titleCounterRef.current],
            scrambleAnimRef
          );
          titleCounterRef.current++;
        }
      }

      const normalCard = wrapper.querySelector(
        '.ig2-card-normal'
      ) as HTMLElement | null;
      const asciiCard = wrapper.querySelector(
        '.ig2-card-ascii'
      ) as HTMLElement | null;

      if (!normalCard || !asciiCard) return;

      if (cardLeft < scannerRight && cardRight > scannerLeft) {
        anyScanningActive = true;
        const scannerIntersectLeft = Math.max(
          scannerLeft - cardLeft,
          0
        );
        const scannerIntersectRight = Math.min(
          scannerRight - cardLeft,
          cardWidth
        );

        const normalClipRight =
          (scannerIntersectLeft / cardWidth) * 100;
        const asciiClipLeft =
          (scannerIntersectRight / cardWidth) * 100;

        normalCard.style.setProperty(
          '--clip-right',
          `${normalClipRight}%`
        );
        asciiCard.style.setProperty(
          '--clip-left',
          `${asciiClipLeft}%`
        );

        // Flash effect on scan entry
        if (
          !wrapper.hasAttribute('data-scanned') &&
          scannerIntersectLeft > 0
        ) {
          wrapper.setAttribute('data-scanned', 'true');
          const flash = document.createElement('div');
          flash.className = 'ig2-scan-effect';
          wrapper.appendChild(flash);
          setTimeout(() => {
            if (flash.parentNode) flash.parentNode.removeChild(flash);
          }, 600);
        }
      } else {
        if (cardRight < scannerLeft) {
          // Card is LEFT of scanner — still ASCII (not yet scanned)
          normalCard.style.setProperty('--clip-right', '100%');
          asciiCard.style.setProperty('--clip-left', '100%');
        } else if (cardLeft > scannerRight) {
          // Card is RIGHT of scanner — fully converted to image
          normalCard.style.setProperty('--clip-right', '0%');
          asciiCard.style.setProperty('--clip-left', '0%');
        }
        wrapper.removeAttribute('data-scanned');
      }
    });

    scanningActiveRef.current = anyScanningActive;
  }, []);

  // Main animation loop — one-way left-to-right scroll
  useEffect(() => {
    calculateDimensions();
    // Start with the last card already visible near the left edge
    positionRef.current = -cardLineWidthRef.current + containerWidthRef.current * 0.3;
    lastTimeRef.current = performance.now();

    if (cardLineRef.current) {
      cardLineRef.current.style.transform = `translateX(${positionRef.current}px)`;
    }

    const animate = () => {
      const currentTime = performance.now();
      const deltaTime = (currentTime - lastTimeRef.current) / 1000;
      lastTimeRef.current = currentTime;

      if (isAnimatingRef.current) {
        positionRef.current += SCROLL_SPEED * deltaTime;

        // Stop when all cards have scrolled past the right edge
        if (positionRef.current > containerWidthRef.current) {
          isAnimatingRef.current = false;
          setIsPlaying(false);
        }

        if (cardLineRef.current) {
          cardLineRef.current.style.transform = `translateX(${positionRef.current}px)`;
        }
      }

      updateCardClipping();
      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    const onResize = () => calculateDimensions();
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', onResize);
    };
  }, [calculateDimensions, updateCardClipping]);

  // Periodic ASCII content refresh (direct DOM manipulation)
  useEffect(() => {
    const timer = setInterval(() => {
      if (!cardLineRef.current) return;
      const wrappers =
        cardLineRef.current.querySelectorAll('.ig2-card-wrapper');
      wrappers.forEach((wrapper) => {
        const content = wrapper.querySelector('.ig2-ascii-content');
        if (!content) return;
        const cardHeight = parseInt(
          wrapper.getAttribute('data-card-height') || '250',
          10
        );
        if (Math.random() < 0.15) {
          const { width, height } = calculateCodeDimensions(
            CARD_WIDTH_PX,
            cardHeight
          );
          content.textContent = generateCode(width, height);
        }
      });
    }, 200);

    return () => clearInterval(timer);
  }, []);

  // Control handlers
  const toggleAnimation = useCallback(() => {
    isAnimatingRef.current = !isAnimatingRef.current;
    setIsPlaying(isAnimatingRef.current);
  }, []);

  const resetPosition = useCallback(() => {
    positionRef.current = -cardLineWidthRef.current + containerWidthRef.current * 0.3;
    isAnimatingRef.current = true;
    setIsPlaying(true);
    titleCounterRef.current = 0;
    firstTitleFiredRef.current = false;
    cancelAnimationFrame(scrambleAnimRef.current);
    if (titleRef.current) {
      titleRef.current.innerHTML = '';
    }
    if (cardLineRef.current) {
      cardLineRef.current.style.transform = `translateX(${positionRef.current}px)`;
      // Reset scanned state on all wrappers
      cardLineRef.current.querySelectorAll('.ig2-card-wrapper').forEach((w) => {
        w.removeAttribute('data-scanned');
        w.removeAttribute('data-title-triggered');
      });
    }
  }, []);

  // ---- Render ----

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
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
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
      {/* Swipe reveal title */}
      <SwipeRevealText
        title={
          <span className="text-white">
            Project <span className="text-pink-500">Doble</span>
          </span>
        }
        description={
          <>
            <span>風格自學 — 模仿不同調性的</span>
            <span className="text-blue-500">圖文內容</span>
          </>
        }
        x={48}
        y={120}
        delay={1.0}
        stagger={0.5}
        duration={0.8}
        exitDelay={3.0}
        titleSwipeColor="#FF5858"
        descriptionSwipeColor="#ffffff"
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

      {/* Title with scramble effect (z: 100) */}
      <div
        ref={titleRef}
        style={{
          position: 'absolute',
          top: '5%',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 100,
          pointerEvents: 'none',
          color: '#0f0',
          fontFamily: "'Courier New', monospace",
          fontSize: '2.5rem',
          fontWeight: 'bold',
          textShadow: '0 0 8px currentColor',
          whiteSpace: 'nowrap',
          letterSpacing: '0.05em',
        }}
      />

      {/* Three.js Particle Background (z: 0) */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: 0,
          transform: 'translateY(-50%)',
          width: '100vw',
          height: MAX_CARD_HEIGHT,
          zIndex: 0,
          pointerEvents: 'none',
        }}
      >
        <Suspense fallback={null}>
          <Canvas
            key={canvasKey}
            orthographic
            camera={{
              position: [0, 0, 100],
              near: 1,
              far: 1000,
              zoom: 1,
            }}
            gl={{ alpha: true, antialias: true }}
            style={{ width: '100%', height: '100%', display: 'block' }}
            dpr={[1, 2]}
            onCreated={handleCreated}
          >
            <ParticleField />
          </Canvas>
        </Suspense>
      </div>

      {/* 2D Scanner Canvas (z: 15) — light bar + emanating particles */}
      <ScannerOverlay scanningActiveRef={scanningActiveRef} />

      {/* Card Stream (z: 5) */}
      <div
        style={{
          position: 'absolute',
          width: '100vw',
          height: MAX_CARD_HEIGHT,
          display: 'flex',
          alignItems: 'center',
          overflow: 'visible',
          top: '50%',
          left: 0,
          transform: 'translateY(-50%)',
          zIndex: 5,
        }}
      >
        <div className="ig2-card-line" ref={cardLineRef}>
          {initialCodes.map((code, i) => (
            <CardWrapper
              key={i}
              index={i}
              initialCode={code}
              cardHeight={getCardHeight(i)}
            />
          ))}
        </div>
      </div>

      {/* Controls (z: 100) */}
      <div
        style={{
          position: 'absolute',
          top: 20,
          left: 20,
          display: 'flex',
          gap: 10,
          zIndex: 100,
        }}
      >
        <button onClick={toggleAnimation} style={controlBtnStyle}>
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        <button onClick={resetPosition} style={controlBtnStyle}>
          Reset
        </button>
      </div>
    </div>
  );
}
