'use client';

import React from 'react';
import { motion } from 'motion/react';
import SlideContainer, { SlideTitle, BodyText } from '../components/SlideContainer';

export const IndustrySlide: React.FC = () => (
  <SlideContainer hud={{ tl: 'INTEL // ANTHROPIC REPORT', tr: 'SOURCE: ANTHROPIC 2025' }}>
    <SlideTitle sub="Anthropic 研究報告：AI Agent 各產業部署佔比分析">
      THE LANDSCAPE
    </SlideTitle>

    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, flex: 1, alignItems: 'center' }}>
      {/* Left: Chart image */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.15 }}
        style={{
          borderRadius: 12,
          overflow: 'hidden',
          border: '1px solid #2A2A2A',
          background: '#F5F0E8',
        }}
      >
        <img
          src="/649871121c92cf99.webp"
          alt="Anthropic: In what domains are agents deployed?"
          style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
        />
      </motion.div>

      {/* Right: Analysis */}
      <motion.div
        initial={{ opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.25 }}
        style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
      >
        {/* Insight 1 */}
        <div
          style={{
            background: '#1A1A1A',
            border: '1px solid #2A2A2A',
            borderRadius: 12,
            padding: 24,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 12 }}>
            <span
              style={{
                fontFamily: 'var(--font-outfit)',
                fontSize: 44,
                fontWeight: 800,
                color: '#C9A84C',
                lineHeight: 1,
              }}
            >
              49.7%
            </span>
            <span
              style={{
                fontFamily: 'var(--font-jetbrains-mono)',
                fontSize: 12,
                color: '#707070',
                letterSpacing: 1,
              }}
            >
              SOFTWARE ENG.
            </span>
          </div>
          <BodyText>
            軟體工程佔據近半數的 AI 工具呼叫，印證了資訊部門在 AI 浪潮中的<strong style={{ color: '#D0D0D0' }}>核心受益者</strong>地位。這正是我們部門生產力倍增的底層原因。
          </BodyText>
        </div>

        {/* Insight 2 */}
        <div
          style={{
            background: '#1A1A1A',
            border: '1px solid #2A2A2A',
            borderRadius: 12,
            padding: 24,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 12 }}>
            <span
              style={{
                fontFamily: 'var(--font-outfit)',
                fontSize: 44,
                fontWeight: 800,
                color: '#C9A84C',
                lineHeight: 1,
              }}
            >
              1.3%
            </span>
            <span
              style={{
                fontFamily: 'var(--font-jetbrains-mono)',
                fontSize: 12,
                color: '#707070',
                letterSpacing: 1,
              }}
            >
              E-COMMERCE
            </span>
          </div>
          <BodyText>
            電商領域的 AI 滲透率僅 1.3%，代表<strong style={{ color: '#D0D0D0' }}>巨大的未開發空間</strong>。而 Studio Doe 已經在這個領域開始佈局 — 我們是極少數已將 AI 深度融入電商營運的公司。
          </BodyText>
        </div>

        {/* Bottom takeaway */}
        <p
          style={{
            fontFamily: 'var(--font-noto-sans-tc)',
            fontSize: 14,
            color: '#707070',
            lineHeight: 1.6,
            borderLeft: '2px solid #C9A84C',
            paddingLeft: 16,
            margin: 0,
          }}
        >
          結論：軟體部門的 AI 加持已被驗證，電商 AI 化才剛開始 — 先行者將定義遊戲規則。
        </p>
      </motion.div>
    </div>
  </SlideContainer>
);
