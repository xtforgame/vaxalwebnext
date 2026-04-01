'use client';

import React, { useState } from 'react';
import { useServerInsertedHTML } from 'next/navigation';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import type { EmotionCache, Options as CacheOptions } from '@emotion/cache';

/**
 * Emotion cache provider for Next.js App Router.
 * Intercepts emotion style insertions and flushes them into SSR HTML
 * via useServerInsertedHTML to prevent hydration mismatches.
 */
export default function EmotionCacheProvider({ children }: { children: React.ReactNode }) {
  const [registry] = useState(() => {
    const cache: EmotionCache = createCache({ key: 'css' } as CacheOptions);
    cache.compat = true;

    const prevInsert = cache.insert;
    let inserted: { name: string; isGlobal: boolean }[] = [];

    cache.insert = (...args) => {
      const [selector, serialized] = args;
      if ((cache as any).inserted[serialized.name] === undefined) {
        inserted.push({ name: serialized.name, isGlobal: !selector });
      }
      return prevInsert(...args);
    };

    const flush = () => {
      const prev = inserted;
      inserted = [];
      return prev;
    };

    return { cache, flush };
  });

  useServerInsertedHTML(() => {
    const inserted = registry.flush();
    if (inserted.length === 0) return null;

    let styles = '';
    let dataEmotionAttribute = registry.cache.key;
    const globals: { name: string; style: string }[] = [];

    for (const { name, isGlobal } of inserted) {
      const style = (registry.cache as any).inserted[name];
      if (typeof style === 'string') {
        if (isGlobal) {
          globals.push({ name, style });
        } else {
          styles += style;
          dataEmotionAttribute += ` ${name}`;
        }
      }
    }

    return (
      <>
        {globals.map(({ name, style }) => (
          <style
            key={name}
            data-emotion={`${registry.cache.key}-global ${name}`}
            dangerouslySetInnerHTML={{ __html: style }}
          />
        ))}
        {styles && (
          <style
            data-emotion={dataEmotionAttribute}
            dangerouslySetInnerHTML={{ __html: styles }}
          />
        )}
      </>
    );
  });

  return <CacheProvider value={registry.cache}>{children}</CacheProvider>;
}
