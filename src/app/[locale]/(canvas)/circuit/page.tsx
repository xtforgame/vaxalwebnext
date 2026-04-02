'use client';

import { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import OneLineShader from './OneLineShader';
import MultiLineShader1 from './MultiLineShader1';
import MultiLineShader2 from './MultiLineShader2';
import CircuitShader from './CircuitShader';

const DEMOS = [
  { id: 'circuit', label: 'Circuit (SVG Data)' },
  { id: 'one-line', label: 'One Line (SDF Glow)' },
  { id: 'multi1', label: 'Multi Line 1 (Curl Noise)' },
  { id: 'multi2', label: 'Multi Line 2 (Cellular)' },
] as const;

type DemoId = (typeof DEMOS)[number]['id'];

export default function CircuitPage() {
  const [active, setActive] = useState<DemoId>('circuit');

  return (
    <main style={{ width: '100vw', height: '100vh', background: '#000', position: 'relative' }}>
      {/* Selector UI */}
      <div
        style={{
          position: 'absolute',
          top: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10,
          display: 'flex',
          gap: 8,
        }}
      >
        {DEMOS.map((d) => (
          <button
            key={d.id}
            onClick={() => setActive(d.id)}
            style={{
              padding: '8px 16px',
              borderRadius: 6,
              border: active === d.id ? '2px solid #0ff' : '1px solid #555',
              background: active === d.id ? 'rgba(0,255,255,0.15)' : 'rgba(0,0,0,0.6)',
              color: active === d.id ? '#0ff' : '#aaa',
              cursor: 'pointer',
              fontSize: 13,
              fontFamily: 'monospace',
              backdropFilter: 'blur(8px)',
            }}
          >
            {d.label}
          </button>
        ))}
      </div>

      <Canvas
        gl={{ antialias: false, stencil: false, depth: false }}
        orthographic
        camera={{ left: -1, right: 1, top: 1, bottom: -1, near: 0, far: 1 }}
        style={{ width: '100%', height: '100%' }}
        frameloop="always"
      >
        {active === 'circuit' && <CircuitShader />}
        {active === 'one-line' && <OneLineShader />}
        {active === 'multi1' && <MultiLineShader1 />}
        {active === 'multi2' && <MultiLineShader2 />}
      </Canvas>
    </main>
  );
}
