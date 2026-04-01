'use client';

import { VideoPlayer } from '@/components/video-player';
import { VIDEO_SRC, VIDEO_ASPECT, TIMELINE } from './timelineData';

export default function VideoFullyControlledScene() {
  return (
    <VideoPlayer
      videoSrc={VIDEO_SRC}
      videoAspect={VIDEO_ASPECT}
      timeline={TIMELINE}
    />
  );
}
