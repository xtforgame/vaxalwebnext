'use client';

import * as THREE from 'three';
import { useState, useEffect } from 'react';
import CRTMaterial from '@/components/sci-fi/CRTMaterial';

interface MediaPlaneProps {
  videoSrc: string;
  width: number;
  height: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
}

export default function MediaPlane({
  videoSrc,
  width,
  height,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
}: MediaPlaneProps) {
  const [videoTexture, setVideoTexture] = useState<THREE.VideoTexture | null>(
    null
  );

  useEffect(() => {
    const video = document.createElement('video');
    video.src = videoSrc;
    video.crossOrigin = 'Anonymous';
    video.loop = true;
    video.muted = true;
    video.play().catch((e) => console.error('Video autoplay blocked:', e));

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

  return (
    <group position={position} rotation={rotation}>
      <mesh>
        <planeGeometry args={[width, height, 32, 32]} />
        {videoTexture ? (
          <CRTMaterial map={videoTexture} />
        ) : (
          <meshBasicMaterial color="#111111" />
        )}
      </mesh>
    </group>
  );
}
