'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';

// ============ Constants ============

const SIZE = 80;
const RIPPLE_DURATION = 0.6;
const RIPPLE_SCALE = 4;
const APPEAR_DURATION = 0.5; // entrance animation duration

// ============ Component ============

interface GoButtonProps {
  visible: boolean;
  onClick: () => void;
  autoDelay?: number; // seconds after fully appeared before auto-triggering (default 0.5)
}

export default function GoButton({ visible, onClick, autoDelay = 0.5 }: GoButtonProps) {
  const [ripples, setRipples] = useState<number[]>([]);
  const [fading, setFading] = useState(false);
  const triggeredRef = useRef(false);

  const handleClick = () => {
    if (triggeredRef.current) return;
    triggeredRef.current = true;
    setRipples((prev) => [...prev, Date.now()]);
    setFading(true);
    setTimeout(onClick, 500);
  };

  // Auto-trigger after entrance animation + autoDelay if user hasn't clicked
  useEffect(() => {
    if (!visible) {
      triggeredRef.current = false;
      setFading(false);
      return;
    }
    const timer = setTimeout(handleClick, (APPEAR_DURATION + autoDelay) * 1000);
    return () => clearTimeout(timer);
  }, [visible, autoDelay, onClick]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: fading ? 0 : 1, scale: fading ? 0.8 : 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            marginLeft: -SIZE / 2,
            marginTop: -SIZE / 2,
            zIndex: 150,
            pointerEvents: fading ? 'none' : 'auto',
          }}
        >
          {/* Ripple rings */}
          {ripples.map((key) => (
            <motion.div
              key={key}
              initial={{ scale: 1, opacity: 0.6 }}
              animate={{ scale: RIPPLE_SCALE, opacity: 0 }}
              transition={{ duration: RIPPLE_DURATION, ease: 'easeOut' }}
              onAnimationComplete={() =>
                setRipples((prev) => prev.filter((k) => k !== key))
              }
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: SIZE,
                height: SIZE,
                borderRadius: '50%',
                border: '2px solid rgba(255,255,255,0.5)',
                pointerEvents: 'none',
              }}
            />
          ))}

          {/* Button */}
          <button
            onClick={handleClick}
            style={{
              width: SIZE,
              height: SIZE,
              borderRadius: '50%',
              border: '2px solid rgba(255,255,255,0.8)',
              background: 'rgba(255,255,255,0.1)',
              backdropFilter: 'blur(4px)',
              color: '#fff',
              fontSize: 24,
              fontWeight: 900,
              fontFamily: 'montserrat, sans-serif',
              cursor: 'pointer',
              letterSpacing: 2,
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')
            }
          >
            GO
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
