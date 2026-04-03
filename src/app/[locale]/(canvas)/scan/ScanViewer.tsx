'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, useTexture } from '@react-three/drei';
import { Suspense, useRef, useMemo } from 'react';
import * as THREE from 'three';
import { GlassMaterial } from '@/components/3d/GlassMaterial';
import { useWebGLRecovery } from '@/hooks/useWebGLRecovery';

// ─── Scan-line image material ────────────────────────────────────────
// Converts the Shadertoy scan effect into a standard Three.js ShaderMaterial
// that samples a texture and overlays an animated cyan scan line.

const scanVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const scanFragmentShader = /* glsl */ `
  uniform sampler2D uTexture;
  uniform float uTime;
  varying vec2 vUv;

  void main() {
    vec2 uv = vUv;

    // Scan line position — sweeps bottom-to-top every 4 seconds
    float y = mod(-uTime / 4.0, 1.9) - 0.4;

    // Parabolic distortion strength — narrower band (200 vs 110)
    float str = -pow((uv.y - y) * 200.0, 2.0) + 0.8;

    // Horizontal refraction shift near the line
    uv.x -= clamp(str * 0.01, 0.0, 1.0);

    vec4 col = texture2D(uTexture, uv);

    // Tint toward pale blue
    col.rgb *= vec3(0.82, 0.88, 0.96);

    // Scan line band — smoothstep for a visible, defined stripe
    float dist = abs(uv.y - y);
    float band = 1.0 - smoothstep(0.0, 0.02, dist);   // core line
    float glow = 1.0 - smoothstep(0.0, 0.5, dist);    // spans full panel width

    // Darken then tint cyan
    col.rgb *= 1.0 - band * 0.4 - glow * 0.12;
    col.g += band * 0.45 + glow * 0.12;
    col.b += band * 0.55 + glow * 0.18;

    gl_FragColor = col;
  }
`;

function ScanImagePlane({
  src,
  panelWidth,
  panelHeight,
}: {
  src: string;
  panelWidth: number;
  panelHeight: number;
}) {
  const texture = useTexture(src);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const img = texture.image as HTMLImageElement;
  const aspect = img.width / img.height;
  const scale = 0.85;
  const maxW = panelWidth * scale;
  const maxH = panelHeight * scale;
  let w = maxW;
  let h = w / aspect;
  if (h > maxH) {
    h = maxH;
    w = h * aspect;
  }

  const uniforms = useMemo(
    () => ({
      uTexture: { value: texture },
      uTime: { value: 0 },
    }),
    [texture]
  );

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    }
  });

  return (
    <mesh position={[0, 0, 0]}>
      <planeGeometry args={[w, h]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={scanVertexShader}
        fragmentShader={scanFragmentShader}
        uniforms={uniforms}
        transparent
      />
    </mesh>
  );
}

// ─── Rounded-box helper (same as MobileLayout3D) ────────────────────
function createRoundedBoxGeometry(
  width: number,
  height: number,
  depth: number,
  radius: number,
  segments = 8
): THREE.BufferGeometry {
  const r = Math.min(radius, Math.min(width, height, depth) / 2);
  const shape = new THREE.Shape();
  const w = width / 2 - r;
  const h = height / 2 - r;

  shape.moveTo(-w, -height / 2);
  shape.lineTo(w, -height / 2);
  shape.quadraticCurveTo(width / 2, -height / 2, width / 2, -h);
  shape.lineTo(width / 2, h);
  shape.quadraticCurveTo(width / 2, height / 2, w, height / 2);
  shape.lineTo(-w, height / 2);
  shape.quadraticCurveTo(-width / 2, height / 2, -width / 2, h);
  shape.lineTo(-width / 2, -h);
  shape.quadraticCurveTo(-width / 2, -height / 2, -w, -height / 2);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: depth - r * 2,
    bevelEnabled: true,
    bevelThickness: r,
    bevelSize: r,
    bevelOffset: 0,
    bevelSegments: segments,
    curveSegments: segments,
  });
  geo.translate(0, 0, -(depth - r * 2) / 2);
  geo.computeVertexNormals();
  return geo;
}

// ─── Glass panel with scan-line image ───────────────────────────────
function ScanGlassPanel() {
  const width = 4.2;
  const height = 5.6;
  const depth = 0.15;
  const radius = 0.1;

  const geometry = useMemo(
    () => createRoundedBoxGeometry(width, height, depth, radius, 6),
    []
  );

  return (
    <group>
      {/* Image with scan-line effect */}
      <ScanImagePlane
        src="/favicon.jpg"
        panelWidth={width}
        panelHeight={height}
      />
      {/* Glass body */}
      <mesh geometry={geometry}>
        <GlassMaterial
          color="#bae6fd"
          opacity={0.12}
          ior={1.45}
          chromaticAberration={0.5}
          reflectivity={1.0}
          envMapIntensity={1.2}
          fresnelPower={1.5}
          thickness={depth}
          absorption={2.5}
        />
      </mesh>
    </group>
  );
}

// ─── Environment ────────────────────────────────────────────────────
function PanoramaEnvironment() {
  const { scene } = useThree();
  const texture = useTexture('/panas/scifi_dark_scary_laboratory_metallic_doors (4).jpg');

  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  scene.background = texture;
  scene.environment = texture;

  return null;
}

// ─── Main viewer ────────────────────────────────────────────────────
export default function ScanViewer() {
  const { contextLost, canvasKey, handleCreated } = useWebGLRecovery('ScanViewer');

  if (contextLost) {
    return (
      <div className="w-full h-screen bg-slate-100 flex items-center justify-center text-slate-400">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="font-medium">Recovering 3D Engine...</p>
      </div>
    );
  }

  return (
    <div style={{ width: '100vw', height: '100vh', backgroundColor: '#0a0a0f', overflow: 'hidden' }}>
      <Suspense
        fallback={
          <div className="flex items-center justify-center w-full h-full text-slate-400">
            <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="font-medium">Loading...</p>
          </div>
        }
      >
        <Canvas
          key={canvasKey}
          shadows
          style={{ height: '100%', width: '100%', display: 'block' }}
          camera={{ position: [0, 0, 10], fov: 35 }}
          gl={{
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance',
          }}
          dpr={[1, 1.5]}
          onCreated={handleCreated}
          frameloop="always"
        >
          <ambientLight intensity={0.4} />
          <spotLight position={[5, 8, 10]} angle={0.3} penumbra={1} intensity={1.2} castShadow />
          <pointLight position={[-8, -5, -5]} intensity={0.6} color="#3DB5E6" />

          <ScanGlassPanel />

          <OrbitControls
            makeDefault
            enableDamping
            minPolarAngle={Math.PI / 4}
            maxPolarAngle={Math.PI / 1.5}
          />

          <PanoramaEnvironment />
        </Canvas>
      </Suspense>
    </div>
  );
}
