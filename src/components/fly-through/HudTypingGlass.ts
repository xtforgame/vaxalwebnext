import * as THREE from 'three';

// ============ Constants (visual / layout) ============

const HUD_WIDTH = 2.0;
const HUD_HEIGHT = 0.25; // 0.45
const HUD_DEPTH = 0.06;
const HUD_DISTANCE = 3.0;
const HUD_Y_OFFSET = 0.2;
const HUD_TILT = -0.0;           // radians, negative = top tilts away from camera (後傾)

const HUD_GLASS_OPACITY = 0.45;  // glass material target opacity

const HUD_CANVAS_W = 1024;
const HUD_CANVAS_H = 128; // 256

// ============ Helpers ============

function smoothstep01(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

// ============ Reusable temporaries (no GC) ============

const _forward = new THREE.Vector3();
const _up = new THREE.Vector3();
const _tiltQ = new THREE.Quaternion();

// ============ Rounded box geometry ============

function createRoundedBoxGeometry(
  width: number,
  height: number,
  depth: number,
  radius: number,
  segments: number = 8
): THREE.BufferGeometry {
  const maxRadius = Math.min(width, height, depth) / 2;
  const r = Math.min(radius, maxRadius);
  const shape = new THREE.Shape();
  const w = width / 2 - r;
  const h = height / 2 - r;
  shape.moveTo(-w, -height / 2);
  shape.lineTo(w, -height / 2);
  shape.quadraticCurveTo(width / 2, -height / 2, width / 2, -h);
  shape.lineTo(width / 2, h);
  shape.quadraticCurveTo(width / 2, height / 2, w, height / 2);
  shape.lineTo(-w, height / 2);
  shape.quadraticCurveTo(-width / 2, height / 2, -width / 2, h);
  shape.lineTo(-width / 2, -h);
  shape.quadraticCurveTo(-width / 2, -height / 2, -w, -height / 2);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: depth - r * 2,
    bevelEnabled: true,
    bevelThickness: r,
    bevelSize: r,
    bevelOffset: 0,
    bevelSegments: segments,
    curveSegments: segments,
  });
  geometry.translate(0, 0, -(depth - r * 2) / 2 - r);
  geometry.computeVertexNormals();
  return geometry;
}

// ============ Types ============

export interface HudTimingConfig {
  appearDelay: number;
  appearDuration: number;
  slideDistance: number;
  typingDelay: number;
  typingSpeed: number;
  messages: string[];
  messagePause: number;
  cursorBlink: number;
}

export interface HudTypingGlassResources {
  group: THREE.Group;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  texture: THREE.CanvasTexture;
  glassMat: THREE.MeshPhysicalMaterial;
  textMat: THREE.MeshBasicMaterial;
  glassGeo: THREE.BufferGeometry;
  textGeo: THREE.PlaneGeometry;
  typing: {
    started: boolean;
    messageIndex: number;
    charIndex: number;
    lastCharTime: number;
    lastCursorBlink: number;
    cursorVisible: boolean;
    isPausing: boolean;
    pauseStart: number;
    done: boolean;
  };
}

// ============ Create ============

export function createHudTypingGlass(
  envMap: THREE.CubeTexture
): HudTypingGlassResources {
  const canvas = document.createElement('canvas');
  canvas.width = HUD_CANVAS_W;
  canvas.height = HUD_CANVAS_H;
  const ctx = canvas.getContext('2d')!;
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;

  const glassGeo = createRoundedBoxGeometry(HUD_WIDTH, HUD_HEIGHT, HUD_DEPTH, 0.03, 6);
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#88ccff'),
    transparent: true,
    opacity: 0,            // start invisible
    roughness: 0.05,
    metalness: 0.1,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1,
    envMap,
    envMapIntensity: 0.8,
    side: THREE.DoubleSide,
  });

  const textGeo = new THREE.PlaneGeometry(HUD_WIDTH * 0.92, HUD_HEIGHT * 0.85);
  const textMat = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: 0,            // start invisible
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const group = new THREE.Group();
  group.add(new THREE.Mesh(glassGeo, glassMat));
  const textMesh = new THREE.Mesh(textGeo, textMat);
  textMesh.position.z = HUD_DEPTH / 2 + 0.005;
  group.add(textMesh);

  return {
    group,
    canvas,
    ctx,
    texture,
    glassMat,
    textMat,
    glassGeo,
    textGeo,
    typing: {
      started: false,
      messageIndex: 0,
      charIndex: 0,
      lastCharTime: 0,
      lastCursorBlink: 0,
      cursorVisible: true,
      isPausing: false,
      pauseStart: 0,
      done: false,
    },
  };
}

// ============ Update (call every frame) ============

export function updateHudTypingGlass(
  res: HudTypingGlassResources,
  camera: THREE.Camera,
  time: number,
  liftOffset: number,
  cfg: HudTimingConfig
): boolean {
  const appearEnd = cfg.appearDelay + cfg.appearDuration;
  const typingStart = appearEnd + cfg.typingDelay;

  // --- Hidden phase: not yet time to appear ---
  if (time < cfg.appearDelay) {
    res.glassMat.opacity = 0;
    res.textMat.opacity = 0;
    return false;
  }

  // --- Position HUD in front of camera ---
  _forward.set(0, 0, -1).applyQuaternion(camera.quaternion);
  _up.set(0, 1, 0).applyQuaternion(camera.quaternion);
  res.group.position.copy(camera.position)
    .addScaledVector(_forward, HUD_DISTANCE)
    .addScaledVector(_up, HUD_Y_OFFSET + liftOffset);

  // --- Entrance animation: fade-in + slide up ---
  if (time < appearEnd) {
    const t = smoothstep01((time - cfg.appearDelay) / cfg.appearDuration);
    res.glassMat.opacity = HUD_GLASS_OPACITY * t;
    res.textMat.opacity = t;
    // Slide upward from below: offset down by remaining distance
    res.group.position.addScaledVector(_up, -cfg.slideDistance * (1 - t));
  } else {
    res.glassMat.opacity = HUD_GLASS_OPACITY;
    res.textMat.opacity = 1;
  }

  // --- Orientation ---
  res.group.quaternion.copy(camera.quaternion);
  if (HUD_TILT !== 0) {
    _tiltQ.setFromAxisAngle(_up.set(1, 0, 0), HUD_TILT);
    res.group.quaternion.multiply(_tiltQ);
  }

  // --- Typing animation (only after typing delay) ---
  const typing = res.typing;

  if (time >= typingStart) {
    if (!typing.started) {
      typing.started = true;
      typing.lastCharTime = time;
      typing.lastCursorBlink = time;
    }

    const msg = cfg.messages[typing.messageIndex];

    if (typing.done) {
      // Finished — keep showing final message
    } else if (!typing.isPausing) {
      if (time - typing.lastCharTime > cfg.typingSpeed) {
        typing.charIndex++;
        typing.lastCharTime = time;
        if (typing.charIndex > msg.length) {
          if (typing.messageIndex >= cfg.messages.length - 1) {
            typing.done = true;
          } else {
            typing.isPausing = true;
            typing.pauseStart = time;
          }
        }
      }
    } else if (time - typing.pauseStart > cfg.messagePause) {
      typing.isPausing = false;
      typing.messageIndex++;
      typing.charIndex = 0;
      typing.lastCharTime = time;
    }
  }

  // Cursor always blinks once visible (even before typing starts)
  if (time - typing.lastCursorBlink > cfg.cursorBlink) {
    typing.cursorVisible = !typing.cursorVisible;
    typing.lastCursorBlink = time;
  }

  // --- Render text to canvas ---
  const { ctx, canvas: cvs } = res;
  ctx.clearRect(0, 0, cvs.width, cvs.height);

  const currentMsg = cfg.messages[typing.messageIndex];
  const displayText = typing.started
    ? currentMsg.substring(0, Math.min(typing.charIndex, currentMsg.length))
    : '';
  const textX = 40;
  const textY = cvs.height / 2;

  if (displayText.length > 0) {
    // Glow pass
    ctx.font = 'bold 42px "Courier New", monospace';
    ctx.fillStyle = '#ffffff';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 10;
    ctx.fillText(displayText, textX, textY);

    // Sharp pass on top
    ctx.shadowBlur = 0;
    ctx.fillText(displayText, textX, textY);
  }

  // Blinking cursor (visible even before typing starts — just blinking at origin)
  if (typing.cursorVisible) {
    ctx.font = 'bold 42px "Courier New", monospace';
    const textWidth = displayText.length > 0 ? ctx.measureText(displayText).width : 0;
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 8;
    ctx.fillRect(textX + textWidth + 4, textY - 22, 3, 44);
    ctx.shadowBlur = 0;
  }

  res.texture.needsUpdate = true;
  return typing.done;
}

// ============ Reset (for loop restart) ============

export function resetHudTypingGlass(res: HudTypingGlassResources): void {
  const t = res.typing;
  t.started = false;
  t.messageIndex = 0;
  t.charIndex = 0;
  t.lastCharTime = 0;
  t.lastCursorBlink = 0;
  t.cursorVisible = true;
  t.isPausing = false;
  t.pauseStart = 0;
  t.done = false;
  res.glassMat.opacity = 0;
  res.textMat.opacity = 0;
}

// ============ Dispose ============

export function disposeHudTypingGlass(res: HudTypingGlassResources): void {
  res.glassGeo.dispose();
  res.glassMat.dispose();
  res.textGeo.dispose();
  res.textMat.dispose();
  res.texture.dispose();
}
