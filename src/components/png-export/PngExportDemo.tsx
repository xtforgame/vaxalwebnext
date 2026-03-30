'use client';

import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useCallback } from 'react';

function Scene() {
  return (
    <>
      <ambientLight intensity={1.2} />
      <directionalLight position={[3, 3, 3]} intensity={1.5} />
      <mesh rotation={[0.4, 0.6, 0]}>
        <boxGeometry args={[1.5, 1.5, 1.5]} />
        <meshStandardMaterial color="#4f8cff" />
      </mesh>
      <OrbitControls />
    </>
  );
}

export default function PngExportDemo() {
  const handleExport = useCallback(() => {
    const canvas = document.querySelector('canvas');
    if (!(canvas instanceof HTMLCanvasElement)) return;

    const dataURL = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataURL;
    a.download = 'transparent-image.png';
    a.click();
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <button
        onClick={handleExport}
        style={{
          position: 'absolute',
          top: 20,
          left: 20,
          zIndex: 10,
          padding: '8px 16px',
          fontSize: 16,
          cursor: 'pointer',
        }}
      >
        匯出透明 PNG
      </button>

      <Canvas
        gl={{
          alpha: true,
          preserveDrawingBuffer: true,
          antialias: true,
        }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
        }}
        camera={{ position: [0, 0, 5], fov: 45 }}
        style={{ background: 'transparent' }}
      >
        <Scene />
      </Canvas>
    </div>
  );
}
