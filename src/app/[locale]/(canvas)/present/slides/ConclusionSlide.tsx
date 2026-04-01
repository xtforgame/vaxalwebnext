'use client';

import React from 'react';
import { motion } from 'motion/react';
import SlideContainer from '../components/SlideContainer';

export const ConclusionSlide: React.FC = () => (
  <SlideContainer>
    {/* Background crosshair */}
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      <motion.div
        style={{
          width: 240,
          height: 240,
          borderRadius: '50%',
          border: '1px dashed #2A2A2A',
        }}
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
      />
      {/* Cross */}
      <div style={{ position: 'absolute', width: 1, height: 80, background: '#1E1E1E' }} />
      <div style={{ position: 'absolute', width: 80, height: 1, background: '#1E1E1E' }} />
      {/* Center dot */}
      <div style={{ position: 'absolute', width: 4, height: 4, borderRadius: '50%', background: '#C9A84C' }} />
    </div>

    {/* Content */}
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
        position: 'relative',
        zIndex: 1,
      }}
    >
      <motion.div
        style={{
          fontFamily: 'var(--font-jetbrains-mono)',
          fontSize: 44,
          color: '#C9A84C',
          lineHeight: 1,
        }}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {'> SYSTEM_READY_'}
      </motion.div>

      <motion.p
        style={{
          fontFamily: 'var(--font-outfit)',
          fontSize: 16,
          color: '#606060',
          letterSpacing: 2,
          marginTop: 16,
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
      >
        INTERNAL BETA DEPLOYMENT IMMINENT
      </motion.p>

      <motion.div
        style={{
          marginTop: 56,
          borderTop: '1px solid #2A2A2A',
          paddingTop: 20,
          width: 360,
        }}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <p
          style={{
            fontFamily: 'var(--font-jetbrains-mono)',
            fontSize: 13,
            color: '#555',
            lineHeight: 1.7,
          }}
        >
          MISSION: LEAD THE AI ERA
          <br />
          STATUS: <span style={{ color: '#C9A84C' }}>GO</span>
        </p>
      </motion.div>
    </div>
  </SlideContainer>
);
