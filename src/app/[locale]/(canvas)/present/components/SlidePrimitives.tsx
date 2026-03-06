/** @jsxImportSource @emotion/react */
'use client';

import React from 'react';
import { css, keyframes } from '@emotion/react';
import styled from '@emotion/styled';
import { ScaleToWidthContainer } from '@/components/ripres/components/ResponsiveContainers';

export type HudPosition = 'tl' | 'tr' | 'bl' | 'br';
export type HudMap = Partial<Record<HudPosition, React.ReactNode>>;

const spin = keyframes`
  100% { transform: rotate(360deg); }
`;

const size = {
  width: 1280,
  height: 720,
};

export const Slide = styled.section`
  --bg-color: #ffffff;
  --line-color: #1f2937;
  --accent-color: #000000;
  --sub-color: #6b7280;
  --grid-color: #e5e7eb;
  --font-main: 'Noto Sans TC', sans-serif;
  --font-mono: 'Noto Sans TC', sans-serif;

  width: ${size.width}px;
  height: ${size.height}px;
  background-color: var(--bg-color);
  position: relative;
  overflow: hidden;
  border: 1px solid var(--line-color);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  padding: 60px;
  background-image:
    linear-gradient(var(--grid-color) 1px, transparent 1px),
    linear-gradient(90deg, var(--grid-color) 1px, transparent 1px);
  background-size: 50px 50px;

  * {
    box-sizing: border-box;
  }

  h1, h2, h3, h4 {
    margin: 0;
    font-weight: 700;
    text-transform: uppercase;
    line-height: 1.1;
  }

  p, li {
    font-family: var(--font-main);
  }
`;

export const hudPositionStyles: Record<HudPosition, ReturnType<typeof css>> = {
  tl: css`top: 20px; left: 20px;`,
  tr: css`top: 20px; right: 20px; text-align: right;`,
  bl: css`bottom: 20px; left: 20px;`,
  br: css`bottom: 20px; right: 20px; text-align: right;`
};

export const HudMarker = styled.div`
  position: absolute;
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--sub-color);
  letter-spacing: 1px;
`;

export const HudCrosshair = styled.div<{ dashed?: boolean }>`
  position: absolute;
  width: 30px;
  height: 30px;
  border: 1px ${props => (props.dashed ? 'dashed #ccc' : `solid ${'var(--line-color)'}`)};
  border-radius: 50%;
  display: grid;
  place-items: center;

  &::after {
    content: '';
    width: 4px;
    height: 4px;
    background: var(--line-color);
    border-radius: 50%;
  }
`;

export const SlideTitle = styled.h2`
  margin: 0;
  font-weight: 700;
  text-transform: uppercase;
  line-height: 1.1;
  font-size: 36px;
  font-family: var(--font-mono);
  letter-spacing: -1px;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 15px;

  &::before {
    content: '';
    display: block;
    width: 10px;
    height: 36px;
    background-color: var(--line-color);
  }
`;

export const SlideSubtitle = styled.p`
  margin: 0 0 40px 25px;
  font-size: 16px;
  color: var(--sub-color);
  font-family: var(--font-mono);
`;

export const LayoutCenter = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  height: 100%;
`;

export const LayoutSplit = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 60px;
  height: 100%;
  align-items: center;
`;

export const LayoutGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 30px;
  height: 100%;
  align-content: center;
`;

export const Card = styled.div`
  border: 1px solid var(--grid-color);
  background: rgba(255, 255, 255, 0.9);
  padding: 25px;
  position: relative;
  transition: transform 0.2s, border-color 0.2s;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 2px;
    background: var(--line-color);
    transform: scaleX(0);
    transform-origin: left;
    transition: transform 0.3s;
  }

  &:hover {
    border-color: var(--line-color);
    transform: translateY(-2px);
  }

  &:hover::before {
    transform: scaleX(1);
  }
`;

export const Paragraph = styled.p`
  font-size: 16px;
  line-height: 1.6;
  color: #374151;
  margin: 0;
`;

export const MonoText = styled.p`
  font-family: var(--font-mono);
  font-size: 14px;
  color: var(--sub-color);
  margin: 0;
`;

export const CircleDiagram = styled.div`
  width: 300px;
  height: 300px;
  border: 1px solid var(--line-color);
  border-radius: 50%;
  position: relative;
  display: grid;
  place-items: center;
`;

export const CircleOrbit = styled.div`
  position: absolute;
  border: 1px dashed var(--sub-color);
  border-radius: 50%;
  width: 140%;
  height: 140%;
  animation: ${spin} 20s linear infinite;
`;

export const IconBox = styled.div`
  width: 60px;
  height: 60px;
  border: 1px solid var(--line-color);
  display: grid;
  place-items: center;
  font-size: 24px;
  margin-bottom: 20px;
`;

export const TechSpecs = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  font-family: var(--font-mono);
  font-size: 14px;

  li {
    display: flex;
    justify-content: space-between;
    border-bottom: 1px dashed var(--grid-color);
    padding: 10px 0;
    color: #374151;
  }

  strong {
    color: var(--line-color);
  }
`;

export const AnatomyGraphic = styled.div`
  position: relative;
  width: 100%;
  height: 400px;
  border: 1px solid var(--grid-color);
  background: #fff;
  display: flex;
  justify-content: center;
  align-items: center;
`;

export const OverlayTag = styled.div`
  position: absolute;
  bottom: 20px;
  right: 20px;
  border: 1px solid #000;
  padding: 5px 10px;
  font-family: monospace;
  background: #fff;
  font-size: 12px;
`;

export const HeroTitle = styled.h1`
  margin: 0;
  font-size: 80px;
  letter-spacing: 10px;
  font-weight: 700;
`;

export const SoftNote = styled.p`
  color: var(--sub-color);
  margin: 10px 0 0;
`;

export const Emphasis = styled.p`
  font-size: 20px;
  font-weight: 700;
  margin: 0 0 20px 0;
`;

export const SectionHeading = styled.h3`
  margin: 0 0 20px 0;
  font-weight: 700;
`;

export const BulletList = styled.ul`
  margin: 0 0 20px 20px;
  padding: 0;
  color: #374151;

  li {
    margin-bottom: 8px;
    line-height: 1.6;
  }
`;

export const InlineCode = styled.span`
  background: #eee;
  padding: 2px 4px;
  font-family: var(--font-mono);
`;

export const ComparisonCard = styled(Card)`
  background: #f9fafb;
  border: 1px dashed #ccc;
`;

export const RosieCard = styled(Card)`
  border: 2px solid #000;
`;

export const SlideFrame: React.FC<{ hud?: HudMap; children: React.ReactNode }> = ({ hud = {}, children }) => (
  <ScaleToWidthContainer
    designWidth={size.width}
    designHeight={size.height}
    useMinHeight={true}
    useMaxHeight={true}
    useHeightContain={true}
    css={css`
      overflow: hidden;
    `}
  >
    <Slide>
      {hud.tl && <HudMarker css={hudPositionStyles.tl}>{hud.tl}</HudMarker>}
      {hud.tr && <HudMarker css={hudPositionStyles.tr}>{hud.tr}</HudMarker>}
      {hud.bl && <HudMarker css={hudPositionStyles.bl}>{hud.bl}</HudMarker>}
      {hud.br && <HudMarker css={hudPositionStyles.br}>{hud.br}</HudMarker>}
      {children}
    </Slide>
  </ScaleToWidthContainer>
);
