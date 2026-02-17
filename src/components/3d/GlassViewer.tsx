'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Float } from '@react-three/drei';
import { Suspense } from 'react';
import MobileLayout3D from './MobileLayout3D';

export default function GlassViewer() {
  return (
    <div className="w-full h-[80vh] min-h-[600px] bg-slate-100 rounded-3xl overflow-hidden relative shadow-inner">
      <Suspense fallback={
        <div className="flex flex-col items-center justify-center w-full h-full text-slate-400">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="font-medium">Initializing 3D Engine...</p>
        </div>
      }>
        <Canvas
          shadows
          camera={{ position: [-8, 6, 15], fov: 35 }}
          gl={{ antialias: true, alpha: true }}
          dpr={[1, 2]}
        >
          <color attach="background" args={['#f8fafc']} />
          
          <ambientLight intensity={0.7} />
          <spotLight position={[10, 15, 10]} angle={0.3} penumbra={1} intensity={2} castShadow />
          <pointLight position={[-10, -10, -10]} intensity={1} color="#3DB5E6" />
          
          <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
            <MobileLayout3D />
          </Float>

          <OrbitControls 
            makeDefault 
            enableDamping={true}
            minPolarAngle={Math.PI / 4}
            maxPolarAngle={Math.PI / 1.5}
          />
          
          <Environment preset="apartment" />
          
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
