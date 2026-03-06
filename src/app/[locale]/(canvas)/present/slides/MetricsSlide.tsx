'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import SlideContainer, { SlideTitle, Card, Mono, BodyText } from '../components/SlideContainer';

function useCountUp(target: number, duration = 1, delay = 0.3) {
  const [value, setValue] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const t0 = performance.now() + delay * 1000;
    const tick = (now: number) => {
      const elapsed = now - t0;
      if (elapsed < 0) { requestAnimationFrame(tick); return; }
      const p = Math.min(elapsed / (duration * 1000), 1);
      setValue(Math.round((1 - Math.pow(1 - p, 3)) * target));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration, delay]);

  return value;
}

export const MetricsSlide: React.FC = () => {
  const v70 = useCountUp(70, 1, 0.3);
  const v3 = useCountUp(3, 0.6, 0.5);

  return (
    <SlideContainer hud={{ tl: 'METRICS // ANALYSIS' }}>
      <SlideTitle sub="資訊部工作流現狀分析：不可逆的生產力革命">
        THE PARADIGM SHIFT
      </SlideTitle>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, flex: 1, alignItems: 'center' }}>
        {/* 70% */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 280 }}>
            <div style={{ fontFamily: 'var(--font-outfit)', fontSize: 100, fontWeight: 800, color: '#C9A84C', lineHeight: 1 }}>
              {v70}<span style={{ fontSize: 36 }}>%</span>
            </div>
            <Mono style={{ marginTop: 16 }}>CODEBASE GENERATED</Mono>
            <BodyText style={{ textAlign: 'center', marginTop: 12, maxWidth: 320 }}>
              現有的系統程式碼，超過七成由 AI 輔助或直接撰寫。
            </BodyText>
          </Card>
        </motion.div>

        {/* 3x */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <Card style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 280 }}>
            <div style={{ fontFamily: 'var(--font-outfit)', fontSize: 100, fontWeight: 800, color: '#C9A84C', lineHeight: 1 }}>
              {v3}<span style={{ fontSize: 36 }}>x</span>
            </div>
            <Mono style={{ marginTop: 16 }}>VELOCITY INCREASE</Mono>
            <BodyText style={{ textAlign: 'center', marginTop: 12, maxWidth: 320 }}>
              任務交付速度提升三倍。過往需耗時一週的功能，現於兩日內完成。
            </BodyText>
          </Card>
        </motion.div>
      </div>
    </SlideContainer>
  );
};
