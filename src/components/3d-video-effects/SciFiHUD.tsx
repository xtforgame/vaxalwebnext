'use client';

import { Html, useScroll } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef, useState, useEffect } from 'react';

// Subcomponent: Decoding Text (Matrix effect)
function DecodeText({ text, active }: { text: string; active: boolean }) {
  const [displayText, setDisplayText] = useState('');
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()';

  useEffect(() => {
    if (!active) {
      setDisplayText('');
      return;
    }

    let frame = 0;
    const duration = 40; // frames
    
    const tick = () => {
      frame++;
      const progress = frame / duration;
      const revealCount = Math.floor(progress * text.length);
      
      let newText = '';
      for (let i = 0; i < text.length; i++) {
        if (i < revealCount) {
          newText += text[i];
        } else if (text[i] === ' ') {
          newText += ' ';
        } else {
          newText += chars[Math.floor(Math.random() * chars.length)];
        }
      }
      
      setDisplayText(newText);
      
      if (frame < duration) {
        requestAnimationFrame(tick);
      } else {
        setDisplayText(text);
      }
    };
    
    requestAnimationFrame(tick);
  }, [active, text]);

  return <span>{displayText}</span>;
}

// Subcomponent: A single Sci-Fi Panel overlaid in 3D space
function HUDPanel({ 
  position, 
  title, 
  subtitle, 
  activeRange = [0, 1] 
}: { 
  position: [number, number, number];
  title: string;
  subtitle: string;
  activeRange: [number, number];
}) {
  const scroll = useScroll();
  const [active, setActive] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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
      <div 
        ref={containerRef}
        className={`relative transition-all duration-300 ease-out font-mono whitespace-nowrap
        ${active ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}
        style={{
          // Custom flicker animation on enter
          animation: active ? 'glitch-enter 0.4s cubic-bezier(0.25, 1, 0.5, 1)' : 'none'
        }}
      >
        <style>{`
          @keyframes glitch-enter {
            0% { opacity: 0; transform: scale(0.9) skewX(20deg); }
            20% { opacity: 1; transform: scale(1.1) skewX(-10deg); filter: hue-rotate(90deg); }
            40% { opacity: 0; transform: scale(0.95) skewX(5deg); }
            60% { opacity: 0.8; transform: scale(1.05) skewX(0deg); }
            80% { opacity: 0.3; }
            100% { opacity: 1; transform: scale(1); filter: hue-rotate(0deg); }
          }
          .corner-br {
            position: absolute; width: 10px; height: 10px; border-color: #0ff; border-style: solid;
            animation: pulse-brackets 2s infinite alternate ease-in-out;
          }
          @keyframes pulse-brackets { 0% { transform: scale(0.95); opacity: 0.7; } 100% { transform: scale(1.05); opacity: 1; } }
          
          .cursor-blink { animation: blink 0.5s step-start infinite; }
          @keyframes blink { 50% { opacity: 0; } }
        `}</style>
        
        {/* Corner brackets */}
        <div className="corner-br border-t-2 border-l-2 -top-2 -left-2" />
        <div className="corner-br border-t-2 border-r-2 -top-2 -right-2" />
        <div className="corner-br border-b-2 border-l-2 -bottom-2 -left-2" />
        <div className="corner-br border-b-2 border-r-2 -bottom-2 -right-2" />
        
        {/* Content */}
        <div className="bg-black/40 backdrop-blur-md p-4 border-l-4 border-[#00ffff] shadow-[0_0_15px_rgba(0,255,255,0.2)]">
          <div className="text-[10px] text-cyan-400 tracking-[0.2em] mb-1">
            <DecodeText text="TARGET ACQUIRED //" active={active} />
          </div>
          <h2 className="text-2xl font-bold tracking-widest text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]">
             <DecodeText text={title} active={active} /><span className="cursor-blink inline-block w-3 h-[1em] bg-white ml-2 align-middle"></span>
          </h2>
          <div className="mt-2 text-xs text-white/70 max-w-[200px] whitespace-normal">
            {active ? subtitle : ''}
          </div>
        </div>
      </div>
    </Html>
  );
}

export default function SciFiHUD() {
  return (
    <group>
      {/* Slide 1 HUD */}
      <HUDPanel 
        position={[2.5, -1, 1]} 
        title="I WISH YOU SUCCESS" 
        subtitle="System initialization complete. Monitoring vitals and neuro-sync paths."
        activeRange={[0.0, 0.25]}
      />
      
      {/* Slide 2 HUD */}
      <HUDPanel 
        position={[14, -1.5, -14]} 
        title="NEON MEMORIES" 
        subtitle="Extracting archive logs. 87% fragments recovered from sector 4."
        activeRange={[0.3, 0.6]}
      />

      {/* Slide 3 HUD */}
      <HUDPanel 
        position={[-4, 1, -29]} 
        title="AMAZING PRICES" 
        subtitle="Commercial broadcast flagged. Bypassing firewall."
        activeRange={[0.7, 1.0]}
      />
    </group>
  );
}
