import React from 'react';
import { BrowserRouter, HashRouter, MemoryRouter } from 'react-router';
import { RipresPlayerProps } from './types';
import { RipresSlides } from './RipresSlides';

export const RipresPlayer: React.FC<RipresPlayerProps> = ({
  slides,
  Wrapper,
  routerType = 'hash',
  transitionType = 'default'
}) => {
  const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';
  const Router = (() => {
    if (isBrowser) {
      return routerType === 'browser' ? BrowserRouter : HashRouter;
    }
    // SSR: avoid touching window/document by falling back to MemoryRouter
    return MemoryRouter as typeof HashRouter;
  })();

  return (
    <Router>
      <RipresSlides slides={slides} Wrapper={Wrapper} transitionType={transitionType} />
    </Router>
  );
};

export default RipresPlayer;
