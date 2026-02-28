'use client';

import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, ContactShadows, Float, useCubeTexture, useTexture } from '@react-three/drei';
import { Suspense } from 'react';
import MobileLayout3D from './MobileLayout3D';
import * as THREE from 'three';
import { useWebGLRecovery } from '@/hooks/useWebGLRecovery';

function SkyboxEnvironment() {
  const { scene } = useThree();
  const cubeTexture = useCubeTexture(
    ['posx.jpg', 'negx.jpg', 'posy.jpg', 'negy.jpg', 'posz.jpg', 'negz.jpg'],
    { path: '/skybox/' }
  );

  cubeTexture.colorSpace = THREE.SRGBColorSpace;
  scene.background = cubeTexture;
  scene.environment = cubeTexture;

  return null;
}

function PanoramaEnvironment() {
  const { scene } = useThree();
  const texture = useTexture('/panas/scifi_dark_scary_laboratory_metallic_doors (4).jpg');

  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  scene.background = texture;
  scene.environment = texture;

  return null;
}

export default function GlassViewer() {
  const { contextLost, canvasKey, handleCreated } = useWebGLRecovery('GlassViewer');

  if (contextLost) {
    return (
      <div className="w-full h-[80vh] min-h-[600px] bg-slate-100 rounded-3xl overflow-hidden relative shadow-inner flex flex-col items-center justify-center text-slate-400">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="font-medium">Recovering 3D Engine...</p>
      </div>
    );
  }

  return (
    <div 
      style={{
        width: '100vw',
        height: '100vh',
        backgroundColor: '#f8fafc',
        overflow: 'hidden'
      }}
    >
      <Suspense fallback={
        <div className="flex flex-col items-center justify-center w-full h-full text-slate-400">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="font-medium">Initializing 3D Engine...</p>
        </div>
      }>
        <Canvas
          key={canvasKey}
          shadows
          style={{ height: '100%', width: '100%', display: 'block' }}
          camera={{ position: [-8, 6, 15], fov: 35 }}
          gl={{
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance',
            failIfMajorPerformanceCaveat: false,
          }}
          dpr={[1, 1.5]}
          onCreated={handleCreated}
          frameloop="demand"
        >
          <ambientLight intensity={0.5} />
          <spotLight position={[10, 15, 10]} angle={0.3} penumbra={1} intensity={1.5} castShadow />
          <pointLight position={[-10, -10, -10]} intensity={0.8} color="#3DB5E6" />

          <MobileLayout3D />

          <OrbitControls
            makeDefault
            enableDamping={true}
            minPolarAngle={Math.PI / 4}
            maxPolarAngle={Math.PI / 1.5}
          />

          <PanoramaEnvironment />

          <ContactShadows
            position={[0, -5, 0]}
            opacity={0.3}
            scale={25}
            blur={2.5}
            far={10}
          />
        </Canvas>
      </Suspense>
    </div>
  );
}
