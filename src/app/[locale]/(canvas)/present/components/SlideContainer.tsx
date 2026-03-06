'use client';

import React, { useRef, useState, useLayoutEffect } from 'react';

/*
 * ROSIE Presentation Design Tokens
 * ─────────────────────────────────
 * bg:           #111111
 * card:         #1A1A1A  border #2A2A2A  radius 12px
 * text-primary: #F0F0F0  (headings)
 * text-body:    #B0B0B0  (body, ~8:1 contrast on #111)
 * text-muted:   #707070  (labels, HUD)
 * accent:       #C9A84C  (gold, highlights only)
 * spacing:      slide p-10 (40px), card p-6 (24px), gap-6~8
 * fonts:        Outfit (heading), Noto Sans TC (body-zh), JetBrains Mono (code)
 */

const DESIGN_W = 1280;
const DESIGN_H = 720;

/** Pure React replacement for ScaleToWidthContainer (no Emotion) */
function SlideScaler({ children }: { children: React.ReactNode }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState({ scale: 1, isScaling: false, wrapperH: DESIGN_H as number | 'auto' });

  useLayoutEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const calc = () => {
      const w = wrapper.clientWidth;
      const h = wrapper.parentElement?.clientHeight || wrapper.clientHeight;

      if (w > DESIGN_W) {
        const sx = w / DESIGN_W;
        const sy = h / DESIGN_H;
        const s = Math.min(sx, sy);
        setState({ scale: s, isScaling: true, wrapperH: DESIGN_H * s });
      } else {
        setState({ scale: 1, isScaling: false, wrapperH: DESIGN_H });
      }
    };

    const ro = new ResizeObserver(calc);
    ro.observe(wrapper);
    calc();
    return () => ro.disconnect();
  }, []);

  const { scale, isScaling, wrapperH } = state;

  return (
    <div
      ref={wrapperRef}
      style={{
        width: '100%',
        height: typeof wrapperH === 'number' ? wrapperH : 'auto',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: isScaling ? DESIGN_W : '100%',
          height: isScaling ? 'auto' : DESIGN_H,
          minHeight: isScaling ? undefined : DESIGN_H,
          maxHeight: isScaling ? undefined : DESIGN_H,
          transformOrigin: 'top left',
          transform: isScaling ? `scale(${scale})` : 'none',
          willChange: 'transform',
          backfaceVisibility: 'hidden',
          WebkitFontSmoothing: 'antialiased',
        }}
      >
        {children}
      </div>
    </div>
  );
}

type HudPosition = 'tl' | 'tr' | 'bl' | 'br';
type HudMap = Partial<Record<HudPosition, React.ReactNode>>;

const hudPos: Record<HudPosition, React.CSSProperties> = {
  tl: { top: 16, left: 20 },
  tr: { top: 16, right: 20, textAlign: 'right' },
  bl: { bottom: 16, left: 20 },
  br: { bottom: 16, right: 20, textAlign: 'right' },
};

export const SlideContainer: React.FC<{
  hud?: HudMap;
  children: React.ReactNode;
  className?: string;
}> = ({ hud = {}, children, className = '' }) => (
  <SlideScaler>
    <div
      className={className}
      style={{
        width: 1280,
        height: 720,
        background: '#111111',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        padding: 40,
      }}
    >
      {(Object.entries(hud) as [HudPosition, React.ReactNode][]).map(
        ([pos, content]) =>
          content && (
            <div
              key={pos}
              style={{
                position: 'absolute',
                fontFamily: 'var(--font-jetbrains-mono)',
                fontSize: 10,
                color: '#555',
                letterSpacing: 1,
                ...hudPos[pos],
              }}
            >
              {content}
            </div>
          )
      )}
      {children}
    </div>
  </SlideScaler>
);

/* ── Reusable sub-components ── */

export const SlideTitle: React.FC<{
  children: React.ReactNode;
  sub?: string;
  size?: number;
}> = ({ children, sub, size = 36 }) => (
  <div style={{ marginBottom: sub ? 8 : 24 }}>
    <h2
      style={{
        fontFamily: 'var(--font-outfit)',
        fontSize: size,
        fontWeight: 700,
        color: '#F0F0F0',
        textTransform: 'uppercase',
        letterSpacing: -0.5,
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        lineHeight: 1.1,
        margin: 0,
      }}
    >
      <span
        style={{
          display: 'block',
          width: 4,
          height: size * 0.85,
          background: '#C9A84C',
          borderRadius: 2,
          flexShrink: 0,
        }}
      />
      {children}
    </h2>
    {sub && (
      <p
        style={{
          fontFamily: 'var(--font-noto-sans-tc)',
          fontSize: 15,
          color: '#808080',
          marginTop: 6,
          marginLeft: 18,
          marginBottom: 24,
        }}
      >
        {sub}
      </p>
    )}
  </div>
);

export const Card: React.FC<{
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}> = ({ children, style: customStyle, className }) => (
  <div
    className={className}
    style={{
      background: '#1A1A1A',
      border: '1px solid #2A2A2A',
      borderRadius: 12,
      padding: 24,
      ...customStyle,
    }}
  >
    {children}
  </div>
);

export const Mono: React.FC<{
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ children, style: s }) => (
  <span
    style={{
      fontFamily: 'var(--font-jetbrains-mono)',
      fontSize: 12,
      color: '#C9A84C',
      letterSpacing: 0.5,
      ...s,
    }}
  >
    {children}
  </span>
);

export const BodyText: React.FC<{
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ children, style: s }) => (
  <p
    style={{
      fontFamily: 'var(--font-noto-sans-tc)',
      fontSize: 15,
      lineHeight: 1.7,
      color: '#B0B0B0',
      margin: 0,
      ...s,
    }}
  >
    {children}
  </p>
);

export default SlideContainer;
