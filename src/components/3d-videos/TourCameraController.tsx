'use client';

import { useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import type { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { type TourPhase, TOUR_FLIGHT_DURATION, easeInOutCubic } from './galleryData';

interface TourCameraControllerProps {
  phase: TourPhase;
  targetPos: THREE.Vector3;
  targetLookAt: THREE.Vector3;
  targetUp: THREE.Vector3;
  controlsRef: React.RefObject<typeof OrbitControls | null>;
  onArrive: () => void;
  onMidpoint?: () => void;
}

export default function TourCameraController({ phase, targetPos, targetLookAt, targetUp, controlsRef, onArrive, onMidpoint }: TourCameraControllerProps) {
  const { camera } = useThree();
  const progress = useRef(0);
  const startPos = useRef(new THREE.Vector3());
  const startLookAt = useRef(new THREE.Vector3());
  const startUp = useRef(new THREE.Vector3(0, 1, 0));
  const currentLookAt = useRef(new THREE.Vector3());
  const prevTargetId = useRef('');
  const arrivedRef = useRef(false);
  const midpointFired = useRef(false);

  // Reset animation when target changes
  useEffect(() => {
    if (phase === 'idle' || phase === 'dwelling') return;
    const targetId = `${targetPos.x},${targetPos.y},${targetPos.z}`;
    if (targetId === prevTargetId.current) return;
    prevTargetId.current = targetId;

    startPos.current.copy(camera.position);
    startUp.current.copy(camera.up);
    // Derive current lookAt from camera direction
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    startLookAt.current.copy(camera.position).add(dir.multiplyScalar(10));
    currentLookAt.current.copy(startLookAt.current);
    progress.current = 0;
    arrivedRef.current = false;
    midpointFired.current = false;
  }, [phase, targetPos, camera]);

  // Priority -1: run BEFORE title useFrame (priority 0) so camera is updated first
  useFrame((_, delta) => {
    if (phase === 'idle' || phase === 'dwelling') return;
    if (arrivedRef.current) return;

    progress.current = Math.min(1, progress.current + delta / TOUR_FLIGHT_DURATION);
    const t = easeInOutCubic(progress.current);

    // Interpolate position
    camera.position.lerpVectors(startPos.current, targetPos, t);
    // Interpolate up vector to align with fragment
    camera.up.lerpVectors(startUp.current, targetUp, t).normalize();
    // Interpolate lookAt
    currentLookAt.current.lerpVectors(startLookAt.current, targetLookAt, t);
    camera.lookAt(currentLookAt.current);

    // Fire midpoint callback when easeIn transitions to easeOut
    if (!midpointFired.current && progress.current >= 0.5) {
      midpointFired.current = true;
      onMidpoint?.();
    }

    if (progress.current >= 1) {
      camera.position.copy(targetPos);
      camera.up.copy(targetUp).normalize();
      camera.lookAt(targetLookAt);
      arrivedRef.current = true;

      // Sync OrbitControls target
      if (controlsRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const controls = controlsRef.current as any;
        controls.target.copy(targetLookAt);
        controls.update();
      }
      onArrive();
    }
  }, -1);

  return null;
}
