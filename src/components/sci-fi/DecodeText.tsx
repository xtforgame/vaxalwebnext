'use client';

import { useState, useEffect } from 'react';

export interface DecodeTextProps {
  /** Target text to reveal */
  text: string;
  /** Trigger the decode animation */
  active: boolean;
  /** Animation duration in frames (default: 40) */
  duration?: number;
  /** Character set used for scramble (default: uppercase + digits + symbols) */
  chars?: string;
  /** Optional className on the wrapping span */
  className?: string;
}

const DEFAULT_CHARS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()';

export default function DecodeText({
  text,
  active,
  duration = 40,
  chars = DEFAULT_CHARS,
  className,
}: DecodeTextProps) {
  const [displayText, setDisplayText] = useState('');

  useEffect(() => {
    if (!active) {
      setDisplayText('');
      return;
    }

    let frame = 0;

    const tick = () => {
      frame++;
      const progress = frame / duration;
      const revealCount = Math.floor(progress * text.length);

      let next = '';
      for (let i = 0; i < text.length; i++) {
        if (i < revealCount) {
          next += text[i];
        } else if (text[i] === ' ') {
          next += ' ';
        } else {
          next += chars[Math.floor(Math.random() * chars.length)];
        }
      }

      setDisplayText(next);

      if (frame < duration) {
        requestAnimationFrame(tick);
      } else {
        setDisplayText(text);
      }
    };

    requestAnimationFrame(tick);
  }, [active, text, duration, chars]);

  return <span className={className}>{displayText}</span>;
}
