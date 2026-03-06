'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Eye } from 'lucide-react';
import SlideContainer, { SlideTitle } from '../components/SlideContainer';

const tiers = [
  { label: '完全未使用 AI', en: 'NO AI', pct: 29, color: '#333' },
  { label: '表層使用', en: 'SURFACE', pct: 21, color: '#3D3520' },
  { label: '流程整合', en: 'INTEGRATED', pct: 24, color: '#4A3D1A' },
  { label: '深度結合', en: 'DEEP FUSION', pct: 26, color: '#5C4A15' },
];

const markers = [
  {
    id: 'training',
    label: '外訓課程內容',
    sub: '表層使用範圍',
    position: 40,
    color: '#A0A0A0',
  },
  {
    id: 'taiwan',
    label: '台灣 AI 公司平均',
    sub: '流程整合範圍',
    position: 70,
    color: '#C0C0C0',
  },
];

const doeMarker = {
  label: 'Studio Doe',
  sub: '企業私有 AI 架構',
  position: 96,
};

export const MaturitySlide: React.FC = () => {
  const [showDoe, setShowDoe] = useState(false);

  return (
    <SlideContainer hud={{ tl: 'BENCHMARK // MATURITY' }}>
      <SlideTitle sub="企業 AI 成熟度分佈：我們在哪裡？">
        AI MATURITY SPECTRUM
      </SlideTitle>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>

        {/* Marker arrows area */}
        <div style={{ position: 'relative', height: 130, marginBottom: 8 }}>
          {markers.map((m) => (
            <div
              key={m.id}
              style={{
                position: 'absolute',
                left: `${m.position}%`,
                bottom: 0,
                transform: 'translateX(-50%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <div style={{ textAlign: 'center', marginBottom: 8 }}>
                {/* Percentile badge */}
                <div
                  style={{
                    fontFamily: 'var(--font-jetbrains-mono)',
                    fontSize: 14,
                    fontWeight: 600,
                    color: m.color,
                    marginBottom: 4,
                  }}
                >
                  Top {100 - m.position}%
                </div>
                <div style={{ fontFamily: 'var(--font-noto-sans-tc)', fontSize: 14, fontWeight: 700, color: m.color }}>
                  {m.label}
                </div>
                <div style={{ fontFamily: 'var(--font-noto-sans-tc)', fontSize: 11, color: '#909090', marginTop: 2 }}>
                  {m.sub}
                </div>
              </div>
              <div style={{ width: 1, height: 20, background: m.color, opacity: 0.7 }} />
              <div
                style={{
                  width: 0,
                  height: 0,
                  borderLeft: '4px solid transparent',
                  borderRight: '4px solid transparent',
                  borderTop: `6px solid ${m.color}`,
                  opacity: 0.7,
                }}
              />
            </div>
          ))}

          {/* Doe marker (animated) */}
          <AnimatePresence>
            {showDoe && (
              <motion.div
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                style={{
                  position: 'absolute',
                  left: `${doeMarker.position}%`,
                  bottom: 0,
                  width: 0,
                  height: '100%',
                }}
              >
                {/* Text — right edge aligns with arrow */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: 35,
                    right: 0,
                    whiteSpace: 'nowrap',
                    textAlign: 'right',
                  }}
                >
                  <div
                    style={{
                      fontFamily: 'var(--font-jetbrains-mono)',
                      fontSize: 16,
                      fontWeight: 700,
                      color: '#C9A84C',
                      marginBottom: 4,
                    }}
                  >
                    Top {100 - doeMarker.position}%
                  </div>
                  <div style={{ fontFamily: 'var(--font-outfit)', fontSize: 16, fontWeight: 700, color: '#C9A84C' }}>
                    {doeMarker.label}
                  </div>
                  <div style={{ fontFamily: 'var(--font-noto-sans-tc)', fontSize: 11, color: '#C9A84C', opacity: 0.8, marginTop: 2 }}>
                    {doeMarker.sub}
                  </div>
                </div>
                {/* Arrow stem — centered on left:96% */}
                <div style={{ position: 'absolute', bottom: 7, left: -1, width: 2, height: 20, background: '#C9A84C' }} />
                {/* Arrow head */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: -5,
                    width: 0,
                    height: 0,
                    borderLeft: '5px solid transparent',
                    borderRight: '5px solid transparent',
                    borderTop: '7px solid #C9A84C',
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* The horizontal stacked bar */}
        <div style={{ display: 'flex', height: 64, borderRadius: 8, overflow: 'hidden', border: '1px solid #2A2A2A' }}>
          {tiers.map((t, i) => (
            <motion.div
              key={t.en}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.15 + i * 0.08, duration: 0.5, ease: 'easeOut' }}
              style={{
                width: `${t.pct}%`,
                background: t.color,
                transformOrigin: 'left',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRight: i < tiers.length - 1 ? '1px solid #222' : 'none',
                position: 'relative',
              }}
            >
              {i === tiers.length - 1 && showDoe && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(90deg, transparent 40%, rgba(201,168,76,0.15))',
                    pointerEvents: 'none',
                  }}
                />
              )}
            </motion.div>
          ))}
        </div>

        {/* Tier labels below bar */}
        <div style={{ display: 'flex', marginTop: 10 }}>
          {tiers.map((t) => (
            <div key={t.en} style={{ width: `${t.pct}%`, textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 11, color: '#909090', letterSpacing: 0.5 }}>
                {t.en}
              </div>
              <div style={{ fontFamily: 'var(--font-noto-sans-tc)', fontSize: 13, color: '#C0C0C0', marginTop: 2 }}>
                {t.label}
              </div>
              <div style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 13, fontWeight: 600, color: '#B0B0B0', marginTop: 2 }}>
                {t.pct}%
              </div>
            </div>
          ))}
        </div>

        {/* Percentile scale */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14, padding: '0 4px' }}>
          {[0, 25, 50, 75, 100].map((n) => (
            <span key={n} style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 10, color: '#606060' }}>
              {n}%
            </span>
          ))}
        </div>

        {/* Reveal button */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }}>
          <motion.button
            onClick={() => setShowDoe(!showDoe)}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 28px',
              borderRadius: 8,
              border: showDoe ? '1px solid #C9A84C' : '1px solid #3A3A3A',
              background: showDoe ? 'rgba(201,168,76,0.1)' : '#1A1A1A',
              color: showDoe ? '#C9A84C' : '#C0C0C0',
              fontFamily: 'var(--font-jetbrains-mono)',
              fontSize: 13,
              letterSpacing: 1,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <Eye size={16} />
            {showDoe ? 'STUDIO DOE: REVEALED' : 'REVEAL STUDIO DOE POSITION'}
          </motion.button>
        </div>
      </div>
    </SlideContainer>
  );
};
