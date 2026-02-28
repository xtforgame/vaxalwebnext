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
import './image-gen.css';

// ============ Constants ============

const CARD_WIDTH_PX = 400;
const CARD_HEIGHT_PX = 250;
const CARD_GAP_PX = 60;
const CARD_COUNT = 30;
const PARTICLE_COUNT = 400;

const CARD_IMAGES = [
  'https://cdn.prod.website-files.com/68789c86c8bc802d61932544/689f20b55e654d1341fb06f8_4.1.png',
  'https://cdn.prod.website-files.com/68789c86c8bc802d61932544/689f20b5a080a31ee7154b19_1.png',
  'https://cdn.prod.website-files.com/68789c86c8bc802d61932544/689f20b5c1e4919fd69672b8_3.png',
  'https://cdn.prod.website-files.com/68789c86c8bc802d61932544/689f20b5f6a5e232e7beb4be_2.png',
  'https://cdn.prod.website-files.com/68789c86c8bc802d61932544/689f20b5bea2f1b07392d936_4.png',
];

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
  const fontSize = 11;
  const lineHeight = 13;
  const charWidth = 6;
  return {
    width: Math.floor(cardWidth / charWidth),
    height: Math.floor(cardHeight / lineHeight),
    fontSize,
    lineHeight,
  };
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
      positions[i * 3 + 1] = (Math.random() - 0.5) * 250;
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
        positions[i * 3 + 1] = (Math.random() - 0.5) * 250;
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
    const h = 300;
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
        height: 300,
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
}: {
  index: number;
  initialCode: string;
}) {
  const imgSrc = CARD_IMAGES[index % CARD_IMAGES.length];

  const handleImageError = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const img = e.currentTarget;
      const cvs = document.createElement('canvas');
      cvs.width = 400;
      cvs.height = 250;
      const c = cvs.getContext('2d')!;
      const grad = c.createLinearGradient(0, 0, 400, 250);
      grad.addColorStop(0, '#667eea');
      grad.addColorStop(1, '#764ba2');
      c.fillStyle = grad;
      c.fillRect(0, 0, 400, 250);
      img.src = cvs.toDataURL();
    },
    []
  );

  return (
    <div className="ig-card-wrapper">
      <div className="ig-card ig-card-normal">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="ig-card-image"
          src={imgSrc}
          alt="Card"
          onError={handleImageError}
          draggable={false}
        />
      </div>
      <div className="ig-card ig-card-ascii">
        <div className="ig-ascii-content">{initialCode}</div>
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

export default function ImageGenScene() {
  const { contextLost, canvasKey, handleCreated } =
    useWebGLRecovery('ImageGen');

  // Shared ref: scanner particles read this, card stream writes it
  const scanningActiveRef = useRef<boolean>(false);

  // Card stream state (all ref-based for performance)
  const cardLineRef = useRef<HTMLDivElement>(null);
  const positionRef = useRef(0);
  const velocityRef = useRef(640);
  const directionRef = useRef(-1);
  const isAnimatingRef = useRef(true);
  const isDraggingRef = useRef(false);
  const lastMouseXRef = useRef(0);
  const mouseVelocityRef = useRef(0);
  const lastTimeRef = useRef(0);
  const animFrameRef = useRef(0);
  const containerWidthRef = useRef(0);
  const cardLineWidthRef = useRef(0);
  const speedDisplayRef = useRef<HTMLSpanElement>(null);

  const friction = 0.95;
  const minVelocity = 190;

  // Play/pause state (only button text needs re-render)
  const [isPlaying, setIsPlaying] = useState(true);

  // Generate initial ASCII code texts
  const initialCodes = useMemo(() => {
    const { width, height } = calculateCodeDimensions(
      CARD_WIDTH_PX,
      CARD_HEIGHT_PX
    );
    return Array.from({ length: CARD_COUNT }, () =>
      generateCode(width, height)
    );
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
      cardLineRef.current.querySelectorAll('.ig-card-wrapper');

    wrappers.forEach((wrapper) => {
      const rect = wrapper.getBoundingClientRect();
      const cardLeft = rect.left;
      const cardRight = rect.right;
      const cardWidth = rect.width;

      const normalCard = wrapper.querySelector(
        '.ig-card-normal'
      ) as HTMLElement | null;
      const asciiCard = wrapper.querySelector(
        '.ig-card-ascii'
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
          flash.className = 'ig-scan-effect';
          wrapper.appendChild(flash);
          setTimeout(() => {
            if (flash.parentNode) flash.parentNode.removeChild(flash);
          }, 600);
        }
      } else {
        if (cardRight < scannerLeft) {
          // Card has fully passed the scanner
          normalCard.style.setProperty('--clip-right', '100%');
          asciiCard.style.setProperty('--clip-left', '100%');
        } else if (cardLeft > scannerRight) {
          // Card hasn't reached the scanner yet
          normalCard.style.setProperty('--clip-right', '0%');
          asciiCard.style.setProperty('--clip-left', '0%');
        }
        wrapper.removeAttribute('data-scanned');
      }
    });

    scanningActiveRef.current = anyScanningActive;
  }, []);

  // Main animation loop
  useEffect(() => {
    calculateDimensions();
    lastTimeRef.current = performance.now();

    const animate = () => {
      const currentTime = performance.now();
      const deltaTime = (currentTime - lastTimeRef.current) / 1000;
      lastTimeRef.current = currentTime;

      if (isAnimatingRef.current && !isDraggingRef.current) {
        if (velocityRef.current > minVelocity) {
          velocityRef.current *= friction;
        } else {
          velocityRef.current = Math.max(
            minVelocity,
            velocityRef.current
          );
        }

        positionRef.current +=
          velocityRef.current * directionRef.current * deltaTime;

        // Wrap position for infinite scroll
        const cw = containerWidthRef.current;
        const clw = cardLineWidthRef.current;
        if (positionRef.current < -clw) {
          positionRef.current = cw;
        } else if (positionRef.current > cw) {
          positionRef.current = -clw;
        }

        if (cardLineRef.current) {
          cardLineRef.current.style.transform = `translateX(${positionRef.current}px)`;
        }

        // Update speed display via ref (no re-render)
        if (speedDisplayRef.current) {
          speedDisplayRef.current.textContent = String(
            Math.round(velocityRef.current)
          );
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
      const contents =
        cardLineRef.current.querySelectorAll('.ig-ascii-content');
      const { width, height } = calculateCodeDimensions(
        CARD_WIDTH_PX,
        CARD_HEIGHT_PX
      );
      contents.forEach((el) => {
        if (Math.random() < 0.15) {
          el.textContent = generateCode(width, height);
        }
      });
    }, 200);

    return () => clearInterval(timer);
  }, []);

  // Pointer events for drag/swipe
  useEffect(() => {
    const cardLine = cardLineRef.current;
    if (!cardLine) return;

    const startDrag = (clientX: number) => {
      isDraggingRef.current = true;
      isAnimatingRef.current = false;
      lastMouseXRef.current = clientX;
      mouseVelocityRef.current = 0;

      const transform = window.getComputedStyle(cardLine).transform;
      if (transform !== 'none') {
        const matrix = new DOMMatrix(transform);
        positionRef.current = matrix.m41;
      }

      cardLine.classList.add('dragging');
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'grabbing';
    };

    const onDrag = (clientX: number) => {
      if (!isDraggingRef.current) return;
      const deltaX = clientX - lastMouseXRef.current;
      positionRef.current += deltaX;
      mouseVelocityRef.current = deltaX * 60;
      lastMouseXRef.current = clientX;
      cardLine.style.transform = `translateX(${positionRef.current}px)`;
    };

    const endDrag = () => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      cardLine.classList.remove('dragging');

      if (Math.abs(mouseVelocityRef.current) > minVelocity) {
        velocityRef.current = Math.abs(mouseVelocityRef.current);
        directionRef.current =
          mouseVelocityRef.current > 0 ? 1 : -1;
      } else {
        velocityRef.current = 640;
      }

      isAnimatingRef.current = true;

      if (speedDisplayRef.current) {
        speedDisplayRef.current.textContent = String(
          Math.round(velocityRef.current)
        );
      }

      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };

    const onMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      startDrag(e.clientX);
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      e.preventDefault();
      onDrag(e.clientX);
    };
    const onMouseUp = () => endDrag();

    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      startDrag(e.touches[0].clientX);
    };
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      onDrag(e.touches[0].clientX);
    };
    const onTouchEnd = () => endDrag();

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 20 : -20;
      positionRef.current += delta;

      const cw = containerWidthRef.current;
      const clw = cardLineWidthRef.current;
      if (positionRef.current < -clw) positionRef.current = cw;
      else if (positionRef.current > cw) positionRef.current = -clw;

      cardLine.style.transform = `translateX(${positionRef.current}px)`;
    };

    const preventDefault = (e: Event) => e.preventDefault();

    cardLine.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    cardLine.addEventListener('touchstart', onTouchStart, {
      passive: false,
    });
    document.addEventListener('touchmove', onTouchMove, {
      passive: false,
    });
    document.addEventListener('touchend', onTouchEnd);
    cardLine.addEventListener('wheel', onWheel, { passive: false });
    cardLine.addEventListener('selectstart', preventDefault);
    cardLine.addEventListener('dragstart', preventDefault);

    return () => {
      cardLine.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      cardLine.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
      cardLine.removeEventListener('wheel', onWheel);
      cardLine.removeEventListener('selectstart', preventDefault);
      cardLine.removeEventListener('dragstart', preventDefault);
    };
  }, []);

  // Control handlers
  const toggleAnimation = useCallback(() => {
    isAnimatingRef.current = !isAnimatingRef.current;
    setIsPlaying(isAnimatingRef.current);
  }, []);

  const resetPosition = useCallback(() => {
    positionRef.current = containerWidthRef.current;
    velocityRef.current = 640;
    directionRef.current = -1;
    isAnimatingRef.current = true;
    isDraggingRef.current = false;
    setIsPlaying(true);
    if (speedDisplayRef.current) {
      speedDisplayRef.current.textContent = '640';
    }
    if (cardLineRef.current) {
      cardLineRef.current.style.transform = `translateX(${positionRef.current}px)`;
      cardLineRef.current.classList.remove('dragging');
    }
  }, []);

  const changeDirection = useCallback(() => {
    directionRef.current *= -1;
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
      {/* Three.js Particle Background (z: 0) */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: 0,
          transform: 'translateY(-50%)',
          width: '100vw',
          height: 250,
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
          height: 180,
          display: 'flex',
          alignItems: 'center',
          overflow: 'visible',
          top: '50%',
          left: 0,
          transform: 'translateY(-50%)',
          zIndex: 5,
        }}
      >
        <div className="ig-card-line" ref={cardLineRef}>
          {initialCodes.map((code, i) => (
            <CardWrapper key={i} index={i} initialCode={code} />
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
        <button onClick={changeDirection} style={controlBtnStyle}>
          Direction
        </button>
      </div>

      {/* Speed Indicator (z: 100) */}
      <div
        style={{
          position: 'absolute',
          top: 20,
          right: 20,
          color: 'white',
          fontSize: 16,
          background: 'rgba(0, 0, 0, 0.3)',
          padding: '8px 16px',
          borderRadius: 20,
          backdropFilter: 'blur(5px)',
          zIndex: 100,
        }}
      >
        Speed: <span ref={speedDisplayRef}>640</span> px/s
      </div>
    </div>
  );
}
