'use client';

import { EffectComposer, Bloom, ChromaticAberration, Glitch, Scanline, Vignette } from '@react-three/postprocessing';
import { BlendFunction, GlitchMode } from 'postprocessing';
import * as THREE from 'three';

interface PostProcessingProps {
  velocity?: number; // Hook this up to camera scroll velocity later
}

// Subtle constant chromatic aberration + occasional glitch
export default function PostProcessing({ velocity = 0 }: PostProcessingProps) {
  return (
    <EffectComposer disableNormalPass multisampling={4}>
      <Bloom 
        luminanceThreshold={0.8} // Lower threshold to allow rich glow
        luminanceSmoothing={0.3} // Smoother falloff
        intensity={3.0} // Cranked intensity
        mipmapBlur 
      />
      <ChromaticAberration
        blendFunction={BlendFunction.NORMAL} // blend mode
        offset={new THREE.Vector2(0.002 * (1 + velocity * 10), 0.002 * (1 + velocity * 10))} // shift amount
        radialModulation={false}
        modulationOffset={0.0}
      />
      
      {/* 
        A very rare, mild slice-glitch for the Sci-Fi tech feel
      */}
      <Glitch
        delay={new THREE.Vector2(3.5, 8.5)}
        duration={new THREE.Vector2(0.1, 0.4)}
        strength={new THREE.Vector2(0.02, 0.05)}
        mode={GlitchMode.SPORADIC}
        active
        ratio={0.1}
      />
    </EffectComposer>
  );
}
