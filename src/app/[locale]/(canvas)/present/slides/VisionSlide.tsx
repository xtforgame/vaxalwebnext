'use client';

import React from 'react';
import { motion } from 'motion/react';
import SlideContainer, { SlideTitle, Card, Mono, BodyText } from '../components/SlideContainer';

const advantages = [
  { key: '數據自主:', val: '擁有完全掌控的私有電商數據，不被 SaaS 綁架。' },
  { key: '實業護城河:', val: '實體品牌價值抗跌，無懼 AI 泡沫化風險。' },
  { key: '敏捷團隊:', val: '自有開發團隊，迭代速度遠超外包與傳統競品。' },
];

export const VisionSlide: React.FC = () => (
  <SlideContainer hud={{ tl: 'STRATEGY // HORIZON' }}>
    <SlideTitle sub="2026-2030 戰略佈局：確保生存，定義未來">
      THE CTO DIRECTIVE
    </SlideTitle>

    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, flex: 1, alignItems: 'center' }}>
      {/* Left: Image */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.15 }}
        style={{ display: 'flex', justifyContent: 'center' }}
      >
        <img
          src="/rosie-presentation/vision.png"
          alt="Radar Strategy"
          style={{ width: '100%', objectFit: 'contain', borderRadius: 8 }}
        />
      </motion.div>

      {/* Right: Text + Cards */}
      <motion.div
        initial={{ opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.25 }}
        style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
      >
        {/* Quote */}
        <p
          style={{
            fontFamily: 'var(--font-noto-sans-tc)',
            fontSize: 17,
            fontWeight: 700,
            color: '#D0D0D0',
            lineHeight: 1.5,
            marginBottom: 4,
          }}
        >
          「確保今年的 Studio Doe，是 AI 時代的頂級玩家。」
        </p>

        {/* Phase 1 */}
        <Card>
          <Mono>PHASE 1: 2026</Mono>
          <BodyText style={{ marginTop: 8 }}>
            <strong style={{ color: '#D0D0D0' }}>技術架構轉移與重整。</strong>{' '}
            不影響業績前提下，將工作流全面 AI 化。讓資訊部不僅是後勤，更是營利單位。
          </BodyText>
        </Card>

        {/* Doe Advantage */}
        <Card>
          <Mono>THE DOE ADVANTAGE</Mono>
          <div style={{ marginTop: 10 }}>
            {advantages.map((item, i) => (
              <div
                key={item.key}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  padding: '10px 0',
                  borderBottom: i < advantages.length - 1 ? '1px solid #2A2A2A' : 'none',
                  gap: 16,
                }}
              >
                <strong
                  style={{
                    fontFamily: 'var(--font-noto-sans-tc)',
                    fontSize: 13,
                    color: '#C0C0C0',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  {item.key}
                </strong>
                <span
                  style={{
                    fontFamily: 'var(--font-noto-sans-tc)',
                    fontSize: 13,
                    color: '#909090',
                    textAlign: 'right',
                  }}
                >
                  {item.val}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </motion.div>
    </div>
  </SlideContainer>
);
