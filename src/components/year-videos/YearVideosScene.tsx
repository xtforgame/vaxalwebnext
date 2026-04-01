'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

// ═══════════════════════════════════════════════════════════════════
// Configuration — adjust these values to control the scene
// ═══════════════════════════════════════════════════════════════════

/** How long each year is displayed before advancing (ms) */
const YEAR_DURATION_MS: Record<number, number> = {
  2024: 9000,
  2025: 9000,
};

/** Video config per year: source path, start time (seconds), playback speed (1 = normal) */
const VIDEO_CONFIG: Record<
  number,
  { src: string; startTime: number; playbackRate: number }
> = {
  2024: { src: '/large-videos/2024code.mov', startTime: 3, playbackRate: 2 },
  2025: { src: '/large-videos/2025code.mov', startTime: 16, playbackRate: 4 },
};

/** Video aspect ratio (width / height). Adjust to match your video files. */
const VIDEO_ASPECT = 16 / 9;

// ═══════════════════════════════════════════════════════════════════

// ─── Odometer Digit ──────────────────────────────────────────────
function OdometerDigit({
  digit,
  duration = 0.6,
}: {
  digit: string;
  duration?: number;
}) {
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
          transition={{ duration, ease: [0.4, 0, 0.2, 1] }}
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
function OdometerYear({
  year,
  digitDuration = 0.6,
}: {
  year: number;
  digitDuration?: number;
}) {
  const digits = String(year).split('');
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        fontWeight: 700,
        fontVariantNumeric: 'tabular-nums',
        color: '#fff',
        letterSpacing: '0.02em',
        lineHeight: 1,
        userSelect: 'none',
      }}
    >
      {digits.map((d, i) => (
        <OdometerDigit key={`pos-${i}`} digit={d} duration={digitDuration} />
      ))}
    </div>
  );
}

// ─── Phase machine ───────────────────────────────────────────────
// playing → outro (video fades + text moves to center + slow digit roll, all simultaneous)
//         → outroFade (text fades out) → done
type Phase = 'playing' | 'outro' | 'outroFade' | 'done';

// ─── Main Scene ──────────────────────────────────────────────────
export default function YearVideosScene() {
  const [currentYear, setCurrentYear] = useState(2024);
  const [phase, setPhase] = useState<Phase>('playing');
  const video2024Ref = useRef<HTMLVideoElement>(null);
  const video2025Ref = useRef<HTMLVideoElement>(null);

  // ── Advance year on timer; entering 2026 triggers outro simultaneously ──
  useEffect(() => {
    if (phase !== 'playing') return;
    const duration = YEAR_DURATION_MS[currentYear];
    if (!duration) return;
    const t = setTimeout(() => {
      const next = currentYear + 1;
      if (next === 2026) {
        // Batch both updates → same render → slow digit duration applies immediately
        setPhase('outro');
      }
      setCurrentYear(next);
    }, duration);
    return () => clearTimeout(t);
  }, [currentYear, phase]);

  // ── Outro phase sequencer ──
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    if (phase === 'outro') {
      // Wait for text movement + slow digit roll to settle
      t = setTimeout(() => setPhase('outroFade'), 2800);
    } else if (phase === 'outroFade') {
      t = setTimeout(() => setPhase('done'), 1500);
    }
    return () => clearTimeout(t!);
  }, [phase]);

  // ── Video playback control ──
  useEffect(() => {
    const v2024 = video2024Ref.current;
    const v2025 = video2025Ref.current;

    if (currentYear === 2024 && v2024) {
      const cfg = VIDEO_CONFIG[2024];
      v2024.currentTime = cfg.startTime;
      v2024.playbackRate = cfg.playbackRate;
      v2024.play().catch(() => {});
      v2025?.pause();
    } else if (currentYear === 2025 && v2025) {
      const cfg = VIDEO_CONFIG[2025];
      v2025.currentTime = cfg.startTime;
      v2025.playbackRate = cfg.playbackRate;
      v2025.play().catch(() => {});
      v2024?.pause();
    }
  }, [currentYear]);

  // ── Derived animation states ──
  const isOutro = phase === 'outro' || phase === 'outroFade' || phase === 'done';
  const videoOpacity = phase === 'playing' ? 1 : 0;
  const textOpacity = phase === 'outroFade' || phase === 'done' ? 0 : 1;

  // Digit roll speed: normal → slow → dramatic
  const digitDuration = isOutro ? 2.8 : 1.8;

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
      {/* ── Video Layer ── */}
      <motion.div
        initial={false}
        animate={{ opacity: videoOpacity }}
        transition={{ duration: 1.5, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          aspectRatio: `${VIDEO_ASPECT}`,
        }}
      >
        <motion.video
          ref={video2024Ref}
          src={VIDEO_CONFIG[2024].src}
          muted
          loop
          playsInline
          preload="auto"
          initial={false}
          animate={{ opacity: currentYear === 2024 ? 1 : 0 }}
          transition={{ duration: 1.8, ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
        <motion.video
          ref={video2025Ref}
          src={VIDEO_CONFIG[2025].src}
          muted
          loop
          playsInline
          preload="auto"
          initial={false}
          animate={{ opacity: currentYear >= 2025 ? 1 : 0 }}
          transition={{ duration: 1.8, ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
      </motion.div>

      {/* ── Year Text Overlay ── */}
      <motion.div
        initial={false}
        animate={{
          top: isOutro ? '50%' : '5%',
          y: isOutro ? '-50%' : '0%',
          scale: isOutro ? 2.5 : 1,
          opacity: textOpacity,
        }}
        transition={{ duration: isOutro ? 2.2 : 0.6, ease: [0.25, 0.1, 0.25, 1] }}
        style={{
          position: 'absolute',
          left: '50%',
          x: '-50%',
          zIndex: 10,
          fontSize: 'clamp(3rem, 8vw, 6rem)',
          pointerEvents: 'none',
        }}
      >
        <OdometerYear year={currentYear} digitDuration={digitDuration} />
      </motion.div>
    </div>
  );
}
