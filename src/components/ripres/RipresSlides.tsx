import React from 'react';
import { css } from '@emotion/react';
import { AnimatePresence, motion } from 'motion/react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router';
import { RipresSlide } from './types';
import { RipresNavigator } from './RipresNavigator';

type RipresSlidesProps = {
  slides: RipresSlide[];
  Wrapper?: React.ComponentType<{ children: React.ReactNode }>;
  transitionType?: 'default' | 'blink';
};

export const RipresSlides: React.FC<RipresSlidesProps> = ({
  slides,
  Wrapper = React.Fragment,
  transitionType = 'default'
}) => {
  const location = useLocation();
  const navigate = useNavigate();

  if (!slides.length) {
    return null;
  }

  const slidePaths = slides.map(s => s.path);
  const currentPath = location.pathname;
  const index = slidePaths.indexOf(currentPath);
  const safeIndex = index >= 0 ? index : 0;
  const currentSlide = slides[safeIndex];

  // If slide has a matchPath (e.g. /anatomy/*), use it as a group key
  // to avoid re-mounting/outer-animating between sub-slides.
  // Otherwise use the specific path to ensure every page transitions.
  const topKey = currentSlide?.matchPath || currentSlide?.path || 'root';

  const goPrev = () => {
    if (safeIndex > 0) navigate(slidePaths[safeIndex - 1]);
  };

  const goNext = () => {
    if (safeIndex < slidePaths.length - 1) navigate(slidePaths[safeIndex + 1]);
  };

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowLeft':
        case 'ArrowUp':
        case 'PageUp':
          goPrev();
          break;
        case 'ArrowRight':
        case 'ArrowDown':
        case 'PageDown':
          goNext();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [safeIndex, slidePaths, navigate]);

  const routeMap = React.useMemo(() => {
    return slides.reduce<Record<string, React.ReactElement>>((acc, slide) => {
      const matchPath = slide.matchPath || slide.path;
      if (!acc[matchPath]) acc[matchPath] = slide.element;
      return acc;
    }, {});
  }, [slides]);

  const isBlink = transitionType === 'blink';

  const variants = isBlink ? {
    initial: { opacity: 0 },
    animate: {
      opacity: [1, 0, 1, 0, 1],
      transition: {
        duration: 0.15,
        times: [0.01, 0.3, 0.6, 0.8, 1],
        ease: 'linear',
        delay: 0.1
      }
    },
    exit: {
      opacity: [0, 1, 0, 1, 0],
      transition: {
        duration: 0.15,
        times: [0.01, 0.3, 0.6, 0.8, 1],
        ease: 'linear'
      }
    }
  } : {
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -30 },
    transition: { duration: 0.25 }
  };

  return (
    <Wrapper>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={topKey}
          {...variants}
          css={css`
            width: 96vw;
            max-width: 96vw;
            min-width: 96vw;
            height: 96vh;
            max-height: 96vh;
            min-height: 96vh;
            margin-top: 2vh;
            margin-bottom: 2vh;
            margin-left: 2vw;
            margin-right: 2vw;
            // height: 100%;
          `}
        >
          <Routes location={location}>
            <Route path="/" element={<Navigate to={slides[0].path} replace />} />
            {Object.entries(routeMap).map(([matchPath, element]) => (
              <Route key={matchPath} path={matchPath} element={element} />
            ))}
            <Route path="*" element={<Navigate to={slides[0].path} replace />} />
          </Routes>
        </motion.div>
      </AnimatePresence>

      <RipresNavigator
        currentIndex={safeIndex}
        total={slides.length}
        title={slides[safeIndex]?.title || slides[0].title}
        onPrev={goPrev}
        onNext={goNext}
        onJump={(idx) => navigate(slidePaths[idx])}
        hasPrev={safeIndex > 0}
        hasNext={safeIndex < slides.length - 1}
        slides={slides}
      />
    </Wrapper>
  );
};

export default RipresSlides;
