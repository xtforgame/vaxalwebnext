'use client';

import type { CSSProperties, ReactNode } from 'react';
import './sci-fi.css';

export interface SciFiPanelProps {
  /** Show / hide the panel (drives glitch-enter animation) */
  active: boolean;
  /** Panel content */
  children: ReactNode;
  /** Accent border & bracket color (default: '#00ffff') */
  borderColor?: string;
  /** Glow shadow color (default: 'rgba(0,255,255,0.2)') */
  glowColor?: string;
  /** Extra class names on the outer wrapper */
  className?: string;
  /** Extra inline styles on the outer wrapper */
  style?: CSSProperties;
}

export default function SciFiPanel({
  active,
  children,
  borderColor = '#00ffff',
  glowColor = 'rgba(0,255,255,0.2)',
  className = '',
  style,
}: SciFiPanelProps) {
  const bracketStyle: CSSProperties = { borderColor };

  return (
    <div
      className={`
        relative transition-all duration-300 ease-out font-mono whitespace-nowrap
        ${active ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}
        ${active ? 'sf-panel-enter' : ''}
        ${className}
      `}
      style={style}
    >
      {/* Corner brackets */}
      <div
        className="sf-corner border-t-2 border-l-2 -top-2 -left-2"
        style={bracketStyle}
      />
      <div
        className="sf-corner border-t-2 border-r-2 -top-2 -right-2"
        style={bracketStyle}
      />
      <div
        className="sf-corner border-b-2 border-l-2 -bottom-2 -left-2"
        style={bracketStyle}
      />
      <div
        className="sf-corner border-b-2 border-r-2 -bottom-2 -right-2"
        style={bracketStyle}
      />

      {/* Content area */}
      <div
        className="bg-black/40 backdrop-blur-md p-4 border-l-4"
        style={{
          borderColor,
          boxShadow: `0 0 15px ${glowColor}`,
        }}
      >
        {children}
      </div>
    </div>
  );
}
