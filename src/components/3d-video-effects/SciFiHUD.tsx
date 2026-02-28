'use client';

import { Html, useScroll } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useState } from 'react';
import DecodeText from '@/components/sci-fi/DecodeText';
import SciFiPanel from '@/components/sci-fi/SciFiPanel';

// Scroll-aware HUD panel positioned in 3D space
function HUDPanel({
  position,
  title,
  subtitle,
  activeRange = [0, 1],
}: {
  position: [number, number, number];
  title: string;
  subtitle: string;
  activeRange: [number, number];
}) {
  const scroll = useScroll();
  const [active, setActive] = useState(false);

  useFrame(() => {
    if (!scroll) return;
    const off = scroll.offset;
    const isActive = off >= activeRange[0] && off <= activeRange[1];
    if (isActive !== active) {
      setActive(isActive);
    }
  });

  return (
    <Html position={position} center transform>
      <SciFiPanel active={active}>
        <div className="text-[10px] text-cyan-400 tracking-[0.2em] mb-1">
          <DecodeText text="TARGET ACQUIRED //" active={active} />
        </div>
        <h2 className="text-2xl font-bold tracking-widest text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]">
          <DecodeText text={title} active={active} />
          <span className="sf-cursor-blink inline-block w-3 h-[1em] bg-white ml-2 align-middle" />
        </h2>
        <div className="mt-2 text-xs text-white/70 max-w-[200px] whitespace-normal">
          {active ? subtitle : ''}
        </div>
      </SciFiPanel>
    </Html>
  );
}

export default function SciFiHUD() {
  return (
    <group>
      <HUDPanel
        position={[2.5, -1, 1]}
        title="I WISH YOU SUCCESS"
        subtitle="System initialization complete. Monitoring vitals and neuro-sync paths."
        activeRange={[0.0, 0.25]}
      />
      <HUDPanel
        position={[14, -1.5, -14]}
        title="NEON MEMORIES"
        subtitle="Extracting archive logs. 87% fragments recovered from sector 4."
        activeRange={[0.3, 0.6]}
      />
      <HUDPanel
        position={[-4, 1, -29]}
        title="AMAZING PRICES"
        subtitle="Commercial broadcast flagged. Bypassing firewall."
        activeRange={[0.7, 1.0]}
      />
    </group>
  );
}
