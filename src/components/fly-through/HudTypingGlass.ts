import * as THREE from 'three';

// ============ Constants (adjustable) ============

const HUD_WIDTH = 2.0;
const HUD_HEIGHT = 0.45;
const HUD_DEPTH = 0.06;
const HUD_DISTANCE = 3.0;
const HUD_Y_OFFSET = -0.9;
const HUD_TILT = -0.0;         // radians, negative = top tilts away from camera (後傾)

const HUD_CANVAS_W = 1024;
const HUD_CANVAS_H = 256;
const HUD_TYPING_SPEED = 0.05;  // seconds per character
const HUD_PAUSE_DURATION = 2.0; // seconds between messages
const HUD_CURSOR_BLINK = 0.53;  // seconds per blink toggle

const HUD_TYPING_MESSAGES = [
  'Initializing neural pathways...',
  'Scanning quantum environment...',
  'Loading holographic display...',
  'Rendering volumetric data...',
  'System calibration complete.',
];

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
    messageIndex: number;
    charIndex: number;
    lastCharTime: number;
    lastCursorBlink: number;
    cursorVisible: boolean;
    isPausing: boolean;
    pauseStart: number;
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
    opacity: 0.45,
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
      messageIndex: 0,
      charIndex: 0,
      lastCharTime: 0,
      lastCursorBlink: 0,
      cursorVisible: true,
      isPausing: false,
      pauseStart: 0,
    },
  };
}

// ============ Update (call every frame) ============

export function updateHudTypingGlass(
  res: HudTypingGlassResources,
  camera: THREE.Camera,
  time: number
): void {
  // Position HUD in front of camera, offset downward
  _forward.set(0, 0, -1).applyQuaternion(camera.quaternion);
  _up.set(0, 1, 0).applyQuaternion(camera.quaternion);
  res.group.position.copy(camera.position)
    .addScaledVector(_forward, HUD_DISTANCE)
    .addScaledVector(_up, HUD_Y_OFFSET);
  res.group.quaternion.copy(camera.quaternion);

  // Apply tilt (top tilts away from camera when negative)
  if (HUD_TILT !== 0) {
    _tiltQ.setFromAxisAngle(_up.set(1, 0, 0), HUD_TILT);
    res.group.quaternion.multiply(_tiltQ);
  }

  // --- Typing animation ---
  const typing = res.typing;
  const msg = HUD_TYPING_MESSAGES[typing.messageIndex];

  if (!typing.isPausing) {
    if (time - typing.lastCharTime > HUD_TYPING_SPEED) {
      typing.charIndex++;
      typing.lastCharTime = time;
      if (typing.charIndex > msg.length) {
        typing.isPausing = true;
        typing.pauseStart = time;
      }
    }
  } else if (time - typing.pauseStart > HUD_PAUSE_DURATION) {
    typing.isPausing = false;
    typing.messageIndex = (typing.messageIndex + 1) % HUD_TYPING_MESSAGES.length;
    typing.charIndex = 0;
    typing.lastCharTime = time;
  }

  if (time - typing.lastCursorBlink > HUD_CURSOR_BLINK) {
    typing.cursorVisible = !typing.cursorVisible;
    typing.lastCursorBlink = time;
  }

  // --- Render text to canvas ---
  const { ctx, canvas: cvs } = res;
  ctx.clearRect(0, 0, cvs.width, cvs.height);

  // Subtle dark background for readability
  ctx.fillStyle = 'rgba(0, 5, 15, 0.35)';
  ctx.fillRect(0, 0, cvs.width, cvs.height);

  const displayText = msg.substring(0, Math.min(typing.charIndex, msg.length));
  const textX = 40;
  const textY = cvs.height / 2;

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

  // Blinking cursor
  if (typing.cursorVisible && typing.charIndex <= msg.length) {
    const textWidth = ctx.measureText(displayText).width;
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 8;
    ctx.fillRect(textX + textWidth + 4, textY - 22, 3, 44);
    ctx.shadowBlur = 0;
  }

  res.texture.needsUpdate = true;
}

// ============ Dispose ============

export function disposeHudTypingGlass(res: HudTypingGlassResources): void {
  res.glassGeo.dispose();
  res.glassMat.dispose();
  res.textGeo.dispose();
  res.textMat.dispose();
  res.texture.dispose();
}
