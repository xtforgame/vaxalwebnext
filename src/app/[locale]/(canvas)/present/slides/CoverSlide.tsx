'use client';

import React from 'react';
import { motion } from 'motion/react';
import SlideContainer from '../components/SlideContainer';

export const CoverSlide: React.FC = () => (
  <SlideContainer
    hud={{
      tl: 'SYS.INIT // STUDIO_DOE',
      tr: <>USER: CTO<br />SEC: LEVEL_5</>,
      bl: 'AZCARGOT LAB',
      br: 'VER. 2026.03',
    }}
  >
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
      }}
    >
      {/* Circle element */}
      <div
        style={{
          position: 'relative',
          width: 200,
          height: 200,
          marginBottom: 36,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Static ring */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: '1px solid #2A2A2A',
          }}
        />
        {/* Rotating orbit */}
        <motion.div
          style={{
            position: 'absolute',
            width: '135%',
            height: '135%',
            borderRadius: '50%',
            border: '1px solid #222',
            borderTopColor: '#C9A84C',
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
        />
        {/* Center letter */}
        <span
          style={{
            fontFamily: 'var(--font-outfit)',
            fontSize: 56,
            fontWeight: 700,
            color: '#F0F0F0',
          }}
        >
          R
        </span>
      </div>

      {/* Title */}
      <motion.h1
        style={{
          fontFamily: 'var(--font-outfit)',
          fontSize: 72,
          fontWeight: 800,
          color: '#F0F0F0',
          letterSpacing: 12,
          lineHeight: 1,
          margin: 0,
        }}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        ROSIE
      </motion.h1>

      {/* Gold accent line */}
      <motion.div
        style={{
          width: 48,
          height: 2,
          background: '#C9A84C',
          marginTop: 20,
          marginBottom: 20,
        }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.3, delay: 0.25 }}
      />

      {/* Mono subtitle */}
      <motion.p
        style={{
          fontFamily: 'var(--font-jetbrains-mono)',
          fontSize: 13,
          color: '#707070',
          letterSpacing: 2,
          margin: 0,
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
      >
        PROJECT PROTOCOL: ACTIVATED
      </motion.p>

      {/* Chinese subtitle */}
      <motion.p
        style={{
          fontFamily: 'var(--font-noto-sans-tc)',
          fontSize: 14,
          color: '#606060',
          marginTop: 8,
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.45 }}
      >
        Studio Doe 企業智能整合計畫書
      </motion.p>
    </div>
  </SlideContainer>
);
