'use client';

import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { useScroll } from '@react-three/drei';
import { useMemo, useRef } from 'react';
import gsap from 'gsap';

export default function CameraController() {
  const { camera } = useThree();
  const scroll = useScroll();
  const targetRef = useRef(new THREE.Vector3(0, 0, 0));

  // Define camera position path
  const curvePos = useMemo(() => {
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 10),       // 0: Start Overview
      new THREE.Vector3(0, 0, 4.5),      // 1: Focus Slide 1
      new THREE.Vector3(8, 0, -4),       // 2: Whip pan
      new THREE.Vector3(12.5, 0, -11.5), // 3: Focus Slide 2 (angled)
      new THREE.Vector3(3, -1, -20),     // 4: Dive
      new THREE.Vector3(-4, -1.8, -27.5), // 5: Focus Slide 3
      new THREE.Vector3(-8, -2, -26)     // 6: Exit swing
    ], false, 'catmullrom', 0.5);
  }, []);

  // Define camera lookAt target path
  const curveTarget = useMemo(() => {
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),        // 0
      new THREE.Vector3(0, 0, 0),        // 1
      new THREE.Vector3(5, 0, -10),      // 2
      new THREE.Vector3(10, 0, -15),     // 3
      new THREE.Vector3(-2, -1, -25),    // 4
      new THREE.Vector3(-8, -2, -30),    // 5
      new THREE.Vector3(-15, -2, -35)    // 6
    ], false, 'catmullrom', 0.5);
  }, []);

  useFrame(() => {
    if (!scroll) return;
    
    // scroll.offset goes from 0 to 1
    const offset = scroll.offset;
    
    // Add easing to the scroll offset so movements aren't purely linear.
    // gsap.parseEase can be used, or just math.
    const easedOffset = gsap.parseEase("power2.inOut")(offset);

    // Get position on curve
    const point = curvePos.getPointAt(easedOffset);
    camera.position.lerp(point, 0.1); // slight lerp for smoothing out scroll wheel jumps

    // Get target on curve
    const lookAtPoint = curveTarget.getPointAt(easedOffset);
    targetRef.current.lerp(lookAtPoint, 0.1);
    
    camera.lookAt(targetRef.current);
  });

  return null;
}
