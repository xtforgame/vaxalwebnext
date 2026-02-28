'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';

// ─── Configuration ───────────────────────────────────────────────
const YEAR_INTERVAL_MS = 3000; // k: time between year changes (ms)
const START_YEAR = 2023;
const END_YEAR = 2025;

// Videos mapped to each year. startTime = seconds to begin playback from (default 0).
const VIDEO_SOURCES: Record<number, { src: string; startTime: number }> = {
  2023: { src: '/video/BigBuckBunny.mp4', startTime: 5 },
  2024: { src: '/video/ElephantsDream.mp4', startTime: 5 },
  2025: { src: '/video/BigBuckBunny.mp4', startTime: 5 },
};

const VIDEO_ASPECT = 1280 / 720; // 16:9

// ─── Odometer Digit ──────────────────────────────────────────────
function OdometerDigit({ digit }: { digit: string }) {
  return (
    <div
      style={{
        display: 'inline-block',
        position: 'relative',
        width: '0.65em',
        height: '1.15em',
        overflow: 'hidden',
      }}
    >
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={digit}
          initial={{ y: '-100%' }}
          animate={{ y: '0%' }}
          exit={{ y: '100%' }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
          }}
        >
          {digit}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

// ─── Odometer Year ───────────────────────────────────────────────
function OdometerYear({ year }: { year: number }) {
  const digits = String(year).split('');
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        fontSize: 'clamp(3rem, 8vw, 6rem)',
        fontWeight: 700,
        fontVariantNumeric: 'tabular-nums',
        color: '#fff',
        letterSpacing: '0.02em',
        lineHeight: 1,
        userSelect: 'none',
      }}
    >
      {digits.map((d, i) => (
        <OdometerDigit key={`pos-${i}`} digit={d} />
      ))}
    </div>
  );
}

// ─── Video Player with Preload + Fade ────────────────────────────
function usePreloadedVideos(sources: string[]) {
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());

  useEffect(() => {
    const map = videoRefs.current;
    for (const src of sources) {
      if (!map.has(src)) {
        const video = document.createElement('video');
        video.src = src;
        video.muted = true;
        video.loop = true;
        video.playsInline = true;
        video.preload = 'auto';
        // Start buffering
        video.load();
        map.set(src, video);
      }
    }
    return () => {
      for (const [, video] of map) {
        video.pause();
        video.removeAttribute('src');
        video.load();
      }
      map.clear();
    };
  }, [sources]);

  return videoRefs;
}

function FadeVideo({ src, isActive, startTime = 0 }: { src: string; isActive: boolean; startTime?: number }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isActive) {
      video.currentTime = startTime;
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [isActive, startTime]);

  return (
    <motion.video
      ref={videoRef}
      src={src}
      muted
      loop
      playsInline
      preload="auto"
      initial={false}
      animate={{ opacity: isActive ? 1 : 0 }}
      transition={
        isActive
          ? { duration: 0.8, ease: 'easeInOut' }
          : { duration: 0, delay: 0.8 }
      }
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        objectFit: 'contain',
        zIndex: isActive ? 1 : 0,
      }}
    />
  );
}

// ─── Main Scene ──────────────────────────────────────────────────
export default function YearVideosScene() {
  const [currentYear, setCurrentYear] = useState(START_YEAR);

  // Unique video src paths for preloading
  const allSrcPaths = useMemo(
    () => [...new Set(Object.values(VIDEO_SOURCES).map((v) => v.src))],
    [],
  );

  // Preload all videos on mount
  usePreloadedVideos(allSrcPaths);

  // Year cycling timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentYear((prev) => {
        if (prev >= END_YEAR) return START_YEAR;
        return prev + 1;
      });
    }, YEAR_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  // Get current video config
  const currentConfig = VIDEO_SOURCES[currentYear] ?? { src: allSrcPaths[0], startTime: 0 };

  // Build list of all unique sources with their active state + startTime
  const videoEntries = useMemo(() => {
    return allSrcPaths.map((src) => ({
      src,
      isActive: src === currentConfig.src,
      startTime: src === currentConfig.src ? currentConfig.startTime : 0,
    }));
  }, [allSrcPaths, currentConfig]);

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        backgroundColor: '#000',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'clamp(1.5rem, 4vh, 3rem)',
        overflow: 'hidden',
      }}
    >
      {/* Year Odometer */}
      <OdometerYear year={currentYear} />

      {/* Video Container — 16:9 responsive */}
      <div
        style={{
          position: 'relative',
          width: 'min(80vw, 720px)',
          aspectRatio: `${VIDEO_ASPECT}`,
          borderRadius: '8px',
          overflow: 'hidden',
        }}
      >
        {videoEntries.map(({ src, isActive, startTime }) => (
          <FadeVideo key={src} src={src} isActive={isActive} startTime={startTime} />
        ))}
      </div>
    </div>
  );
}
