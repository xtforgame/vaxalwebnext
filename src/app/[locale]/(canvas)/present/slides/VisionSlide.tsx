'use client';

import React from 'react';
import { motion } from 'motion/react';
import { Database, Shield, Rocket } from 'lucide-react';
import SlideContainer, { SlideTitle, Mono } from '../components/SlideContainer';

const pillars = [
  {
    Icon: Database,
    en: 'DATA SOVEREIGNTY',
    label: '數據自主',
    desc: '擁有完全掌控的私有電商數據，不被 SaaS 綁架。數據即武器，主權在我。',
  },
  {
    Icon: Shield,
    en: 'BRAND MOAT',
    label: '實業護城河',
    desc: '實體品牌價值抗跌，無懼 AI 泡沫化風險。實業根基穩固，不怕泡沫。',
  },
  {
    Icon: Rocket,
    en: 'AGILE FORCE',
    label: '敏捷團隊',
    desc: '自有開發團隊，迭代速度遠超外包與傳統競品。別人一週，我們兩天。',
  },
];

export const VisionSlide: React.FC = () => (
  <SlideContainer hud={{ tl: 'STRATEGY // HORIZON' }}>
    <SlideTitle sub="2026-2030 戰略佈局：確保生存，定義未來">
      THE CTO DIRECTIVE
    </SlideTitle>

    {/* Phase banner + Quote row */}
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ background: '#C9A84C', borderRadius: 6, padding: '6px 16px' }}>
          <span style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 13, fontWeight: 600, color: '#111111', letterSpacing: 1 }}>
            PHASE 1: 2026
          </span>
        </div>
        <p style={{ fontFamily: 'var(--font-noto-sans-tc)', fontSize: 15, color: '#B0B0B0', margin: 0 }}>
          技術架構轉移與重整 — 將工作流全面 AI 化
        </p>
      </div>
      <p style={{ fontFamily: 'var(--font-noto-sans-tc)', fontSize: 15, fontWeight: 700, color: '#D0D0D0', margin: 0 }}>
        「確保今年的 Studio Doe，是 AI 時代的頂級玩家。」
      </p>
    </motion.div>

    {/* 3 Advantage Pillars — horizontal cards */}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, flex: 1 }}>
      {pillars.map(({ Icon, en, label, desc }, i) => (
        <motion.div
          key={en}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 + i * 0.1 }}
          style={{
            background: '#1A1A1A',
            border: '1px solid #2A2A2A',
            borderRadius: 12,
            padding: '28px 28px 24px',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Gold top accent */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, #C9A84C, transparent)' }} />

          {/* Header: icon + english label inline */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: '#222',
                border: '1px solid #333',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Icon size={18} color="#C9A84C" />
            </div>
            <Mono>{en}</Mono>
          </div>

          {/* Chinese title — large */}
          <h3
            style={{
              fontFamily: 'var(--font-noto-sans-tc)',
              fontSize: 28,
              fontWeight: 700,
              color: '#F0F0F0',
              margin: 0,
              marginBottom: 14,
              lineHeight: 1.2,
            }}
          >
            {label}
          </h3>

          {/* Divider */}
          <div style={{ width: 32, height: 2, background: '#C9A84C', marginBottom: 14, opacity: 0.6 }} />

          {/* Description — the key message, prominent */}
          <p
            style={{
              fontFamily: 'var(--font-noto-sans-tc)',
              fontSize: 16,
              lineHeight: 1.8,
              color: '#C0C0C0',
              margin: 0,
            }}
          >
            {desc}
          </p>
        </motion.div>
      ))}
    </div>
  </SlideContainer>
);
