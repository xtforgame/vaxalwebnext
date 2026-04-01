'use client';

import React from 'react';
import { motion } from 'motion/react';
import { X, Check } from 'lucide-react';
import SlideContainer, { SlideTitle, BodyText } from '../components/SlideContainer';

export const ComparisonSlide: React.FC = () => (
  <SlideContainer hud={{ tl: 'COMPARISON' }}>
    <SlideTitle sub="為何我們需要自建平台？通用 AI vs. 深度整合">
      THE CONTEXT ENGINE
    </SlideTitle>

    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, flex: 1, alignItems: 'center' }}>
      {/* Generic AI */}
      <motion.div
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.15 }}
        style={{
          background: '#1A1A1A',
          border: '1px dashed #3A2020',
          borderRadius: 12,
          padding: 24,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        <h3
          style={{
            fontFamily: 'var(--font-outfit)',
            fontSize: 16,
            fontWeight: 600,
            color: '#777',
            textTransform: 'uppercase',
            letterSpacing: 1,
            marginBottom: 20,
          }}
        >
          GENERIC AI (ChatGPT/Gemini)
        </h3>

        {/* Dialog */}
        <div
          style={{
            background: '#141414',
            borderRadius: 8,
            padding: 16,
            marginBottom: 16,
            fontFamily: 'var(--font-jetbrains-mono)',
            fontSize: 13,
            lineHeight: 1.7,
          }}
        >
          <p style={{ color: '#B0B0B0', margin: 0, marginBottom: 6 }}>
            <strong style={{ color: '#D0D0D0' }}>User:</strong> &quot;分析上個月業績。&quot;
          </p>
          <p style={{ color: '#C06060', margin: 0 }}>
            <strong style={{ color: '#D07070' }}>AI:</strong> &quot;請提供報表 CSV。請問業績定義是什麼？GMV 還是 Net Sales？&quot;
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <X size={16} color="#C06060" style={{ marginTop: 2, flexShrink: 0 }} />
          <BodyText style={{ fontSize: 13 }}>
            <strong style={{ color: '#C0C0C0' }}>摩擦力大：</strong>需要反覆餵食背景知識，效率低落。
          </BodyText>
        </div>
      </motion.div>

      {/* ROSIE */}
      <motion.div
        initial={{ opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.25 }}
        style={{
          background: '#1A1A1A',
          border: '1px solid #203A20',
          borderRadius: 12,
          padding: 24,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        <h3
          style={{
            fontFamily: 'var(--font-outfit)',
            fontSize: 16,
            fontWeight: 600,
            color: '#D0D0D0',
            textTransform: 'uppercase',
            letterSpacing: 1,
            marginBottom: 20,
          }}
        >
          ROSIE (Studio Doe)
        </h3>

        {/* Dialog */}
        <div
          style={{
            background: '#141414',
            borderRadius: 8,
            padding: 16,
            marginBottom: 16,
            fontFamily: 'var(--font-jetbrains-mono)',
            fontSize: 13,
            lineHeight: 1.7,
          }}
        >
          <p style={{ color: '#B0B0B0', margin: 0, marginBottom: 6 }}>
            <strong style={{ color: '#D0D0D0' }}>User:</strong> &quot;給 @Marketing 上個月業績分析。&quot;
          </p>
          <p style={{ color: '#60A060', margin: 0 }}>
            <strong style={{ color: '#70B070' }}>Rosie:</strong> &quot;已讀取 DB schema。正依據 Doe 標準計算 GMV MoM/YoY。已發送郵件給行銷部經理。&quot;
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <Check size={16} color="#60A060" style={{ marginTop: 2, flexShrink: 0 }} />
          <BodyText style={{ fontSize: 13 }}>
            <strong style={{ color: '#C0C0C0' }}>零摩擦：</strong>如同與資深員工對話，預設理解所有公司脈絡。
          </BodyText>
        </div>
      </motion.div>
    </div>
  </SlideContainer>
);
