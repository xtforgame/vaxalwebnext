'use client';

import { Suspense, useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { useWebGLRecovery } from '@/hooks/useWebGLRecovery';

// ============ Card dimensions ============

const CARD_WIDTH = 4.5;
const CARD_HEIGHT = CARD_WIDTH / (960 / 622);

// ============ Environment ============

function PanoramaEnvironment() {
  const { scene } = useThree();
  const texture = useTexture('/panas/scifi_dark_scary_laboratory_metallic_doors (4).jpg');

  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  scene.background = texture;
  scene.environment = texture;

  return null;
}

// ============ Credit Card ============

const DRAG_SENSITIVITY = 0.008;
const PAN_SENSITIVITY = 0.01;
const DAMPING = 0.92;

function CreditCard() {
  const groupRef = useRef<THREE.Group>(null);
  const cardTexture = useTexture('/Blue-Credit-Card.png');
  const { gl } = useThree();

  cardTexture.colorSpace = THREE.SRGBColorSpace;

  // Interaction state (refs to avoid re-renders)
  const dragging = useRef(false);
  const panning = useRef(false);
  const prev = useRef({ x: 0, y: 0 });
  const velocity = useRef({ rx: 0, ry: 0 });
  const panVelocity = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = gl.domElement;

    const onPointerDown = (e: PointerEvent) => {
      // Right-click or shift+click = pan, left-click = rotate
      if (e.button === 2 || e.shiftKey) {
        panning.current = true;
      } else {
        dragging.current = true;
      }
      prev.current = { x: e.clientX, y: e.clientY };
      canvas.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      const dx = e.clientX - prev.current.x;
      const dy = e.clientY - prev.current.y;
      prev.current = { x: e.clientX, y: e.clientY };

      if (dragging.current) {
        velocity.current.ry = dx * DRAG_SENSITIVITY;
        velocity.current.rx = dy * DRAG_SENSITIVITY;
      } else if (panning.current) {
        panVelocity.current.x = dx * PAN_SENSITIVITY;
        panVelocity.current.y = -dy * PAN_SENSITIVITY;
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      dragging.current = false;
      panning.current = false;
      canvas.releasePointerCapture(e.pointerId);
    };

    const onContextMenu = (e: Event) => e.preventDefault();

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('contextmenu', onContextMenu);
    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('contextmenu', onContextMenu);
    };
  }, [gl]);

  useFrame(() => {
    const g = groupRef.current;
    if (!g) return;

    if (dragging.current) {
      g.rotation.y += velocity.current.ry;
      g.rotation.x += velocity.current.rx;
      velocity.current.ry = 0;
      velocity.current.rx = 0;
    }

    if (panning.current) {
      g.position.x += panVelocity.current.x;
      g.position.y += panVelocity.current.y;
      panVelocity.current.x = 0;
      panVelocity.current.y = 0;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh castShadow>
        <planeGeometry args={[CARD_WIDTH, CARD_HEIGHT]} />
        <meshPhysicalMaterial
          map={cardTexture}
          transparent
          alphaTest={0.5}
          side={THREE.DoubleSide}
          roughness={0.35}
          metalness={0.1}
          clearcoat={0.6}
          clearcoatRoughness={0.15}
          reflectivity={0.4}
          envMapIntensity={0.8}
        />
      </mesh>
    </group>
  );
}

// ============ Exported Component ============

export default function CardDisplayScene() {
  const { contextLost, canvasKey, handleCreated } = useWebGLRecovery('CardDisplay');

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
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
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
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="font-medium">Loading Scene...</p>
          </div>
        }
      >
        <Canvas
          key={canvasKey}
          shadows
          style={{ height: '100%', width: '100%', display: 'block' }}
          camera={{ position: [0, 0, 8], fov: 40 }}
          gl={{ antialias: true, alpha: false }}
          dpr={[1, 2]}
          onCreated={handleCreated}
        >
          <ambientLight intensity={1.0} />
          <spotLight
            position={[5, 8, 5]}
            angle={0.4}
            penumbra={1}
            intensity={3}
            castShadow
          />
          <pointLight position={[-5, -3, -5]} intensity={1.5} color="#3DB5E6" />
          <pointLight position={[5, 3, 5]} intensity={1} color="#ffffff" />

          <CreditCard />
          <PanoramaEnvironment />
        </Canvas>
      </Suspense>
    </div>
  );
}
