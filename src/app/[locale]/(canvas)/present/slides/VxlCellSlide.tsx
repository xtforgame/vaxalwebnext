'use client';

import React from 'react';
import { motion } from 'motion/react';
import SlideContainer, { SlideTitle } from '../components/SlideContainer';

export const VxlCellSlide: React.FC = () => (
  <SlideContainer hud={{ tr: 'CASE_ID: VXL CELL' }}>
    <SlideTitle sub="如同n8n一般，讓AI自行完成整趟workflow">
      WORKFLOW INTEGRATION: BrevFlow
    </SlideTitle>

    {/* Image */}
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.15 }}
      style={{
        flex: 1,
        position: 'relative',
        borderRadius: 12,
        overflow: 'hidden',
        border: '1px solid #2A2A2A',
        background: '#1A1A1A',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <img
        src="/rosie-presentation/vxl-flow.png"
        alt="VXL Workflow"
        style={{ width: '92%', height: '92%', objectFit: 'contain', opacity: 0.85 }}
      />
      {/* Status pill */}
      <div
        style={{
          position: 'absolute',
          bottom: 12,
          right: 12,
          fontFamily: 'var(--font-jetbrains-mono)',
          fontSize: 11,
          color: '#C9A84C',
          background: '#111',
          border: '1px solid #2A2A2A',
          borderRadius: 20,
          padding: '4px 14px',
          letterSpacing: 0.5,
        }}
      >
        STATUS: PROCESSING
      </div>
    </motion.div>
  </SlideContainer>
);
