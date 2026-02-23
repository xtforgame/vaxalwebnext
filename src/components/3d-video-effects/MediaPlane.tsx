'use client';

import * as THREE from 'three';
import { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';

interface MediaPlaneProps {
  videoSrc: string;
  width: number;
  height: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
}

const crtVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const crtFragmentShader = `
  uniform sampler2D map;
  uniform float time;
  varying vec2 vUv;

  void main() {
    vec4 texColor = texture2D(map, vUv);
    
    // Add CRT scanlines
    float scanline = sin(vUv.y * 800.0 - time * 10.0) * 0.04;
    texColor.rgb -= scanline;
    
    // Slight vignette
    float edgeDist = distance(vUv, vec2(0.5));
    texColor.rgb *= smoothstep(0.8, 0.2, edgeDist);
    
    gl_FragColor = texColor;
  }
`;

export default function MediaPlane({
  videoSrc,
  width,
  height,
  position = [0, 0, 0],
  rotation = [0, 0, 0]
}: MediaPlaneProps) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const [videoTexture, setVideoTexture] = useState<THREE.VideoTexture | null>(null);

  useEffect(() => {
    const video = document.createElement('video');
    video.src = videoSrc;
    video.crossOrigin = 'Anonymous';
    video.loop = true;
    video.muted = true;
    video.play().catch(e => console.error("Video autoplay blocked:", e));

    const texture = new THREE.VideoTexture(video);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    setVideoTexture(texture);

    return () => {
      video.pause();
      video.removeAttribute('src');
      video.load();
      texture.dispose();
    };
  }, [videoSrc]);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.time.value = state.clock.getElapsedTime();
    }
  });

  return (
    <group position={position} rotation={rotation}>
      <mesh>
        <planeGeometry args={[width, height, 32, 32]} />
        {videoTexture ? (
          <shaderMaterial
            ref={materialRef}
            vertexShader={crtVertexShader}
            fragmentShader={crtFragmentShader}
            uniforms={{
              map: { value: videoTexture },
              time: { value: 0 }
            }}
            toneMapped={false}
          />
        ) : (
          <meshBasicMaterial color="#111111" />
        )}
      </mesh>
    </group>
  );
}
