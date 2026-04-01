'use client';

import { useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import type { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { INITIAL_CAM_POS, LERP_SPEED } from './galleryData';

interface CameraControllerProps {
  target: THREE.Vector3 | null;
  lookAt: THREE.Vector3 | null;
  targetUp: THREE.Vector3 | null;
  controlsRef: React.RefObject<typeof OrbitControls | null>;
  onAnimationEnd?: () => void;
}

export default function CameraController({ target, lookAt, targetUp, controlsRef, onAnimationEnd }: CameraControllerProps) {
  const { camera } = useThree();
  const currentLookAt = useRef(new THREE.Vector3(0, 0, 0));
  const isAnimating = useRef(false);

  useEffect(() => {
    isAnimating.current = true;
  }, [target]);

  // Priority -1: run BEFORE title useFrame (priority 0) so camera is updated first
  useFrame((_, delta) => {
    if (!isAnimating.current) return;

    const dest = target ?? INITIAL_CAM_POS;
    const look = lookAt ?? new THREE.Vector3(0, 0, 0);
    const up = targetUp ?? new THREE.Vector3(0, 1, 0);
    const t = Math.min(1, delta * LERP_SPEED);

    camera.position.lerp(dest, t);
    camera.up.lerp(up, t).normalize();
    currentLookAt.current.lerp(look, t);
    camera.lookAt(currentLookAt.current);

    // Check if close enough to stop
    if (camera.position.distanceTo(dest) < 0.01) {
      camera.position.copy(dest);
      camera.up.copy(up).normalize();
      currentLookAt.current.copy(look);
      camera.lookAt(look);
      isAnimating.current = false;

      // Re-sync OrbitControls target, then notify parent
      if (controlsRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const controls = controlsRef.current as any;
        controls.target.copy(look);
        controls.update();
      }
      onAnimationEnd?.();
    }
  }, -1);

  return null;
}
