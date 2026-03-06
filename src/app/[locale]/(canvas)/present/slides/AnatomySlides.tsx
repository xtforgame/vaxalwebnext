/** @jsxImportSource @emotion/react */
'use client';

import React, { useEffect, useMemo } from 'react';
import { css } from '@emotion/react';
import styled from '@emotion/styled';
import { motion, useMotionValue, useTransform, animate, AnimatePresence } from 'motion/react';
import { useLocation, Routes, Route } from 'react-router';
import {
  SlideFrame,
  SlideTitle,
  SlideSubtitle,
  Paragraph,
  MonoText,
  Card,
  TechSpecs,
  BulletList,
  HudMarker
} from '../components/SlidePrimitives';
import LogoCarousel from '../components/LogoCarousel';

type FocusKey = 'intro' | 'model' | 'interface' | 'memory' | 'mcp' | 'rag' | 'agent';

type FocusConfig = {
  key: FocusKey;
  path: string;
  hud: string;
  focus: { x: number; y: number; scale: number };
  renderCard: () => React.ReactNode;
};

const focusAreas: FocusConfig[] = [
  {
    key: 'intro',
    path: '/anatomy/intro',
    hud: 'MODULE: ANATOMY',
    focus: { x: -500, y: -120, scale: 0.7 },
    renderCard: () => <IntroCard />
  },
  {
    key: 'model',
    path: '/anatomy/model',
    hud: 'PART: 01 // BRAIN',
    focus: { x: -500, y: 400, scale: 2 },
    renderCard: () => <ModelCard />
  },
  {
    key: 'interface',
    path: '/anatomy/interface',
    hud: 'PART: 02 // SENSES',
    focus: { x: -450, y: 500, scale: 3 },
    renderCard: () => <InterfaceCard />
  },
  {
    key: 'memory',
    path: '/anatomy/memory',
    hud: 'PART: 03 // MEMORY',
    focus: { x: -500, y: 500, scale: 2 },
    renderCard: () => <MemoryCard />
  },
  {
    key: 'mcp',
    path: '/anatomy/mcp',
    hud: 'PART: 04 // LIMBS',
    focus: { x: 150, y: 300, scale: 1.8 },
    renderCard: () => <McpCard />
  },
  {
    key: 'rag',
    path: '/anatomy/rag',
    hud: 'PART: 05 // REFERENCE',
    focus: { x: -1050, y: 200, scale: 2 },
    renderCard: () => <RagCard />
  },
  {
    key: 'agent',
    path: '/anatomy/agent',
    hud: 'PART: 06 // HEART',
    focus: { x: -650, y: 400, scale: 4 },
    renderCard: () => <AgentCard />
  }
];

const focusMap = focusAreas.reduce<Record<FocusKey, FocusConfig>>((acc, item) => {
  acc[item.key] = item;
  return acc;
}, {} as Record<FocusKey, FocusConfig>);

const baseImage = '/rosie-presentation/Gemini_Generated_Image_imy43zimy43zimy4.png';

const FocusCardContainer = styled('div')`
  position: absolute;
  right: 32px;
  top: 32px;
  width: 450px;
  max-width: 90%;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid var(--grid-color);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.12);
  padding: 20px;
  backdrop-filter: blur(6px);
`;

const IntroCard: React.FC = () => (
  <FocusCardContainer>
    <SlideTitle css={css`font-size: 28px; margin-bottom: 6px;`}>DECONSTRUCTING INTELLIGENCE</SlideTitle>
    <SlideSubtitle css={css`margin: 0 0 12px 0; font-size: 14px;`}>全圖概覽：七個器官構成企業級 AI</SlideSubtitle>
    <Paragraph css={css`margin: 0 0 12px 0; font-size: 14px; line-height: 1.5;`}>
      我們以「生化人」拆解 LLM 生態系的七大關鍵組件，打造真正可落地的企業 AI。
    </Paragraph>
    <BulletList css={css`margin-bottom: 10px;`}>
      <li>模型、大腦只是起點；還需要記憶、感官、工具、外部知識庫與調度心臟。</li>
      <li>每個部位都可替換與升級，保持系統的模組化與彈性。</li>
    </BulletList>
  </FocusCardContainer>
);

const ModelCard: React.FC = () => {
  const xBase = 140;
  const yBase = 48;
  const revealTime = useMotionValue(0);
  const revealTime2 = useMotionValue(0);
  const opacity = useTransform(revealTime, [0, 100], [0, 1]);
  const opacity2 = useTransform(revealTime2, [0, 100], [0, 1]);
  const y = useTransform(revealTime, [0, 100], [yBase, yBase - 24]);

  useEffect(() => {
    const controls = animate(revealTime, 100, { delay: 0.2, duration: 0.25, ease: 'easeInOut' });
    const controls2 = animate(revealTime2, 100, { delay: 0.5, duration: 0.5, ease: 'easeInOut' });
    return () => { controls.stop(); controls2.stop(); };
  }, []);

  const logos = [
    '/mail-assets/claudeai.png',
    '/mail-assets/ChatGPT-Logo.svg.png',
    '/mail-assets/gemini-color.png',
  ];

  const getLogoItems = () => logos.map((src, index) => (
    <img key={index} src={src} alt={`Brand ${index}`} style={{ width: '75%', height: '75%', objectFit: 'contain' }} />
  ));

  return (
    <div>
      <motion.div
        style={{
          position: 'absolute',
          display: 'flex',
          alignItems: 'center',
          fontFamily: 'var(--font-mono)',
          fontSize: '22px',
          fontWeight: 'bold',
          opacity,
          top: 0,
          left: 0,
          y,
          x: xBase + 24,
        }}
      >
        Rosie Uses
        <motion.div style={{ opacity: opacity2 }}>
          <LogoCarousel
            items={getLogoItems()}
            direction="vertical"
            width={75}
            height={200}
            itemSize={75}
            gap={4}
            speed={8}
            blurWidth={50}
            blurStrength={5}
          />
        </motion.div>
        As Her Brain
      </motion.div>
      <FocusCardContainer>
        <SlideTitle css={css`font-size: 28px; margin-bottom: 6px;`}>MODEL (大腦)</SlideTitle>
        <SlideSubtitle css={css`margin: 0 0 12px 0; font-size: 14px;`}>Claude 3.7 Sonnet / GPT-5 Mini / Gemini 3 Pro</SlideSubtitle>
        <Paragraph css={css`margin: 0 0 12px 0; font-size: 14px; line-height: 1.5;`}>
          邏輯推理、語言生成、程式撰寫的核心運算單元。大腦可隨任務替換，保持成本與效能平衡。
        </Paragraph>
        <Card css={css`margin-top: 8px;`}>
          <MonoText>KEY MODELS</MonoText>
          <TechSpecs css={css`margin-top: 8px;`}>
            <li><strong>Claude-3-7-sonnet:</strong><span>Coding / Complex Logic</span></li>
            <li><strong>GPT-5-mini:</strong><span>Creative &amp; General</span></li>
            <li><strong>Gemini-3-pro-preview:</strong><span>Long Context</span></li>
          </TechSpecs>
        </Card>
      </FocusCardContainer>
    </div>
  );
};

const InterfaceCard: React.FC = () => {
  const revealTime = useMotionValue(0);
  const text1StartTime = 0;
  const text2StartTime = 900;
  const text3StartTime = 1800;
  const text4StartTime = 2700;
  const opacity01 = useTransform(revealTime, [0, text1StartTime, text1StartTime + 100, text1StartTime + 500, text1StartTime + 600, 4000], [0, 0, 1, 1, 0, 0]);
  const opacity02 = useTransform(revealTime, [0, text2StartTime, text2StartTime + 100, text2StartTime + 400, text2StartTime + 500, 4000], [0, 0, 1, 1, 0, 0]);
  const opacity03 = useTransform(revealTime, [0, text3StartTime, text3StartTime + 100, text3StartTime + 400, text3StartTime + 500, 4000], [0, 0, 1, 1, 0, 0]);
  const opacity04 = useTransform(revealTime, [0, text4StartTime, text4StartTime + 100, text4StartTime + 400, text4StartTime + 500, 4000], [0, 0, 1, 1, 0, 0]);

  useEffect(() => {
    const controls = animate(revealTime, 4000, {
      delay: 0.2, duration: 8, ease: 'linear', repeat: Infinity, repeatType: 'loop',
    });
    return () => { controls.stop(); };
  }, []);

  const sharedStyle: React.CSSProperties = useMemo(() => ({
    fontFamily: 'var(--font-mono)',
    fontSize: '20px',
    fontWeight: 'bold',
  }), []);

  return (
    <div>
      <motion.div initial={{ opacity: 0 }} style={{ opacity: opacity01, position: 'absolute', ...sharedStyle, top: 70, left: 60 }}>
        「你好」
      </motion.div>
      <motion.div initial={{ opacity: 0 }} style={{ opacity: opacity02, position: 'absolute', ...sharedStyle, top: 120, left: 10 }}>
        「需要把這份資料<br />寄給 <span style={{ color: '#009CD4' }}>@Rick</span> 嗎？」
      </motion.div>
      <motion.div initial={{ opacity: 0 }} style={{ opacity: opacity03, position: 'absolute', ...sharedStyle, top: 70, left: 520 }}>
        「沒問題」
      </motion.div>
      <motion.div initial={{ opacity: 0 }} style={{ opacity: opacity04, position: 'absolute', ...sharedStyle, top: 190, left: 25 }}>
        「<span style={{ color: '#E91E63' }}>@窄口西褲</span>
        <br />的銷量如下：
        <br />...」
      </motion.div>
      <FocusCardContainer>
        <SlideTitle css={css`font-size: 28px; margin-bottom: 6px;`}>CHAT UI (感官與表達)</SlideTitle>
        <SlideSubtitle css={css`margin: 0 0 12px 0; font-size: 14px;`}>Markdown UI / Mention System</SlideSubtitle>
        <Paragraph css={css`margin: 0 0 12px 0; font-size: 14px; line-height: 1.5;`}>
          輸入輸出的介面是 AI 的眼耳口鼻。結構化 Markdown + @Mention 讓指令短但背景完整。
        </Paragraph>
        <BulletList css={css`margin-bottom: 10px;`}>
          <li>指令攜帶上下文（人、文件、任務）而非單純文字。</li>
          <li>與 Slack/Notion 類似的 Mention 流程，降低溝通成本。</li>
        </BulletList>
      </FocusCardContainer>
    </div>
  );
};

const MemoryCard: React.FC = () => {
  const revealTime = useMotionValue(0);
  const opacity = useTransform(revealTime, [0, 100], [0, 1]);

  useEffect(() => {
    const controls = animate(revealTime, 100, { delay: 0.2, duration: 0.25, ease: 'easeInOut' });
    return () => { controls.stop(); };
  }, []);

  return (
    <div>
      <motion.div style={{ opacity, position: 'absolute', top: -70, left: 60 }}>
        <img src="/mail-assets/Gemini_Generated_Image_3x6m803x6m803x6m.png" style={{ width: 500, height: 500, objectFit: 'contain' }} />
      </motion.div>
      <FocusCardContainer>
        <SlideTitle css={css`font-size: 28px; margin-bottom: 6px;`}>CONTEXT / MEMORY (記憶)</SlideTitle>
        <SlideSubtitle css={css`margin: 0 0 12px 0; font-size: 14px;`}>Context Engineering / Memory Management</SlideSubtitle>
        <Paragraph css={css`margin: 0 0 12px 0; font-size: 14px; line-height: 1.5;`}>
          短期記憶銜接對話脈絡，長期記憶保存企業知識、角色偏好與操作軌跡，避免一問一答的失憶問題。
        </Paragraph>
        <BulletList css={css`margin-bottom: 10px;`}>
          <li>遺忘：正確地忘記不重要的資訊。</li>
          <li>壓縮：壓縮過往的對話記錄，context過大。</li>
          <li>查詢：可查詢遺忘和壓縮過的資訊。</li>
        </BulletList>
      </FocusCardContainer>
    </div>
  );
};

const McpCard: React.FC = () => {
  const revealTime = useMotionValue(0);
  const revealTime2 = useMotionValue(0);
  const revealTime3 = useMotionValue(0);
  const opacity = useTransform(revealTime, [0, 100], [0, 1]);
  const opacity2 = useTransform(revealTime2, [0, 100], [0, 1]);
  const opacity3 = useTransform(revealTime3, [0, 100], [0, 1]);

  useEffect(() => {
    const c1 = animate(revealTime, 100, { delay: 0.2, duration: 0.25, ease: 'easeInOut' });
    const c2 = animate(revealTime2, 100, { delay: 0.3, duration: 0.25, ease: 'easeInOut' });
    const c3 = animate(revealTime3, 100, { delay: 0.4, duration: 0.25, ease: 'easeInOut' });
    return () => { c1.stop(); c2.stop(); c3.stop(); };
  }, []);

  return (
    <div>
      <motion.div style={{ opacity, position: 'absolute', top: 120, left: 270 }}>
        <img src="/mail-assets/Instagram_icon.png.webp" style={{ width: 100, height: 100, objectFit: 'contain' }} />
      </motion.div>
      <motion.div style={{ opacity: opacity2, position: 'absolute', top: 240, left: 240 }}>
        <img src="/mail-assets/Gmail_icon_(2020).svg.png" style={{ width: 100, height: 100, objectFit: 'contain' }} />
      </motion.div>
      <motion.div style={{ opacity: opacity3, position: 'absolute', top: 360, left: 220 }}>
        <img src="/mail-assets/Google_Calendar_icon_(2020).svg.png" style={{ width: 100, height: 100, objectFit: 'contain' }} />
      </motion.div>
      <FocusCardContainer>
        <SlideTitle css={css`font-size: 28px; margin-bottom: 6px;`}>MCP / TOOLS (手腳)</SlideTitle>
        <SlideSubtitle css={css`margin: 0 0 12px 0; font-size: 14px;`}>Model Context Protocol / Function Calling</SlideSubtitle>
        <Paragraph css={css`margin: 0 0 12px 0; font-size: 14px; line-height: 1.5;`}>
          透過 MCP，AI 從「缸中之腦」長出手腳：寄信、查日曆、搜尋Instagram貼文。
        </Paragraph>
        <BulletList css={css`margin-bottom: 10px;`}>
          <li>透過MCP標準連接，其他AI工具亦可即插即用。</li>
          <li>降低耦合，未來可替換模型仍保留工具能力。</li>
        </BulletList>
      </FocusCardContainer>
    </div>
  );
};

const RagCard: React.FC = () => {
  const revealTime = useMotionValue(0);
  const revealTime2 = useMotionValue(0);
  const revealTime3 = useMotionValue(0);
  const opacity = useTransform(revealTime, [0, 100], [0, 1]);
  const opacity2 = useTransform(revealTime2, [0, 100], [0, 1]);
  const opacity3 = useTransform(revealTime3, [0, 100], [0, 1]);

  useEffect(() => {
    const c1 = animate(revealTime, 100, { delay: 0.2, duration: 0.25, ease: 'easeInOut' });
    const c2 = animate(revealTime2, 100, { delay: 0.3, duration: 0.25, ease: 'easeInOut' });
    const c3 = animate(revealTime3, 100, { delay: 0.4, duration: 0.25, ease: 'easeInOut' });
    return () => { c1.stop(); c2.stop(); c3.stop(); };
  }, []);

  return (
    <div>
      <motion.div style={{ opacity, position: 'absolute', top: 10, left: 410 }}>
        <img src="/mail-assets/pptx_icon_(2019).svg.png" style={{ width: 100, height: 100, objectFit: 'contain' }} />
      </motion.div>
      <motion.div style={{ opacity: opacity2, position: 'absolute', top: 120, left: 435 }}>
        <img src="/mail-assets/PDF_file_icon.svg.png" style={{ width: 100, height: 100, objectFit: 'contain' }} />
      </motion.div>
      <motion.div style={{ opacity: opacity3, position: 'absolute', top: 240, left: 460 }}>
        <img src="/mail-assets/9850812.png" style={{ width: 100, height: 100, objectFit: 'contain' }} />
      </motion.div>
      <FocusCardContainer>
        <SlideTitle css={css`font-size: 28px; margin-bottom: 6px;`}>RAG / DB Connector <br />(外部知識庫)</SlideTitle>
        <SlideSubtitle css={css`margin: 0 0 12px 0; font-size: 14px;`}>Retrieval-Augmented Generation and Database Connector</SlideSubtitle>
        <Paragraph css={css`margin: 0 0 12px 0; font-size: 14px; line-height: 1.5;`}>
          確保每一個回答，都能提供可靠的資料來源。
        </Paragraph>
        <BulletList css={css`margin-bottom: 10px;`}>
          <li>Document Reader：讀取 Wiki / 簡報 / 會議記錄。</li>
          <li>Database Connector：讀取內部資料庫。</li>
          <li>RAG / Vector DB：向量化內部資料。</li>
          <li>Anti-Hallucination：不知道就去查，而不是編造。</li>
        </BulletList>
      </FocusCardContainer>
    </div>
  );
};

const AgentCard: React.FC = () => {
  const revealTime = useMotionValue(0);
  const opacity = useTransform(revealTime, [0, 100], [0, 1]);

  useEffect(() => {
    const controls = animate(revealTime, 100, { delay: 0.2, duration: 0.25, ease: 'easeInOut' });
    return () => { controls.stop(); };
  }, []);

  return (
    <div>
      <motion.div style={{ opacity, position: 'absolute', top: 120, left: 60, backgroundColor: 'rgba(255, 128, 0, 0.32)', borderRadius: '50%' }}>
        <img src="/mail-assets/Gemini_Generated_Image_vxwjo6vxwjo6vxwj-removebg-preview.png" style={{ width: 300, height: 300, objectFit: 'contain' }} />
      </motion.div>
      <FocusCardContainer>
        <SlideTitle css={css`font-size: 28px; margin-bottom: 6px;`}>AGENT (內心/人格)</SlideTitle>
        <SlideSubtitle css={css`margin: 0 0 12px 0; font-size: 14px;`}>LangGraph / Decision Loops</SlideSubtitle>
        <Paragraph css={css`margin: 0 0 12px 0; font-size: 14px; line-height: 1.5;`}>
          人格與執行官，決定AI具備哪些權限、以怎樣的流程、該完成哪些任務。
        </Paragraph>
        <Card css={css`margin-top: 8px;`}>
          <MonoText>AGENT TYPES</MonoText>
          <TechSpecs css={css`margin-top: 8px;`}>
            <li><strong>Reactive Agent:</strong><span>等待指令，專注於快速回答。</span></li>
            <li><strong>Reasoning Agent:</strong><span>等待指令，專注於思考和規劃。</span></li>
            <li><strong>Proactive Agent:</strong><span>主動發起工作指令的Agent。</span></li>
          </TechSpecs>
        </Card>
      </FocusCardContainer>
    </div>
  );
};

const AnatomyFocusSlide: React.FC<{ focusKey: FocusKey }> = ({ focusKey }) => {
  const location = useLocation();
  const focus = focusMap[focusKey];
  const prevKeyRef = React.useRef<FocusKey>(focusKey);
  const routeProgress = useMotionValue(1);
  const [from, setFrom] = React.useState(focus.focus);
  const [to, setTo] = React.useState(focus.focus);

  React.useEffect(() => {
    const prevFocus = focusMap[prevKeyRef.current]?.focus || focusMap.intro.focus;
    const nextFocus = focusMap[focusKey]?.focus || focusMap.intro.focus;
    setFrom(prevFocus);
    setTo(nextFocus);
    routeProgress.set(0);
    const controls = animate(routeProgress, 1, { duration: 0.45, ease: 'easeInOut' });
    prevKeyRef.current = focusKey;
    return () => controls.stop();
  }, [focusKey, routeProgress]);

  const scale = useTransform(routeProgress, [0, 1], [from.scale, to.scale]);
  const translateX = useTransform(routeProgress, [0, 1], [from.x, to.x]);
  const translateY = useTransform(routeProgress, [0, 1], [from.y, to.y]);

  return (
    <SlideFrame hud={{ tl: focus.hud, br: 'ROSIE ANATOMY' }}>
      <div
        css={css`
          position: relative;
          width: 100%;
          height: 100%;
          overflow: hidden;
          border: 1px solid var(--grid-color);
          background: #f8fafc;
        `}
      >
        <motion.img
          src={baseImage}
          alt="Rosie Anatomy"
          style={{
            position: 'absolute',
            inset: 0,
            width: '140%',
            height: '140%',
            objectFit: 'cover',
            translateX,
            translateY,
            scale,
            transformOrigin: 'center center',
            filter: 'grayscale(0.1)',
          }}
        />

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={focus.key}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
          >
            <Routes location={location}>
              <Route path="intro" element={<div>{focusAreas.find(a => a.key === 'intro')?.renderCard()}</div>} />
              <Route path="model" element={<div>{focusAreas.find(a => a.key === 'model')?.renderCard()}</div>} />
              <Route path="interface" element={<div>{focusAreas.find(a => a.key === 'interface')?.renderCard()}</div>} />
              <Route path="memory" element={<div>{focusAreas.find(a => a.key === 'memory')?.renderCard()}</div>} />
              <Route path="mcp" element={<div>{focusAreas.find(a => a.key === 'mcp')?.renderCard()}</div>} />
              <Route path="rag" element={<div>{focusAreas.find(a => a.key === 'rag')?.renderCard()}</div>} />
              <Route path="agent" element={<div>{focusAreas.find(a => a.key === 'agent')?.renderCard()}</div>} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </div>
    </SlideFrame>
  );
};

export const AnatomyIntroSlide: React.FC = () => <AnatomyFocusSlide focusKey="intro" />;
export const AnatomyFocusScene: React.FC = () => {
  const location = useLocation();
  const path = location.pathname;
  const focusKey =
    (focusAreas.find(area => path.startsWith(area.path))?.key as FocusKey) || 'intro';
  return <AnatomyFocusSlide focusKey={focusKey} />;
};
