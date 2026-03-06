'use client';

import React from 'react';
import styled from '@emotion/styled';
import { motion } from 'motion/react';

export type Direction = 'horizontal' | 'vertical';

export interface LogoCarouselProps {
  items?: React.ReactNode[];
  direction?: Direction;
  speed?: number;
  width?: string | number;
  height?: string | number;
  itemSize?: number;
  gap?: number;
  blurWidth?: number;
  blurStrength?: number;
  backgroundColor?: string;
}

const getContentMask = (direction: Direction, blurWidth: number) => {
  const fadeStart = Math.max(5, blurWidth * 0.1);
  const fadeEnd = Math.max(20, blurWidth * 0.4);
  const gradientDirection = direction === 'horizontal' ? '90deg' : '180deg';
  return `linear-gradient(${gradientDirection},
    transparent 0px, transparent ${fadeStart}px,
    black ${fadeEnd}px, black calc(100% - ${fadeEnd}px),
    transparent calc(100% - ${fadeStart}px), transparent 100%)`;
};

const getBlurMask = (direction: Direction, blurWidth: number) => {
  const edgeSolid = Math.max(20, blurWidth * 0.3);
  const edgeClear = blurWidth;
  const gradientDirection = direction === 'horizontal' ? '90deg' : '180deg';
  return `linear-gradient(${gradientDirection},
    black 0px, black ${edgeSolid}px,
    transparent ${edgeClear}px, transparent calc(100% - ${edgeClear}px),
    black calc(100% - ${edgeSolid}px), black 100%)`;
};

const Container = styled.div<{ w: string | number; h: string | number; bg?: string }>`
  position: relative;
  width: ${({ w }) => (typeof w === 'number' ? `${w}px` : w)};
  height: ${({ h }) => (typeof h === 'number' ? `${h}px` : h)};
  background: ${({ bg }) => bg || 'transparent'};
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const ContentWrapper = styled.div<{ direction: Direction; blurWidth: number }>`
  position: absolute;
  inset: 0;
  mask-image: ${({ direction, blurWidth }) => getContentMask(direction, blurWidth)};
  -webkit-mask-image: ${({ direction, blurWidth }) => getContentMask(direction, blurWidth)};
  display: flex;
  align-items: center;
  justify-content: center;
`;

const MovingTrack = styled(motion.div)<{ direction: Direction; gap: number }>`
  display: flex;
  flex-direction: ${({ direction }) => (direction === 'horizontal' ? 'row' : 'column')};
  gap: ${({ gap }) => gap}px;
  width: ${({ direction }) => direction === 'horizontal' ? 'max-content' : '100%'};
  height: ${({ direction }) => direction === 'vertical' ? 'max-content' : '100%'};
`;

const ItemWrapper = styled.div<{ size: number }>`
  flex: 0 0 auto;
  width: ${({ size }) => size}px;
  height: ${({ size }) => size}px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const BlurOverlay = styled.div<{ direction: Direction; blurStrength: number; blurWidth: number }>`
  position: absolute;
  inset: 0;
  pointer-events: none;
  backdrop-filter: blur(${({ blurStrength }) => blurStrength}px);
  -webkit-backdrop-filter: blur(${({ blurStrength }) => blurStrength}px);
  mask-image: ${({ direction, blurWidth }) => getBlurMask(direction, blurWidth)};
  -webkit-mask-image: ${({ direction, blurWidth }) => getBlurMask(direction, blurWidth)};
  z-index: 10;
`;

export const LogoCarousel: React.FC<LogoCarouselProps> = ({
  items,
  direction = 'horizontal',
  speed = 20,
  width = '100%',
  height = '100%',
  itemSize = 100,
  gap = 24,
  blurWidth = 150,
  blurStrength = 6,
  backgroundColor = 'transparent',
}) => {
  const renderItems = items && items.length > 0 ? items : [];
  if (renderItems.length === 0) return null;

  const duplicatedItems = [...renderItems, ...renderItems, ...renderItems];
  const totalItems = renderItems.length;
  const loopDistance = totalItems * (itemSize + gap);

  return (
    <Container w={width} h={height} bg={backgroundColor}>
      <ContentWrapper direction={direction} blurWidth={blurWidth}>
        <MovingTrack
          direction={direction}
          gap={gap}
          initial={direction === 'horizontal' ? { x: 0 } : { y: 0 }}
          animate={direction === 'horizontal' ? { x: -loopDistance } : { y: -loopDistance }}
          transition={{ ease: 'linear', duration: speed, repeat: Infinity }}
        >
          {duplicatedItems.map((item, index) => (
            <ItemWrapper key={index} size={itemSize}>
              {item}
            </ItemWrapper>
          ))}
        </MovingTrack>
      </ContentWrapper>
      <BlurOverlay direction={direction} blurWidth={blurWidth} blurStrength={blurStrength} />
    </Container>
  );
};

export default LogoCarousel;
