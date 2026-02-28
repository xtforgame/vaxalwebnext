'use client';

import { Canvas } from '@react-three/fiber';
import { ScrollControls } from '@react-three/drei';
import NeonFrame from './NeonFrame';
import MediaPlane from './MediaPlane';
import ParticleBackground from './ParticleBackground';
import PostProcessing from './PostProcessing';
import CameraController from './CameraController';
import SciFiHUD from './SciFiHUD';

export default function Scene() {
  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        backgroundColor: '#030508',
        overflow: 'hidden'
      }}
    >
      <Canvas
        style={{ height: '100%', width: '100%', display: 'block' }}
        camera={{ position: [0, 0, 10], fov: 45 }}
        // We use a dark blue/black background
        scene={{ background: null }} 
        gl={{ antialias: false, toneMapping: 0 }} // Need toneMapping 0 for pure bloom emissions
      >
      <color attach="background" args={['#030508']} />
      
      <ambientLight intensity={0.5} />

      <ScrollControls pages={5} damping={0.2}>
        <CameraController />
        
        <ParticleBackground count={1500} />

        {/* Gallery Group - Hardcoded positions for now, later controlled by GSAP/Scroll */}
        <group>
          {/* Slide 1 */}
          <group position={[0, 0, 0]}>
            <MediaPlane videoSrc="/video/BigBuckBunny.mp4" width={6.4} height={3.6} />
            <NeonFrame width={7} height={4.2} color="#ff00ff" />
          </group>

          {/* Slide 2 */}
          <group position={[10, 0, -15]} rotation={[0, -Math.PI / 8, 0]}>
            <MediaPlane videoSrc="/video/ElephantsDream.mp4" width={6.4} height={3.6} />
            <NeonFrame width={7} height={4.2} color="#00ffff" />
          </group>
          
          {/* Slide 3 */}
          <group position={[-8, -2, -30]} rotation={[0, Math.PI / 6, 0]}>
            <MediaPlane videoSrc="/video/BigBuckBunny.mp4" width={5} height={5} />
            <NeonFrame width={5.6} height={5.6} color="#00ffcc" />
          </group>
          
          <SciFiHUD />
        </group>
      </ScrollControls>

      <PostProcessing velocity={0} />
    </Canvas>
    </div>
  );
}
