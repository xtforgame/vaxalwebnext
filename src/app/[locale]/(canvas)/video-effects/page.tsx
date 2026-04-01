'use client';

import dynamic from 'next/dynamic';

const VideoEffectsScene = dynamic(
  () => import('@/components/3d-video-effects/Scene'),
  { ssr: false }
);

export default function VideoEffectsPage() {
  return (
    <main>
      <VideoEffectsScene />
    </main>
  );
}
