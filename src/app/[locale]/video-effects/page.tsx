'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';

// Dynamically import the Scene component to disable SSR for Three.js
const VideoEffectsScene = dynamic(
  () => import('../../../components/3d-video-effects/Scene'),
  { ssr: false }
);

export default function VideoEffectsPage() {
  return (
    <main className="min-h-screen bg-black relative overflow-hidden text-white font-mono">
      {/* 3D Viewer Container */}
      <Suspense fallback={<div className="flex items-center justify-center h-full w-full absolute inset-0 text-white/50 text-sm tracking-widest">INITIALIZING SEQUENCE...</div>}>
        <VideoEffectsScene />
      </Suspense>
      
      {/* Global overlay for static instructions or branding */}
      <div className="absolute bottom-6 left-6 z-[110] pointer-events-none opacity-50 mix-blend-screen">
        <div className="text-[10px] tracking-[0.3em] uppercase mb-1">Neon Mood</div>
        <div className="text-[8px] tracking-widest text-cyan-400">SYS.VER.0.1.X // SCROLL TO NAVIGATE</div>
      </div>
    </main>
  );
}
