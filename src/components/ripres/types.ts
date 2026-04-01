import React from 'react';

export type RipresSlide = {
  path: string;
  title: string;
  element: React.ReactElement;
  /**
   * Optional custom match path for routing (e.g. use one route to cover multiple paths like /anatomy/*).
   */
  matchPath?: string;
};

export type RipresPlayerProps = {
  slides: RipresSlide[];
  Wrapper?: React.ComponentType<{ children: React.ReactNode }>;
  routerType?: 'hash' | 'browser';
  transitionType?: 'default' | 'blink';
};
