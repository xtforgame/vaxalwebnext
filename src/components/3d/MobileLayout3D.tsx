'use client';

import { Text, useTexture } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { GlassMaterial } from './GlassMaterial';

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function easeInCubic(t: number): number {
  return t * t * t;
}

/**
 * Creates a proper 3D rounded box geometry with beveled edges on all axes
 */
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

  const extrudeSettings: THREE.ExtrudeGeometryOptions = {
    depth: depth - r * 2,
    bevelEnabled: true,
    bevelThickness: r,
    bevelSize: r,
    bevelOffset: 0,
    bevelSegments: segments,
    curveSegments: segments,
  };

  const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  geometry.translate(0, 0, -(depth - r * 2) / 2 - r);
  geometry.computeVertexNormals();

  return geometry;
}

interface GlassPanelProps {
  width?: number;
  height?: number;
  depth?: number;
  radius?: number;
  color?: string;
  position?: [number, number, number];
  label?: string;
  image?: string;
  imageScale?: number;
  opacity?: number;
  ior?: number;
  chromaticAberration?: number;
  reflectivity?: number;
  absorption?: number;
}

function ImagePlane({ src, panelWidth, panelHeight, depth, scale = 0.8 }: {
  src: string;
  panelWidth: number;
  panelHeight: number;
  depth: number;
  scale?: number;
}) {
  const texture = useTexture(src);
  const img = texture.image as HTMLImageElement;
  const aspect = img.width / img.height;
  const maxW = panelWidth * scale;
  const maxH = panelHeight * scale;
  let w = maxW;
  let h = w / aspect;
  if (h > maxH) {
    h = maxH;
    w = h * aspect;
  }

  return (
    <mesh position={[0, 0, depth / 2 + 0.01]}>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial map={texture} transparent />
    </mesh>
  );
}

const GlassPanel = ({
  width = 1,
  height = 1,
  depth = 0.1,
  radius = 0.05,
  color = '#ffffff',
  position = [0, 0, 0],
  label = '',
  image,
  imageScale,
  opacity = 0.12,
  ior = 1.45,
  chromaticAberration = 0.5,
  reflectivity = 1.0,
  absorption = 3.0,
}: GlassPanelProps) => {
  const geometry = useMemo(
    () => createRoundedBoxGeometry(width, height, depth, radius, 6),
    [width, height, depth, radius]
  );

  return (
    <group position={position}>
      <mesh geometry={geometry} renderOrder={position[2]}>
        <GlassMaterial
          color={color}
          opacity={opacity}
          ior={ior}
          chromaticAberration={chromaticAberration}
          reflectivity={reflectivity}
          envMapIntensity={1.2}
          fresnelPower={1.5}
          thickness={depth}
          absorption={absorption}
        />
      </mesh>
      {image ? (
        <ImagePlane src={image} panelWidth={width} panelHeight={height} depth={depth} scale={imageScale} />
      ) : label ? (
        <Text
          position={[0, 0, depth / 2 + 0.01]}
          fontSize={0.15}
          color="#334155"
          anchorX="center"
          anchorY="middle"
          font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf"
        >
          {label}
        </Text>
      ) : null}
    </group>
  );
};

function AnimatedGlassPanel({
  delay,
  fromLeft,
  ...panelProps
}: GlassPanelProps & { delay: number; fromLeft?: boolean }) {
  const ref = useRef<THREE.Group>(null);
  const pos = panelProps.position ?? [0, 0, 0];
  const finalX = pos[0];
  const finalZ = pos[2];
  const startX = fromLeft ? -8 : 8;
  const settleOffset = 0.4;

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.getElapsedTime() - delay;

    if (t < 0) {
      ref.current.position.set(startX, pos[1], finalZ + settleOffset);
      return;
    }

    if (t < 0.6) {
      const p = easeOutCubic(t / 0.6);
      ref.current.position.x = startX + (finalX - startX) * p;
      ref.current.position.z = finalZ + settleOffset;
    } else if (t < 1.4) {
      ref.current.position.x = finalX;
      ref.current.position.z = finalZ + settleOffset;
    } else if (t < 1.8) {
      const p = easeOutCubic((t - 1.4) / 0.4);
      ref.current.position.x = finalX;
      ref.current.position.z = finalZ + settleOffset * (1 - p);
    } else {
      ref.current.position.set(finalX, pos[1], finalZ);
    }
  });

  return (
    <group ref={ref} position={[startX, pos[1], finalZ + settleOffset]}>
      <GlassPanel {...panelProps} position={[0, 0, 0]} />
    </group>
  );
}

const theFirstDealy = 2.5;
const deltaDelay = 0.5;

// Camera end position: along panel normal (-PI/6 tilt → normal = (0, sin30, cos30))
const CAMERA_DISTANCE = 18;
const CAMERA_END = new THREE.Vector3(
  0,
  CAMERA_DISTANCE * Math.sin(Math.PI / 6),  // 9
  CAMERA_DISTANCE * Math.cos(Math.PI / 6),  // 15.6
);
const CAMERA_TARGET = new THREE.Vector3(0, 0, 0);
const CAMERA_DIR = CAMERA_END.clone().normalize();

// Zoom-in + spin transition
const zoomDelay = 0;       // 轉正後等多久開始拉近（可為負數＝提前開始）
const zoomDuration = 0.8;    // 拉近動畫時間
const zoomIn = 2;            // 拉近後鏡頭距離（越小越近）
const spinDuration = 1.2;    // 旋轉過場時間（含減速尾巴）

export default function MobileLayout3D() {
  const group = useRef<THREE.Group>(null);
  const cameraStartPos = useRef<THREE.Vector3 | null>(null);
  const cameraStartTarget = useRef<THREE.Vector3 | null>(null);
  const cameraAnimActive = useRef(false);
  const cameraAnimDone = useRef(false);

  // Replicate Float{speed=2, rotationIntensity=0.5, floatIntensity=0.5}
  // then fade out after assembly completes
  const assemblyEnd = theFirstDealy + (deltaDelay * 7) + 1.8;
  const fadeDelay = 0.5; // 組裝完成後等待多久才開始歸位
  const fadeDuration = 2.0;

  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.getElapsedTime();

    const fadeStart = assemblyEnd + fadeDelay;

    // Float oscillation — skip after cinematic ends to preserve spin rotation
    if (!cameraAnimDone.current) {
      let intensity = 1.0;
      if (t > fadeStart) {
        intensity = Math.max(0, 1 - easeOutCubic((t - fadeStart) / fadeDuration));
      }

      // Exact Float formula: speed=2 → t/4*2 = t/2
      group.current.rotation.x = -Math.PI / 6 + Math.cos(t / 2) / 16 * intensity;
      group.current.rotation.y = Math.sin(t / 2) / 16 * intensity;
      group.current.rotation.z = Math.sin(t / 2) / 40 * intensity;
      group.current.position.y = Math.sin(t / 2) / 20 * intensity;
    }

    // Camera animation: move to head-on view in sync with fade
    const controls = state.controls as any;
    if (t > fadeStart && controls && !cameraAnimActive.current && !cameraAnimDone.current) {
      cameraStartPos.current = state.camera.position.clone();
      cameraStartTarget.current = controls.target.clone();
      controls.enabled = false;
      cameraAnimActive.current = true;
    }

    if (cameraAnimActive.current && cameraStartPos.current) {
      const straightenDur = fadeDuration / 2;
      const straightenEnd = fadeStart + straightenDur;
      const zoomStart = straightenEnd + zoomDelay;
      const zoomEnd = zoomStart + zoomDuration;
      const spinStart = zoomEnd;
      const spinEnd = spinStart + spinDuration;
      const closePos = CAMERA_DIR.clone().multiplyScalar(zoomIn);

      if (t < straightenEnd) {
        // Phase 1: Straighten
        const p = Math.min(1, easeOutCubic((t - fadeStart) / straightenDur));
        state.camera.position.lerpVectors(cameraStartPos.current, CAMERA_END, p);
        const lerpTarget = cameraStartTarget.current!.clone().lerp(CAMERA_TARGET, p);
        state.camera.lookAt(lerpTarget);
      } else if (t < zoomStart) {
        // Hold: wait between straighten and zoom
        state.camera.position.copy(CAMERA_END);
        state.camera.lookAt(CAMERA_TARGET);
      } else if (t < zoomEnd) {
        // Phase 2: Zoom in (accelerating rush)
        const p = easeInCubic((t - zoomStart) / zoomDuration);
        state.camera.position.lerpVectors(CAMERA_END, closePos, p);
        state.camera.lookAt(CAMERA_TARGET);
      } else if (t < spinEnd) {
        // Phase 3: Whip spin — fast start, natural deceleration, multi-axis
        state.camera.position.copy(closePos);
        state.camera.lookAt(CAMERA_TARGET);
        const p = easeOutCubic((t - spinStart) / spinDuration);
        group.current!.rotation.y = p * Math.PI * 6;
        group.current!.rotation.x = -Math.PI / 6 + p * Math.PI * 0.8;
        group.current!.rotation.z = Math.sin(p * Math.PI * 2) * 0.3;
      } else {
        // Done — lock in final spin rotation (float code may have overwritten it this frame)
        group.current!.rotation.y = Math.PI * 6;
        group.current!.rotation.x = -Math.PI / 6 + Math.PI * 0.8;
        group.current!.rotation.z = 0;

        controls.target.copy(CAMERA_TARGET);
        controls.enabled = true;
        controls.update();
        cameraAnimActive.current = false;
        cameraAnimDone.current = true;
      }
    }

    state.invalidate();
  });

  return (
    <group ref={group} rotation={[-Math.PI / 6, 0, 0]}>
      {/* 1. Base Device Frame - 淡紫色 */}
      <GlassPanel
        width={4.2}
        height={8.8}
        depth={0.3}
        radius={0.15}
        color="#c4b5fd"
        position={[0, 0, 0]}
        opacity={0.15}
        chromaticAberration={0.3}
      />

      {/* 2. Main Screen Layer - 淡藍色 */}
      <GlassPanel
        width={3.8}
        height={8.2}
        depth={0.08}
        radius={0.04}
        color="#bae6fd"
        position={[0, 0, 0.25]}
        opacity={0.1}
        chromaticAberration={0.4}
      />

      {/* 3. Status Bar - 淡粉色 */}
      <AnimatedGlassPanel
        delay={theFirstDealy + (deltaDelay * 1)} fromLeft={false}
        width={3.4}
        height={0.3}
        depth={0.04}
        radius={0.02}
        color="#fecdd3"
        position={[0, 3.7, 0.5]}
        opacity={0.12}
      />

      {/* 4. Navigation Header - 淡青色 */}
      <AnimatedGlassPanel
        delay={theFirstDealy + (deltaDelay * 2)} fromLeft={true}
        width={3.4}
        height={0.7}
        depth={0.06}
        radius={0.03}
        color="#a5f3fc"
        position={[0, 3.1, 0.7]}
        image="/studiodoe.png"
        imageScale={0.75}
        opacity={0.12}
      />

      {/* 5. Search Bar - 淡綠色 */}
      <AnimatedGlassPanel
        delay={theFirstDealy + (deltaDelay * 3)} fromLeft={false}
        width={3.2}
        height={0.6}
        depth={0.06}
        radius={0.03}
        color="#bbf7d0"
        position={[0, 2.2, 0.9]}
        label="Search..."
        opacity={0.12}
      />

      {/* 6. Hero Card - 天藍色 */}
      <AnimatedGlassPanel
        delay={theFirstDealy + (deltaDelay * 4)} fromLeft={true}
        width={3.2}
        height={2.0}
        depth={0.12}
        radius={0.06}
        color="#38bdf8"
        position={[0, 0.6, 1.1]}
        label="Premium 3D"
        opacity={0.2}
        chromaticAberration={0.8}
        reflectivity={1.2}
      />

      {/* 7. Action Grid - 各種淡色 */}
      <AnimatedGlassPanel delay={theFirstDealy + (deltaDelay * 5)} fromLeft={false} width={0.7} height={0.7} depth={0.06} radius={0.03} color="#fca5a5" position={[-1.2, -1.0, 1.3]} label="AI" opacity={0.15} />
      <AnimatedGlassPanel delay={theFirstDealy + (deltaDelay * 5) + 0.1} fromLeft={false} width={0.7} height={0.7} depth={0.06} radius={0.03} color="#fdba74" position={[-0.4, -1.0, 1.3]} label="Web" opacity={0.15} />
      <AnimatedGlassPanel delay={theFirstDealy + (deltaDelay * 5) + 0.2} fromLeft={false} width={0.7} height={0.7} depth={0.06} radius={0.03} color="#fde047" position={[0.4, -1.0, 1.3]} label="App" opacity={0.15} />
      <AnimatedGlassPanel delay={theFirstDealy + (deltaDelay * 5) + 0.3} fromLeft={false} width={0.7} height={0.7} depth={0.06} radius={0.03} color="#86efac" position={[1.2, -1.0, 1.3]} label="Cloud" opacity={0.15} />

      {/* 8. List Items - 淡紫/淡藍 */}
      <AnimatedGlassPanel delay={theFirstDealy + (deltaDelay * 6)} fromLeft={true} width={3.2} height={0.8} depth={0.06} radius={0.03} color="#d8b4fe" position={[0, -2.4, 1.5]} label="Item Alpha" opacity={0.12} />
      <AnimatedGlassPanel delay={theFirstDealy + (deltaDelay * 7)} fromLeft={false} width={3.2} height={0.8} depth={0.06} radius={0.03} color="#93c5fd" position={[0, -3.4, 1.7]} label="Item Beta" opacity={0.12} />

      {/* 9. Bottom Navigation - 深藍色玻璃 */}
      {/* <AnimatedGlassPanel
        delay={theFirstDealy + (deltaDelay * 8)} fromLeft={true}
        width={3.6}
        height={0.9}
        depth={0.12}
        radius={0.06}
        color="#1e3a5f"
        position={[0, -4.0, 1.9]}
        label="Home | Search | Settings"
        opacity={0.25}
        chromaticAberration={0.6}
      /> */}
    </group>
  );
}
