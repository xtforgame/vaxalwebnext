'use client';

import { useState, useCallback, useEffect } from 'react';
import type { RootState } from '@react-three/fiber';

/**
 * Shared WebGL context loss recovery hook.
 * Returns { contextLost, canvasKey, handleCreated } to wire into a Canvas component.
 *
 * Usage:
 *   const { contextLost, canvasKey, handleCreated } = useWebGLRecovery();
 *   <Canvas key={canvasKey} onCreated={handleCreated} ... />
 */
export function useWebGLRecovery(label = 'WebGL') {
  const [contextLost, setContextLost] = useState(false);
  const [canvasKey, setCanvasKey] = useState(0);

  const handleCreated = useCallback(
    (state: RootState) => {
      const canvas = state.gl.domElement;

      const onLost = (event: Event) => {
        event.preventDefault();
        console.warn(`[${label}] WebGL context lost. Recovering...`);
        setContextLost(true);
      };

      const onRestored = () => {
        console.log(`[${label}] WebGL context restored.`);
        setContextLost(false);
      };

      canvas.addEventListener('webglcontextlost', onLost);
      canvas.addEventListener('webglcontextrestored', onRestored);

      // Store cleanup so it can be called externally if needed
      (state.gl as unknown as Record<string, unknown>).__cleanupListeners = () => {
        canvas.removeEventListener('webglcontextlost', onLost);
        canvas.removeEventListener('webglcontextrestored', onRestored);
      };
    },
    [label]
  );

  // Force re-mount Canvas when context is lost
  useEffect(() => {
    if (contextLost) {
      const timer = setTimeout(() => {
        setCanvasKey((prev) => prev + 1);
        setContextLost(false);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [contextLost]);

  // Cleanup on unmount — release all WebGL contexts
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined') {
        const canvases = document.querySelectorAll('canvas');
        canvases.forEach((canvas) => {
          const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
          if (gl) {
            const ext = gl.getExtension('WEBGL_lose_context');
            if (ext) ext.loseContext();
          }
        });
      }
    };
  }, []);

  return { contextLost, canvasKey, handleCreated };
}
