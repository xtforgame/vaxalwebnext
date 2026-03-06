'use client';

import React from 'react';
import { motion } from 'motion/react';
import { Fingerprint, ShieldCheck, Link } from 'lucide-react';
import SlideContainer, { SlideTitle, Card, BodyText } from '../components/SlideContainer';

const features = [
  {
    Icon: Fingerprint,
    title: 'Full Custom',
    desc: 'Azcargot Lab 獨立開發，非市售套版軟體。完全貼合 Doe 業務邏輯。',
  },
  {
    Icon: ShieldCheck,
    title: 'Security First',
    desc: '權限嚴格控管。Token 不經由 AI 傳遞。不存在 Prompt Injection 獲取權限的風險。',
  },
  {
    Icon: Link,
    title: 'Deep Integration',
    desc: '直接串接電商資料庫、Google Calendar 與 Email 系統。',
  },
];

export const RosieSlide: React.FC = () => (
  <SlideContainer hud={{ tr: 'ENTITY: COMPLETE' }}>
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        style={{ textAlign: 'center', marginBottom: 10 }}
      >
        <SlideTitle size={48}>MEET ROSIE</SlideTitle>
      </motion.div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        style={{
          fontFamily: 'var(--font-noto-sans-tc)',
          fontSize: 16,
          color: '#808080',
          marginBottom: 36,
        }}
      >
        Studio Doe 的深度整合智能平台
      </motion.p>

      {/* 3 feature cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, width: '100%' }}>
        {features.map(({ Icon, title, desc }, i) => (
          <motion.div
            key={title}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 + i * 0.08 }}
          >
            <Card style={{ height: '100%' }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  background: '#222',
                  border: '1px solid #333',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 16,
                }}
              >
                <Icon size={20} color="#C9A84C" />
              </div>
              <h3
                style={{
                  fontFamily: 'var(--font-outfit)',
                  fontSize: 17,
                  fontWeight: 600,
                  color: '#E0E0E0',
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  marginBottom: 8,
                }}
              >
                {title}
              </h3>
              <BodyText style={{ fontSize: 14 }}>{desc}</BodyText>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  </SlideContainer>
);
