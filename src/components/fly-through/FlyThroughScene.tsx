'use client';

import { Suspense, useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useWebGLRecovery } from '@/hooks/useWebGLRecovery';
import { FlyThroughCamera, DEFAULT_WAYPOINTS } from './FlyThroughCamera';

// ============ Constants ============

const CUBE_COUNT = 200;
const SPEED = 0.02; // full loop in ~50 seconds
const SCATTER_RADIUS = 25; // how far cubes spread from path center

// ============ Cube Field (InstancedMesh) ============

function CubeField() {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  // Generate random cube transforms and colors once
  const { matrices, colors } = useMemo(() => {
    const dummy = new THREE.Object3D();
    const mats: THREE.Matrix4[] = [];
    const cols: Float32Array = new Float32Array(CUBE_COUNT * 3);
    const color = new THREE.Color();

    // Scatter cubes along and around the flight path
    for (let i = 0; i < CUBE_COUNT; i++) {
      // Position: spread across the volume the camera flies through
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * SCATTER_RADIUS;
      const x = Math.cos(angle) * radius + (Math.random() - 0.5) * 20;
      const y = (Math.random() - 0.5) * 40;
      const z = Math.random() * 110 - 15; // along the Z span of the path

      dummy.position.set(x, y, z);
      dummy.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      const scale = 0.3 + Math.random() * 1.7;
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      mats.push(dummy.matrix.clone());

      // Color: varied hue, moderate saturation and lightness
      color.setHSL(Math.random(), 0.6 + Math.random() * 0.3, 0.4 + Math.random() * 0.3);
      cols[i * 3] = color.r;
      cols[i * 3 + 1] = color.g;
      cols[i * 3 + 2] = color.b;
    }

    return { matrices: mats, colors: cols };
  }, []);

  // Apply matrices and colors after mount (ref is available in useEffect)
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const color = new THREE.Color();
    for (let i = 0; i < CUBE_COUNT; i++) {
      mesh.setMatrixAt(i, matrices[i]);
      color.setRGB(colors[i * 3], colors[i * 3 + 1], colors[i * 3 + 2]);
      mesh.setColorAt(i, color);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [matrices, colors]);

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, CUBE_COUNT]} frustumCulled={false}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial roughness={0.4} metalness={0.3} />
    </instancedMesh>
  );
}

// ============ Camera Controller ============

function CameraRig() {
  const { camera } = useThree();
  const tRef = useRef(0);
  const lightRef = useRef<THREE.PointLight>(null);

  const flyCamera = useMemo(
    () => new FlyThroughCamera(DEFAULT_WAYPOINTS, 0.35),
    []
  );

  useFrame((_, delta) => {
    tRef.current = (tRef.current + delta * SPEED) % 1;
    const { position, lookAt } = flyCamera.evaluate(tRef.current);

    camera.position.copy(position);
    camera.lookAt(lookAt);

    // Move point light with camera for local illumination
    if (lightRef.current) {
      lightRef.current.position.copy(position);
    }
  });

  return <pointLight ref={lightRef} intensity={2} distance={30} color="#ffffff" />;
}

// ============ Path Visualization ============

const PATH_TUBE_SEGMENTS = 200;
const PATH_TUBE_RADIUS = 0.15;

function PathLine() {
  const geometry = useMemo(() => {
    const cam = new FlyThroughCamera(DEFAULT_WAYPOINTS, 0.35);
    const curve = cam.getCurve();
    return new THREE.TubeGeometry(curve, PATH_TUBE_SEGMENTS, PATH_TUBE_RADIUS, 8, true);
  }, []);

  return (
    <mesh geometry={geometry} frustumCulled={false}>
      <meshBasicMaterial color="#00ffff" opacity={0.35} transparent />
    </mesh>
  );
}

// ============ Main Scene ============

function Scene({ showPath }: { showPath: boolean }) {
  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[50, 50, 50]} intensity={1} />
      <directionalLight position={[-30, -20, -40]} intensity={0.3} color="#4488ff" />
      <CubeField />
      <CameraRig />
      {showPath && <PathLine />}
    </>
  );
}

// ============ Exported Component ============

export default function FlyThroughScene() {
  const { contextLost, canvasKey, handleCreated } = useWebGLRecovery('FlyThrough');
  const [showPath, setShowPath] = useState(false);

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
        <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4" />
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
            <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="font-medium">Loading Scene...</p>
          </div>
        }
      >
        <Canvas
          key={canvasKey}
          style={{ height: '100%', width: '100%', display: 'block' }}
          camera={{ fov: 60, near: 0.1, far: 500 }}
          gl={{ antialias: true, alpha: false }}
          frameloop="always"
          dpr={[1, 2]}
          onCreated={handleCreated}
        >
          <Scene showPath={showPath} />
        </Canvas>
      </Suspense>

      {/* Path toggle button */}
      <button
        onClick={() => setShowPath((v) => !v)}
        style={{
          position: 'absolute',
          bottom: 32,
          right: 32,
          zIndex: 200,
          padding: '8px 16px',
          borderRadius: 8,
          border: showPath ? '1px solid rgba(0,255,255,0.6)' : '1px solid rgba(255,255,255,0.2)',
          backgroundColor: showPath ? 'rgba(0,255,255,0.15)' : 'rgba(255,255,255,0.08)',
          color: showPath ? '#00ffff' : 'rgba(255,255,255,0.5)',
          fontSize: 12,
          fontFamily: 'monospace',
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
      >
        {showPath ? 'HIDE PATH' : 'SHOW PATH'}
      </button>
    </div>
  );
}
