'use client';

import {
  EffectComposer,
  Bloom,
  ChromaticAberration,
  Glitch,
} from '@react-three/postprocessing';
import { BlendFunction, GlitchMode } from 'postprocessing';
import * as THREE from 'three';

export interface SciFiPostProcessingProps {
  /** Camera/scroll velocity for dynamic chromatic aberration (default: 0) */
  velocity?: number;
  /** Bloom glow intensity (default: 3.0) */
  bloomIntensity?: number;
  /** Brightness threshold for bloom extraction (default: 0.8) */
  bloomThreshold?: number;
  /** Bloom smoothing falloff (default: 0.3) */
  bloomSmoothing?: number;
  /** Base chromatic aberration offset (default: 0.002) */
  chromaticOffset?: number;
  /** Enable sporadic glitch effect (default: true) */
  glitchEnabled?: boolean;
  /** MSAA sample count (default: 4) */
  multisampling?: number;
}

export default function SciFiPostProcessing({
  velocity = 0,
  bloomIntensity = 3.0,
  bloomThreshold = 0.8,
  bloomSmoothing = 0.3,
  chromaticOffset = 0.002,
  glitchEnabled = true,
  multisampling = 4,
}: SciFiPostProcessingProps) {
  const offset = chromaticOffset * (1 + velocity * 10);

  return (
    <EffectComposer enableNormalPass={false} multisampling={multisampling}>
      <Bloom
        luminanceThreshold={bloomThreshold}
        luminanceSmoothing={bloomSmoothing}
        intensity={bloomIntensity}
        mipmapBlur
      />
      <ChromaticAberration
        blendFunction={BlendFunction.NORMAL}
        offset={new THREE.Vector2(offset, offset)}
        radialModulation={false}
        modulationOffset={0.0}
      />
      <Glitch
        delay={new THREE.Vector2(3.5, 8.5)}
        duration={new THREE.Vector2(0.1, 0.4)}
        strength={new THREE.Vector2(0.02, 0.05)}
        mode={GlitchMode.SPORADIC}
        active={glitchEnabled}
        ratio={0.1}
      />
    </EffectComposer>
  );
}
