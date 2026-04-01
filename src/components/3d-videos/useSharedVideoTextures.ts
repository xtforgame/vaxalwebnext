'use client';

import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { VIDEO_SOURCES } from './galleryData';

export default function useSharedVideoTextures() {
  const resourcesRef = useRef<
    { video: HTMLVideoElement; texture: THREE.VideoTexture; material: THREE.MeshBasicMaterial }[]
  >([]);

  // Create video elements + textures once after mount
  if (resourcesRef.current.length === 0) {
    resourcesRef.current = VIDEO_SOURCES.map((src) => {
      const video = document.createElement('video');
      video.src = src;
      video.crossOrigin = 'anonymous';
      video.loop = true;
      video.muted = true;
      video.playsInline = true;
      video.preload = 'auto';

      const texture = new THREE.VideoTexture(video);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;

      const material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });

      return { video, texture, material };
    });
  }

  // Start playback after mount (not during render)
  useEffect(() => {
    resourcesRef.current.forEach(({ video }) => {
      video.play().catch(() => {});
    });

    return () => {
      resourcesRef.current.forEach(({ video, texture, material }) => {
        video.pause();
        video.removeAttribute('src');
        video.load();
        texture.dispose();
        material.dispose();
      });
    };
  }, []);

  // Only update texture when video actually has decoded frames
  // readyState >= HAVE_CURRENT_DATA means at least one frame is available
  useFrame(() => {
    resourcesRef.current.forEach(({ video, texture }) => {
      if (video.readyState >= video.HAVE_CURRENT_DATA) {
        texture.needsUpdate = true;
      }
    });
  });

  return resourcesRef.current.map((r) => r.material);
}
