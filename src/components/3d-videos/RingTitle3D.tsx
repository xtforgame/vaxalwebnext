'use client';

import { useRef, useState, useEffect, useMemo } from 'react';
import { useThree, useFrame, useLoader } from '@react-three/fiber';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import * as THREE from 'three';
import { useControls, button, folder } from 'leva';
import {
  FRAGMENT_META,
  getRingConfig,
  DEFAULT_RING_CONFIG,
  EASING_MAP,
  type RingConfig,
  type EasingFn,
} from './galleryData';

const FONT_URL = '/fonts/MPLUSRounded1c-Regular.typeface.json';

// ─── Helpers ──────────────────────────────────────────────────
function getEasingName(fn: EasingFn): string {
  for (const [name, f] of Object.entries(EASING_MAP)) {
    if (f === fn) return name;
  }
  return 'easeOutCubic';
}

function bendGeometryOntoRing(
  flatGeo: THREE.ShapeGeometry,
  radius: number,
  yOffset: number = 0,
): THREE.BufferGeometry {
  const geo = flatGeo.clone();
  const posAttr = geo.getAttribute('position') as THREE.BufferAttribute;
  const positions = posAttr.array as Float32Array;

  geo.computeBoundingBox();
  const bb = geo.boundingBox!;
  const centerX = (bb.min.x + bb.max.x) / 2;

  for (let i = 0; i < posAttr.count; i++) {
    const x = positions[i * 3 + 0];
    const y = positions[i * 3 + 1];
    const theta = (x - centerX) / radius;
    positions[i * 3 + 0] = radius * Math.sin(theta);
    positions[i * 3 + 1] = y + yOffset;
    positions[i * 3 + 2] = -radius * Math.cos(theta);
  }

  posAttr.needsUpdate = true;
  geo.computeBoundingBox();
  geo.computeVertexNormals();
  return geo;
}

// ─── Component ────────────────────────────────────────────────
export default function RingTitle3D({
  activeId,
  debug = false,
}: {
  activeId: string | null;
  debug?: boolean;
}) {
  const ringGroupRef = useRef<THREE.Group>(null!);
  const titleMatRef = useRef<THREE.MeshBasicMaterial>(null!);
  const subtitleMatRef = useRef<THREE.MeshBasicMaterial>(null!);
  const { camera } = useThree();

  const font = useLoader(FontLoader, FONT_URL);

  const [displayId, setDisplayId] = useState<string | null>(null);
  const displayIdRef = useRef<string | null>(null);

  // Animation state
  const animProgress = useRef(0);
  const animPhase = useRef<'idle' | 'entering' | 'exiting'>('idle');
  const animStartTime = useRef(0);

  const configRef = useRef<RingConfig>(getRingConfig(''));
  const debugRef = useRef(debug);
  debugRef.current = debug;

  // Pre-allocate reusable objects
  const tiltQuat = useRef(new THREE.Quaternion());
  const offsetVec = useRef(new THREE.Vector3());
  const yRotQuat = useRef(new THREE.Quaternion());
  const yAxis = useRef(new THREE.Vector3(0, 1, 0));

  // Replay trigger for debug
  const replayRef = useRef<'enter' | 'exit' | null>(null);
  const isReplayExit = useRef(false);

  // ── Leva debug controls (always called — panel hidden when !debug) ──
  const D = DEFAULT_RING_CONFIG;
  const easingNames = Object.keys(EASING_MAP);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [levaValues, setLeva] = useControls('Ring Config', () => ({
    Geometry: folder({
      radius: { value: D.radius, min: 0.5, max: 30, step: 0.1 },
      titleFontSize: { value: D.titleFontSize, min: 0.1, max: 5, step: 0.05 },
      subtitleFontSize: { value: D.subtitleFontSize, min: 0.05, max: 2, step: 0.01 },
      subtitleYOffset: { value: D.subtitleYOffset, min: -3, max: 1, step: 0.05 },
    }),
    Position: folder({
      offsetX: { value: D.offsetX, min: -20, max: 20, step: 0.1 },
      offsetY: { value: D.offsetY, min: -20, max: 20, step: 0.1 },
      offsetZ: { value: D.offsetZ, min: -20, max: 20, step: 0.1 },
    }),
    Tilt: folder({
      tiltX: { value: D.tiltX, min: -Math.PI, max: Math.PI, step: 0.01 },
      tiltZ: { value: D.tiltZ, min: -Math.PI, max: Math.PI, step: 0.01 },
    }),
    Animation: folder({
      restAngle: { value: D.restAngle, min: -Math.PI, max: Math.PI, step: 0.01 },
      enterStartAngle: { value: D.enterStartAngle, min: -2 * Math.PI, max: 2 * Math.PI, step: 0.01 },
      exitEndAngle: { value: D.exitEndAngle, min: -2 * Math.PI, max: 2 * Math.PI, step: 0.01 },
      enterDuration: { value: D.enterDuration, min: 100, max: 5000, step: 50 },
      exitDuration: { value: D.exitDuration, min: 100, max: 5000, step: 50 },
      opacityRamp: { value: D.opacityRamp, min: 0, max: 1, step: 0.01 },
      enterEasing: { value: getEasingName(D.enterEasing), options: easingNames },
      exitEasing: { value: getEasingName(D.exitEasing), options: easingNames },
    }),
    Actions: folder({
      'Replay Enter': button(() => { replayRef.current = 'enter'; }),
      'Replay Exit': button(() => { replayRef.current = 'exit'; }),
      'Copy Config': button((get) => {
        const id = displayIdRef.current;
        if (!id) {
          console.warn('[RingDebug] No active fragment');
          return;
        }

        // Read current values directly from leva store
        const d = DEFAULT_RING_CONFIG;
        const parts: string[] = [];

        const numFields: [string, keyof RingConfig][] = [
          ['Ring Config.Geometry.radius', 'radius'],
          ['Ring Config.Geometry.titleFontSize', 'titleFontSize'],
          ['Ring Config.Geometry.subtitleFontSize', 'subtitleFontSize'],
          ['Ring Config.Geometry.subtitleYOffset', 'subtitleYOffset'],
          ['Ring Config.Position.offsetX', 'offsetX'],
          ['Ring Config.Position.offsetY', 'offsetY'],
          ['Ring Config.Position.offsetZ', 'offsetZ'],
          ['Ring Config.Tilt.tiltX', 'tiltX'],
          ['Ring Config.Tilt.tiltZ', 'tiltZ'],
          ['Ring Config.Animation.restAngle', 'restAngle'],
          ['Ring Config.Animation.enterStartAngle', 'enterStartAngle'],
          ['Ring Config.Animation.exitEndAngle', 'exitEndAngle'],
          ['Ring Config.Animation.enterDuration', 'enterDuration'],
          ['Ring Config.Animation.exitDuration', 'exitDuration'],
          ['Ring Config.Animation.opacityRamp', 'opacityRamp'],
        ];

        for (const [path, key] of numFields) {
          const val = get(path) as number;
          const def = d[key] as number;
          if (Math.abs(val - def) > 0.001) {
            parts.push(`${key}: ${Math.round(val * 1000) / 1000}`);
          }
        }

        const enterE = get('Ring Config.Animation.enterEasing') as string;
        if (enterE !== getEasingName(d.enterEasing)) parts.push(`enterEasing: ${enterE}`);
        const exitE = get('Ring Config.Animation.exitEasing') as string;
        if (exitE !== getEasingName(d.exitEasing)) parts.push(`exitEasing: ${exitE}`);

        const snippet = parts.length > 0
          ? `'${id}': { ${parts.join(', ')} },`
          : `'${id}': {},`;

        // Always log to console
        console.log(`[RingDebug] Config for '${id}':\n${snippet}`);

        // Try clipboard (may fail in non-secure context)
        navigator.clipboard.writeText(snippet).catch(() => {
          window.prompt('[RingDebug] Copy this config:', snippet);
        });
      }),
    }),
  }));

  // Build a full RingConfig from current leva values
  const debugConfig = useMemo((): RingConfig => ({
    radius: levaValues.radius,
    offsetX: levaValues.offsetX,
    offsetY: levaValues.offsetY,
    offsetZ: levaValues.offsetZ,
    tiltX: levaValues.tiltX,
    tiltZ: levaValues.tiltZ,
    subtitleYOffset: levaValues.subtitleYOffset,
    restAngle: levaValues.restAngle,
    enterStartAngle: levaValues.enterStartAngle,
    exitEndAngle: levaValues.exitEndAngle,
    enterDuration: levaValues.enterDuration,
    exitDuration: levaValues.exitDuration,
    opacityRamp: levaValues.opacityRamp,
    titleFontSize: levaValues.titleFontSize,
    subtitleFontSize: levaValues.subtitleFontSize,
    enterEasing: EASING_MAP[levaValues.enterEasing] ?? D.enterEasing,
    exitEasing: EASING_MAP[levaValues.exitEasing] ?? D.exitEasing,
  }), [levaValues]);

  const debugConfigRef = useRef<RingConfig>(debugConfig);
  debugConfigRef.current = debugConfig;

  // ── Effect 1: State machine (animation triggers) ──
  useEffect(() => {
    if (activeId) {
      const cfg = getRingConfig(activeId);
      configRef.current = cfg;
      tiltQuat.current.setFromEuler(new THREE.Euler(cfg.tiltX, 0, cfg.tiltZ));

      displayIdRef.current = activeId;
      setDisplayId(activeId);
      animProgress.current = 0;
      animPhase.current = 'entering';
      animStartTime.current = performance.now();
    } else if (displayIdRef.current) {
      animPhase.current = 'exiting';
      animStartTime.current = performance.now();
    }
  }, [activeId]);

  // ── Effect 2: Sync leva controls when fragment changes ──
  useEffect(() => {
    if (!activeId) return;
    const cfg = getRingConfig(activeId);
    setLeva({
      radius: cfg.radius,
      offsetX: cfg.offsetX,
      offsetY: cfg.offsetY,
      offsetZ: cfg.offsetZ,
      tiltX: cfg.tiltX,
      tiltZ: cfg.tiltZ,
      subtitleYOffset: cfg.subtitleYOffset,
      restAngle: cfg.restAngle,
      enterStartAngle: cfg.enterStartAngle,
      exitEndAngle: cfg.exitEndAngle,
      enterDuration: cfg.enterDuration,
      exitDuration: cfg.exitDuration,
      opacityRamp: cfg.opacityRamp,
      titleFontSize: cfg.titleFontSize,
      subtitleFontSize: cfg.subtitleFontSize,
      enterEasing: getEasingName(cfg.enterEasing),
      exitEasing: getEasingName(cfg.exitEasing),
    });
  }, [activeId, setLeva]);

  // ── Effect 3: Live-update configRef when debug controls change ──
  useEffect(() => {
    if (debug && displayId) {
      configRef.current = debugConfig;
      tiltQuat.current.setFromEuler(new THREE.Euler(debugConfig.tiltX, 0, debugConfig.tiltZ));
    } else if (!debug && displayId) {
      const cfg = getRingConfig(displayId);
      configRef.current = cfg;
      tiltQuat.current.setFromEuler(new THREE.Euler(cfg.tiltX, 0, cfg.tiltZ));
    }
  }, [debug, debugConfig, displayId]);

  const meta = displayId ? FRAGMENT_META[displayId] : null;

  // Geometry-relevant values (only rebuild geometry when these change)
  const geoRadius = debug ? debugConfig.radius : (displayId ? getRingConfig(displayId).radius : D.radius);
  const geoTitleSize = debug ? debugConfig.titleFontSize : (displayId ? getRingConfig(displayId).titleFontSize : D.titleFontSize);
  const geoSubtitleSize = debug ? debugConfig.subtitleFontSize : (displayId ? getRingConfig(displayId).subtitleFontSize : D.subtitleFontSize);
  const geoSubtitleYOff = debug ? debugConfig.subtitleYOffset : (displayId ? getRingConfig(displayId).subtitleYOffset : D.subtitleYOffset);

  const titleGeo = useMemo(() => {
    if (!meta) return null;
    const shapes = font.generateShapes(meta.title, geoTitleSize);
    const flatGeo = new THREE.ShapeGeometry(shapes);
    return bendGeometryOntoRing(flatGeo, geoRadius, 0);
  }, [font, meta, geoRadius, geoTitleSize]);

  const subtitleGeo = useMemo(() => {
    if (!meta) return null;
    const shapes = font.generateShapes(meta.subtitle, geoSubtitleSize);
    const flatGeo = new THREE.ShapeGeometry(shapes);
    return bendGeometryOntoRing(flatGeo, geoRadius, geoSubtitleYOff);
  }, [font, meta, geoRadius, geoSubtitleSize, geoSubtitleYOff]);

  // ── Animation loop (priority 0 — after camera controllers at -1) ──
  useFrame(() => {
    if (!ringGroupRef.current) return;

    const c = configRef.current;

    // Handle replay triggers (debug mode)
    if (replayRef.current) {
      if (replayRef.current === 'enter') {
        animProgress.current = 0;
        animPhase.current = 'entering';
        isReplayExit.current = false;
      } else {
        animPhase.current = 'exiting';
        isReplayExit.current = true;
      }
      animStartTime.current = performance.now();
      replayRef.current = null;
    }

    // 1. Update animation progress
    const elapsed = performance.now() - animStartTime.current;

    if (animPhase.current === 'entering') {
      const t = Math.min(1, elapsed / c.enterDuration);
      animProgress.current = c.enterEasing(t);
      if (t >= 1) animPhase.current = 'idle';
    } else if (animPhase.current === 'exiting') {
      const t = Math.min(1, elapsed / c.exitDuration);
      animProgress.current = 1 - c.exitEasing(t);
      if (t >= 1) {
        animPhase.current = 'idle';
        animProgress.current = 0;
        // In debug replay-exit, don't clear display
        if (!isReplayExit.current) {
          displayIdRef.current = null;
          setDisplayId(null);
        }
        isReplayExit.current = false;
      }
    }

    // 2. Position ring centered on camera (+ offset)
    offsetVec.current
      .set(c.offsetX, c.offsetY, c.offsetZ)
      .applyQuaternion(camera.quaternion);
    ringGroupRef.current.position.copy(camera.position).add(offsetVec.current);

    // 3. Compute Y rotation from animation progress
    let yAngle: number;
    if (animPhase.current === 'exiting') {
      yAngle = c.exitEndAngle + (c.restAngle - c.exitEndAngle) * animProgress.current;
    } else {
      yAngle = c.enterStartAngle + (c.restAngle - c.enterStartAngle) * animProgress.current;
    }

    // 4. Compose orientation: camera x tilt x Y-spin
    yRotQuat.current.setFromAxisAngle(yAxis.current, yAngle);
    ringGroupRef.current.quaternion
      .copy(camera.quaternion)
      .multiply(tiltQuat.current)
      .multiply(yRotQuat.current);

    // 5. Opacity ramp
    let opacity: number;
    if (animPhase.current === 'idle' && animProgress.current === 0) {
      opacity = 0;
    } else if (animPhase.current === 'idle' && animProgress.current >= 1) {
      opacity = 1;
    } else if (animPhase.current === 'entering') {
      opacity = Math.min(1, animProgress.current / (1 - c.opacityRamp));
    } else {
      opacity = Math.min(1, animProgress.current / c.opacityRamp);
    }

    if (titleMatRef.current) titleMatRef.current.opacity = opacity;
    if (subtitleMatRef.current) subtitleMatRef.current.opacity = opacity * 0.85;
  });

  if (!meta || !titleGeo) return null;

  return (
    <group ref={ringGroupRef}>
      <mesh geometry={titleGeo} renderOrder={10000}>
        <meshBasicMaterial
          ref={titleMatRef}
          color="white"
          side={THREE.DoubleSide}
          transparent
          opacity={0}
          depthTest={false}
          depthWrite={false}
        />
      </mesh>
      {subtitleGeo && (
        <mesh geometry={subtitleGeo} renderOrder={10000}>
          <meshBasicMaterial
            ref={subtitleMatRef}
            color="white"
            side={THREE.DoubleSide}
            transparent
            opacity={0}
            depthTest={false}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  );
}
