'use client';

import * as THREE from 'three';
import VideoPlane from './VideoPlane';
import GlassVideoPanel from './GlassVideoPanel';
import PanoramaEnvironment from './PanoramaEnvironment';
import useSharedVideoTextures from './useSharedVideoTextures';
import { PLANES, GLASS_PANELS } from './galleryData';

export default function GalleryScene({
  onFocus,
}: {
  onFocus: (id: string, pos: THREE.Vector3, normal: THREE.Vector3) => void;
}) {
  const materials = useSharedVideoTextures();

  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={0.6} />

      <PanoramaEnvironment />

      {PLANES.map((p) => (
        <VideoPlane
          key={p.id}
          id={p.id}
          position={p.pos}
          rotation={p.rot}
          material={materials[p.videoIdx]}
          onFocus={onFocus}
        />
      ))}

      {GLASS_PANELS.map((g) => (
        <GlassVideoPanel
          key={g.id}
          id={g.id}
          position={g.pos}
          rotation={g.rot}
          width={g.w}
          height={g.h}
          color={g.color}
          material={materials[g.videoIdx]}
          onFocus={onFocus}
        />
      ))}
    </>
  );
}
