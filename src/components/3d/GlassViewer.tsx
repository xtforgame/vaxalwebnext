'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Float } from '@react-three/drei';
import { Suspense, useEffect, useState, useCallback } from 'react';
import MobileLayout3D from './MobileLayout3D';
import type { RootState } from '@react-three/fiber';
import * as THREE from 'three';

export default function GlassViewer() {
  const [contextLost, setContextLost] = useState(false);
  const [canvasKey, setCanvasKey] = useState(0);

  const handleCreated = useCallback((state: RootState) => {
    const canvas = state.gl.domElement;

    const handleContextLost = (event: Event) => {
      event.preventDefault();
      console.warn('WebGL context lost. Attempting recovery...');
      setContextLost(true);
    };

    const handleContextRestored = () => {
      console.log('WebGL context restored.');
      setContextLost(false);
    };

    canvas.addEventListener('webglcontextlost', handleContextLost);
    canvas.addEventListener('webglcontextrestored', handleContextRestored);

    interface RecoverableRenderer extends THREE.WebGLRenderer {
      __cleanupListeners?: () => void;
    }

    // Cleanup function - store in state.gl for disposal
    (state.gl as RecoverableRenderer).__cleanupListeners = () => {
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      canvas.removeEventListener('webglcontextrestored', handleContextRestored);
    };
  }, []);

  // Force re-mount canvas when context is lost
  useEffect(() => {
    if (contextLost) {
      const timer = setTimeout(() => {
        setCanvasKey(prev => prev + 1);
        setContextLost(false);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [contextLost]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Force garbage collection hint
      if (typeof window !== 'undefined') {
        const canvases = document.querySelectorAll('canvas');
        canvases.forEach(canvas => {
          const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
          if (gl) {
            const ext = gl.getExtension('WEBGL_lose_context');
            if (ext) ext.loseContext();
          }
        });
      }
    };
  }, []);

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
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: '#f8fafc',
        zIndex: 100,
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
