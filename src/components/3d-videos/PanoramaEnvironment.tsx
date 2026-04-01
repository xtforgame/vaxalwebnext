'use client';

import { useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import { useMemo } from 'react';
import * as THREE from 'three';

export default function PanoramaEnvironment() {
  const { scene } = useThree();
  const texture = useTexture('/panas/scifi_dark_scary_laboratory_metallic_doors (4).jpg');

  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  scene.background = texture;

  // Use a cloned texture for environment to avoid WebGL
  // "textures can not be used with multiple targets" error
  // (background and environment conversions bind to different targets)
  const envTexture = useMemo(() => {
    const t = texture.clone();
    t.mapping = THREE.EquirectangularReflectionMapping;
    return t;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texture.id]);
  scene.environment = envTexture;

  return null;
}
