'use client';

import { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import OneLineShader from './OneLineShader';
import MultiLineShader1 from './MultiLineShader1';
import MultiLineShader2 from './MultiLineShader2';
import CircuitShader from './CircuitShader';
import CircuitRadialShader from './CircuitRadialShader';

const DEMOS = [
  { id: 'circuit', label: 'Circuit (Loop)' },
  { id: 'radial', label: 'Circuit (Radial)' },
  { id: 'one-line', label: 'One Line (SDF Glow)' },
  { id: 'multi1', label: 'Multi Line 1 (Curl Noise)' },
  { id: 'multi2', label: 'Multi Line 2 (Cellular)' },
] as const;

type DemoId = (typeof DEMOS)[number]['id'];

const btnStyle = (on: boolean): React.CSSProperties => ({
  padding: '8px 16px',
  borderRadius: 6,
  border: on ? '2px solid #0ff' : '1px solid #555',
  background: on ? 'rgba(0,255,255,0.15)' : 'rgba(0,0,0,0.6)',
  color: on ? '#0ff' : '#aaa',
  cursor: 'pointer',
  fontSize: 13,
  fontFamily: 'monospace',
  backdropFilter: 'blur(8px)',
});

export default function CircuitPage() {
  const [active, setActive] = useState<DemoId>('circuit');
  const [radialKey, setRadialKey] = useState(0);
  const [showPulse, setShowPulse] = useState(true);

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
            style={btnStyle(active === d.id)}
          >
            {d.label}
          </button>
        ))}
      </div>

      {/* Radial controls */}
      {active === 'radial' && (
        <div
          style={{
            position: 'absolute',
            top: 56,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10,
            display: 'flex',
            gap: 8,
          }}
        >
          <button
            onClick={() => setRadialKey((k) => k + 1)}
            style={btnStyle(false)}
          >
            Replay
          </button>
          <button
            onClick={() => setShowPulse((v) => !v)}
            style={btnStyle(showPulse)}
          >
            Pulse Ring
          </button>
        </div>
      )}

      <Canvas
        gl={{ antialias: false, stencil: false, depth: false }}
        orthographic
        camera={{ left: -1, right: 1, top: 1, bottom: -1, near: 0, far: 1 }}
        style={{ width: '100%', height: '100%' }}
        frameloop="always"
      >
        {active === 'circuit' && <CircuitShader />}
        {active === 'radial' && <CircuitRadialShader key={radialKey} showPulse={showPulse} />}
        {active === 'one-line' && <OneLineShader />}
        {active === 'multi1' && <MultiLineShader1 />}
        {active === 'multi2' && <MultiLineShader2 />}
      </Canvas>
    </main>
  );
}
