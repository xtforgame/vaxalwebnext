'use client';

import { useEffect } from 'react';
import { motion, useAnimationControls } from 'motion/react';

// ============ SwipeRevealLine (single line) ============

interface SwipeRevealLineProps {
  text: string;
  delay: number;
  duration?: number;
  swipeColor?: string;
  style?: React.CSSProperties;
  exitAt?: number;
}

function SwipeRevealLine({
  text,
  delay,
  duration = 0.8,
  swipeColor = '#FF5858',
  style,
  exitAt,
}: SwipeRevealLineProps) {
  const textCtrl = useAnimationControls();
  const swipeCtrl = useAnimationControls();

  useEffect(() => {
    const run = async () => {
      // --- Entrance ---
      textCtrl.start({
        opacity: 1,
        transition: { duration: 0.01, delay: delay + duration * 0.5 },
      });
      await swipeCtrl.start({
        left: ['0%', '0%', '100%'],
        width: ['0%', '100%', '0%'],
        transition: { duration, delay, ease: 'easeOut', times: [0, 0.5, 1] },
      });

      if (exitAt == null) return;

      // --- Wait until exit time ---
      const entranceEnd = delay + duration;
      const wait = Math.max(0, exitAt - entranceEnd);
      if (wait > 0) await new Promise((r) => setTimeout(r, wait * 1000));

      // --- Exit ---
      textCtrl.start({
        opacity: 0,
        transition: { duration: 0.01, delay: duration * 0.5 },
      });
      await swipeCtrl.start({
        left: ['0%', '0%', '100%'],
        width: ['0%', '100%', '0%'],
        transition: { duration, ease: 'easeOut', times: [0, 0.5, 1] },
      });
    };
    run();
  }, [delay, duration, exitAt, textCtrl, swipeCtrl]);

  return (
    <div style={{ position: 'relative', width: 'fit-content' }}>
      {/* Text */}
      <motion.div initial={{ opacity: 0 }} animate={textCtrl} style={style}>
        {text}
      </motion.div>

      {/* Swipe overlay */}
      <motion.div
        style={{
          position: 'absolute',
          top: 0,
          height: '100%',
          background: swipeColor,
          zIndex: 1,
        }}
        initial={{ left: '0%', width: '0%' }}
        animate={swipeCtrl}
      />
    </div>
  );
}

// ============ SwipeRevealText (title + description) ============

interface SwipeRevealTextProps {
  title: string;
  description: string;
  x?: number;
  y?: number;
  delay?: number;
  stagger?: number;
  duration?: number;
  titleSwipeColor?: string;
  descriptionSwipeColor?: string;
  titleStyle?: React.CSSProperties;
  descriptionStyle?: React.CSSProperties;
  exitDelay?: number;
}

export default function SwipeRevealText({
  title,
  description,
  x = 48,
  y = 120,
  delay = 1.0,
  stagger = 0.5,
  duration = 0.8,
  titleSwipeColor = '#FF5858',
  descriptionSwipeColor = '#ffffff',
  titleStyle,
  descriptionStyle,
  exitDelay,
}: SwipeRevealTextProps) {
  // Last entrance finishes at: delay + stagger + duration
  // Exit begins at: delay + stagger + duration + exitDelay
  const exitStart =
    exitDelay != null ? delay + stagger + duration + exitDelay : undefined;

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        bottom: y,
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        pointerEvents: 'none',
      }}
    >
      <SwipeRevealLine
        text={title}
        delay={delay}
        duration={duration}
        swipeColor={titleSwipeColor}
        exitAt={exitStart}
        style={{
          fontSize: 48,
          fontWeight: 900,
          lineHeight: 1,
          color: '#ffffff',
          textTransform: 'uppercase',
          padding: '12px 20px',
          fontFamily: 'montserrat, sans-serif',
          ...titleStyle,
        }}
      />
      <SwipeRevealLine
        text={description}
        delay={delay + stagger}
        duration={duration}
        swipeColor={descriptionSwipeColor}
        exitAt={exitStart != null ? exitStart + stagger : undefined}
        style={{
          fontSize: 22,
          fontWeight: 700,
          lineHeight: 1,
          color: '#ffffff',
          textTransform: 'uppercase',
          padding: '8px 14px',
          fontFamily: 'montserrat, sans-serif',
          ...descriptionStyle,
        }}
      />
    </div>
  );
}
