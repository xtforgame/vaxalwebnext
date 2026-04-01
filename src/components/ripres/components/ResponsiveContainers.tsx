import React, { useRef, useState, useLayoutEffect, ReactNode } from 'react';
import styled from '@emotion/styled';

// ==========================================
// 1. ScaleToFitContainer (固定舞台 / 黑邊模式)
// ==========================================

interface ScaleToFitProps {
  children: ReactNode;
  /** 設計稿寬度 (Default: 1920) */
  designWidth?: number;
  /** 設計稿高度 (Default: 1080) */
  designHeight?: number;
  /** 背景色 (Default: #000) */
  backgroundColor?: string;
  className?: string;
}

const FitWrapper = styled.div<{ bg: string }>`
  width: 100%;
  height: 100%;
  background-color: ${(props) => props.bg};
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
`;

const FitStage = styled.div<{ 
  w: number; 
  h: number; 
  scale: number;
}>`
  width: ${(props) => props.w}px;
  height: ${(props) => props.h}px;
  /* 關鍵：使用 center 對齊，配合 Flexbox 達成完美置中 */
  transform-origin: center center;
  transform: scale(${(props) => props.scale});
  flex-shrink: 0;
  will-change: transform;
  
  /* 針對文字渲染的優化 */
  backface-visibility: hidden;
  -webkit-font-smoothing: antialiased;
`;

export const ScaleToFitContainer: React.FC<ScaleToFitProps> = ({
  children,
  designWidth = 1920,
  designHeight = 1080,
  backgroundColor = '#000',
  className,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateScale = () => {
      const parentW = container.clientWidth;
      const parentH = container.clientHeight;
      
      const scaleX = parentW / designWidth;
      const scaleY = parentH / designHeight;
      
      // 取最小值 (Contain Mode)，確保內容全部可見
      setScale(Math.min(scaleX, scaleY));
    };

    const observer = new ResizeObserver(updateScale);
    observer.observe(container);
    updateScale();

    return () => observer.disconnect();
  }, [designWidth, designHeight]);

  return (
    <FitWrapper ref={containerRef} bg={backgroundColor} className={className}>
      <FitStage w={designWidth} h={designHeight} scale={scale}>
        {children}
      </FitStage>
    </FitWrapper>
  );
};

// ==========================================
// 2. ScaleToWidthContainer (寬度優先 / 長頁面模式)
// ==========================================

interface ScaleToWidthProps {
  children: ReactNode;
  /** * 設計基準寬度 (Default: 1920)。
   * 當容器 > 此寬度 -> 鎖定 1920 並放大。
   * 當容器 <= 此寬度 -> 100% RWD。
   */
  designWidth?: number;
  /** * 設計基準高度 (Optional)。
   * 當提供此值時：
   * - 容器 <= designWidth：維持此高度
   * - 容器 > designWidth：與寬度等比縮放
   */
  designHeight?: number;
  /** * 是否啟用高度 contain 模式 (Default: false)。
   * 啟用時：在 scale 模式下會同時考慮寬高比例，取較小值確保內容完整顯示
   * 關閉時：scale 模式只由寬度決定縮放比例
   */
  useHeightContain?: boolean;
  /** * 是否將 designHeight 同時套用為 min-height (Default: false) */
  useMinHeight?: boolean;
  /** * 是否將 designHeight 同時套用為 max-height (Default: false) */
  useMaxHeight?: boolean;
  className?: string;
}

const WidthWrapper = styled.div<{ height: number | 'auto' }>`
  width: 100%;
  /* 高度由 JS 動態計算，以容納放大後的內容 */
  height: ${(props) => (props.height === 'auto' ? 'auto' : `${props.height}px`)};
  position: relative;
  overflow: hidden; /* 避免放大時內容溢出邊界 */
`;

const WidthContent = styled.div<{ 
  designWidth: number; 
  designHeight: number | undefined;
  scale: number; 
  isScaling: boolean; 
  hasDesignHeight: boolean;
  useMinHeight: boolean;
  useMaxHeight: boolean;
}>`
  /* 判斷：放大模式鎖定寬度，否則走 RWD (100%) */
  width: ${(props) => (props.isScaling ? `${props.designWidth}px` : '100%')};
  
  /* 當有 designHeight 時處理高度 */
  height: ${(props) => {
    if (props.hasDesignHeight && props.designHeight) {
      return props.isScaling ? 'auto' : `${props.designHeight}px`;
    }
    return 'auto';
  }};
  
  /* 根據 flags 設定 min-height */
  min-height: ${(props) => {
    if (props.hasDesignHeight && props.useMinHeight && props.designHeight && !props.isScaling) {
      return `${props.designHeight}px`;
    }
    return 'auto';
  }};
  
  /* 根據 flags 設定 max-height */
  max-height: ${(props) => {
    if (props.hasDesignHeight && props.useMaxHeight && props.designHeight && !props.isScaling) {
      return `${props.designHeight}px`;
    }
    return 'none';
  }};
  
  /* 關鍵：從左上角開始放大 */
  transform-origin: top left;
  transform: ${(props) => (props.isScaling ? `scale(${props.scale})` : 'none')};
  
  will-change: transform;

  /* 文字優化 */
  backface-visibility: hidden;
  -webkit-font-smoothing: antialiased;
`;

export const ScaleToWidthContainer: React.FC<ScaleToWidthProps> = ({
  children,
  designWidth = 1920,
  designHeight,
  useHeightContain = false,
  useMinHeight = false,
  useMaxHeight = false,
  className,
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  
  const [state, setState] = useState({
    scale: 1,
    isScaling: false,
    wrapperHeight: 'auto' as number | 'auto',
  });

  useLayoutEffect(() => {
    const wrapper = wrapperRef.current;
    const content = contentRef.current;
    if (!wrapper || !content) return;

    const calculate = () => {
      const currentWidth = wrapper.clientWidth;
      const currentHeight = wrapper.parentElement?.clientHeight || wrapper.clientHeight;
      
      if (designHeight) {
        // 有 designHeight 的模式
        if (currentWidth > designWidth) {
          // 大於設計寬度：根據 useHeightContain 決定縮放模式
          const scaleX = currentWidth / designWidth;
          let newScale;
          
          if (useHeightContain) {
            // 啟用 contain 模式：同時考慮寬高比例，取較小值
            const scaleY = currentHeight / designHeight;
            newScale = Math.min(scaleX, scaleY);
          } else {
            // 關閉 contain 模式：只由寬度決定縮放
            newScale = scaleX;
          }
          
          const scaledHeight = designHeight * newScale;
          
          setState({
            scale: newScale,
            isScaling: true,
            wrapperHeight: scaledHeight,
          });
        } else {
          // 小於等於設計寬度：維持設計高度
          setState({
            scale: 1,
            isScaling: false,
            wrapperHeight: designHeight,
          });
        }
      } else {
        // 原本邏輯：只有當容器寬度大於設計稿時才介入
        if (currentWidth > designWidth) {
          const newScale = currentWidth / designWidth;
          // 計算放大後的視覺高度，用來撐開外層 Wrapper
          const scaledHeight = content.scrollHeight * newScale;
          
          setState({
            scale: newScale,
            isScaling: true,
            wrapperHeight: scaledHeight,
          });
        } else {
          // 小於設計稿，回歸原始 RWD
          setState({
            scale: 1,
            isScaling: false,
            wrapperHeight: 'auto',
          });
        }
      }
    };

    // 同時監聽容器寬度變化 & 內部內容高度變化
    const resizeObserver = new ResizeObserver(calculate);
    resizeObserver.observe(wrapper);
    resizeObserver.observe(content);
    
    calculate();

    return () => resizeObserver.disconnect();
  }, [designWidth, designHeight]);

  return (
    <WidthWrapper ref={wrapperRef} height={state.wrapperHeight} className={className}>
      <WidthContent 
        ref={contentRef}
        designWidth={designWidth}
        designHeight={designHeight}
        scale={state.scale} 
        isScaling={state.isScaling}
        hasDesignHeight={!!designHeight}
        useMinHeight={useMinHeight}
        useMaxHeight={useMaxHeight}
      >
        {children}
      </WidthContent>
    </WidthWrapper>
  );
};
