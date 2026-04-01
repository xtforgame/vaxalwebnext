'use client';

import React from 'react';
import { RipresPlayer, RipresSlide } from '@/components/ripres';
import { CoverSlide } from './slides/CoverSlide';
import { MetricsSlide } from './slides/MetricsSlide';
import { IndustrySlide } from './slides/IndustrySlide';
import { SunomataSlide } from './slides/SunomataSlide';
import { VisionSlide } from './slides/VisionSlide';
import { MaturitySlide } from './slides/MaturitySlide';
import { RosieSlide } from './slides/RosieSlide';
import { ComparisonSlide } from './slides/ComparisonSlide';
import { ConclusionSlide } from './slides/ConclusionSlide';

const slides: RipresSlide[] = [
  { path: '/cover', title: 'Cover', element: <CoverSlide /> },
  { path: '/metrics', title: 'Metrics', element: <MetricsSlide /> },
  { path: '/industry', title: 'Industry', element: <IndustrySlide /> },
  { path: '/sunomata', title: 'Sunomata', element: <SunomataSlide /> },
  { path: '/vision', title: 'Vision', element: <VisionSlide /> },
  { path: '/maturity', title: 'Maturity', element: <MaturitySlide /> },
  { path: '/rosie', title: 'Rosie', element: <RosieSlide /> },
  { path: '/comparison', title: 'Comparison', element: <ComparisonSlide /> },
  { path: '/conclusion', title: 'Conclusion', element: <ConclusionSlide /> },
];

const SlidesWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <main className="flex flex-col items-center p-0">
    {children}
  </main>
);

export default function PresentationClient() {
  return <RipresPlayer slides={slides} Wrapper={SlidesWrapper} />;
}
