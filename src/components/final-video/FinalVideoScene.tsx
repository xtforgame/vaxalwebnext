'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';

// ═══════════════════════════════════════════════════════════════════
// Configuration — adjust these values to control the scene
// ═══════════════════════════════════════════════════════════════════

/** Delay before the first video starts playing (ms) — wait for UI to show */
const FIRST_VIDEO_DELAY_MS = 2000;

/** Video sequence: source, start time (seconds), playback speed, display duration (ms) */
const VIDEO_SEQUENCE = [
  { src: '/large-videos/year.mov', startTime: 0, playbackRate: 1, durationMs: 20000 },
  { src: '/large-videos/final-phone.mov', startTime: 0, playbackRate: 1, durationMs: 8000 },
  { src: '/large-videos/target.mov', startTime: 2, playbackRate: 1, durationMs: (3 * 60 + 30) * 1000 },
];

/** Crossfade transition duration between videos (seconds) */
const CROSSFADE_DURATION = 1.8;

/** Video aspect ratio (width / height) */
const VIDEO_ASPECT = 4096 / 2206;

/** Background audio configuration */
const AUDIO_CONFIG = {
  src: '/large-videos/five.mp3',
  startDelayMs: 2000,     // when to start playing (ms after mount)
  playDurationMs: 4 * 60 * 1000,  // total play duration (ms)
  fadeDurationMs: 2000,   // fade-in / fade-out duration (ms)
};

// ═══════════════════════════════════════════════════════════════════

// ─── Audio with fade-in / fade-out (Web Audio API) ───────────────
function useAudioWithFade(config: typeof AUDIO_CONFIG) {
  useEffect(() => {
    let ctx: AudioContext;
    let cancelled = false;

    const init = async () => {
      ctx = new AudioContext();
      const gain = ctx.createGain();
      gain.gain.value = 0;
      gain.connect(ctx.destination);

      // Resume AudioContext on user interaction (browser autoplay policy)
      const resume = () => {
        if (ctx.state === 'suspended') ctx.resume();
      };
      document.addEventListener('click', resume);
      document.addEventListener('touchstart', resume);
      ctx.resume().catch(() => {});

      // Fetch and decode audio
      const response = await fetch(config.src);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      if (cancelled) return;

      // Wait for start delay
      await new Promise((r) => setTimeout(r, config.startDelayMs));
      if (cancelled) return;

      // Schedule playback with gain ramps
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(gain);

      const now = ctx.currentTime;
      const fadeSec = config.fadeDurationMs / 1000;
      const totalSec = config.playDurationMs / 1000;

      // Fade in
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(1, now + fadeSec);
      // Fade out
      gain.gain.setValueAtTime(1, now + totalSec - fadeSec);
      gain.gain.linearRampToValueAtTime(0, now + totalSec);

      source.start(now);
      source.stop(now + totalSec);

      source.onended = () => {
        document.removeEventListener('click', resume);
        document.removeEventListener('touchstart', resume);
      };
    };

    init().catch(() => {});

    return () => {
      cancelled = true;
      ctx?.close();
    };
  }, [config.src, config.startDelayMs, config.playDurationMs, config.fadeDurationMs]);
}

// ─── Main Scene ──────────────────────────────────────────────────
export default function FinalVideoScene() {
  // -1 = waiting for FIRST_VIDEO_DELAY_MS
  const [currentIndex, setCurrentIndex] = useState(-1);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([null, null, null]);

  // ── Background audio ──
  useAudioWithFade(AUDIO_CONFIG);

  // ── First video delay ──
  useEffect(() => {
    const t = setTimeout(() => setCurrentIndex(0), FIRST_VIDEO_DELAY_MS);
    return () => clearTimeout(t);
  }, []);

  // ── Advance to next video / pause last video on timer ──
  useEffect(() => {
    if (currentIndex < 0 || currentIndex >= VIDEO_SEQUENCE.length) return;
    const cfg = VIDEO_SEQUENCE[currentIndex];
    const isLast = currentIndex >= VIDEO_SEQUENCE.length - 1;
    const t = setTimeout(() => {
      if (isLast) {
        // Pause the last video when its duration ends
        videoRefs.current[currentIndex]?.pause();
      } else {
        setCurrentIndex((i) => i + 1);
      }
    }, cfg.durationMs);
    return () => clearTimeout(t);
  }, [currentIndex]);

  // ── Video playback control ──
  useEffect(() => {
    if (currentIndex < 0) return;
    const cfg = VIDEO_SEQUENCE[currentIndex];
    const video = videoRefs.current[currentIndex];
    if (!video) return;

    video.currentTime = cfg.startTime;
    video.playbackRate = cfg.playbackRate;
    video.play().catch(() => {});

    // Pause previous video after crossfade completes
    if (currentIndex > 0) {
      const prev = videoRefs.current[currentIndex - 1];
      const t = setTimeout(() => prev?.pause(), CROSSFADE_DURATION * 1000);
      return () => clearTimeout(t);
    }
  }, [currentIndex]);

  return (
    <div
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        backgroundColor: '#000',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          aspectRatio: `${VIDEO_ASPECT}`,
        }}
      >
        {VIDEO_SEQUENCE.map((cfg, i) => (
          <motion.video
            key={cfg.src}
            ref={(el) => {
              videoRefs.current[i] = el;
            }}
            src={cfg.src}
            muted
            playsInline
            preload="auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: currentIndex >= i ? 1 : 0 }}
            transition={{ duration: CROSSFADE_DURATION, ease: 'easeInOut' }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'contain',
            }}
          />
        ))}
      </div>
    </div>
  );
}
