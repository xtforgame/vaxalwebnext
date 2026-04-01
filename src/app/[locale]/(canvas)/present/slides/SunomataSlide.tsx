'use client';

import React from 'react';
import { motion } from 'motion/react';
import { Zap, Users, Clock } from 'lucide-react';
import SlideContainer, { SlideTitle, BodyText } from '../components/SlideContainer';

const execItems = [
  { Icon: Zap, label: 'Development', text: '數週內由 AI 輔助開發完成。' },
  { Icon: Users, label: 'UX', text: '支援匿名/會員雙模式，QR Code 全程傳遞。' },
  { Icon: Clock, label: 'Training', text: '工讀生僅需 10 分鐘即可上線操作。' },
];

export const SunomataSlide: React.FC = () => (
  <SlideContainer hud={{ tr: 'CASE_ID: SUNOMATA' }}>
    <SlideTitle sub="「墨俁一夜城」：極速部署與全通路整合實證">
      CASE STUDY: SUNOMATA
    </SlideTitle>

    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, flex: 1, alignItems: 'center' }}>
      {/* Left text */}
      <motion.div
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.15 }}
      >
        <h3 style={{ fontFamily: 'var(--font-outfit)', fontSize: 16, fontWeight: 600, color: '#999', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
          THE CHALLENGE
        </h3>
        <ul style={{ listStyle: 'disc', paddingLeft: 20, marginBottom: 28 }}>
          <li style={{ color: '#B0B0B0', fontSize: 14, lineHeight: 1.7, fontFamily: 'var(--font-noto-sans-tc)', marginBottom: 6 }}>
            既有 POS (iChef) 在快閃店活動中操作繁瑣，數據無法與線上會員打通。
          </li>
          <li style={{ color: '#B0B0B0', fontSize: 14, lineHeight: 1.7, fontFamily: 'var(--font-noto-sans-tc)' }}>
            需求：一個能整合線上庫存、會員識別、現場快速結帳的系統。
          </li>
        </ul>

        <h3 style={{ fontFamily: 'var(--font-outfit)', fontSize: 16, fontWeight: 600, color: '#999', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>
          THE EXECUTION
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {execItems.map(({ Icon, label, text }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: '#1A1A1A',
                  border: '1px solid #2A2A2A',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Icon size={16} color="#C9A84C" />
              </div>
              <BodyText style={{ fontSize: 14 }}>
                <strong style={{ color: '#D0D0D0' }}>{label}:</strong>{' '}{text}
              </BodyText>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Right image */}
      <motion.div
        initial={{ opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.25 }}
        style={{
          position: 'relative',
          width: '100%',
          height: 360,
          borderRadius: 12,
          overflow: 'hidden',
          border: '1px solid #2A2A2A',
          background: '#1A1A1A',
        }}
      >
        <img
          src="/rosie-presentation/Gemini_Generated_Image_1gfpq81gfpq81gfp.png"
          alt="Sunomata Blueprint"
          style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.75 }}
        />
        {/* Bottom gradient */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 80,
            background: 'linear-gradient(transparent, #1A1A1A)',
          }}
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
          STATUS: SUCCESS
        </div>
      </motion.div>
    </div>
  </SlideContainer>
);
