'use client';

import { useEffect, useMemo, useRef } from 'react';
import { initializeAdSlots, normalizeAdSnippet } from '@/lib/adsense';

interface AdUnitProps {
  adCode: string;
  className?: string;
}

/**
 * Simple AdSense Ad Unit Component
 * - Renders ad code only once
 * - No duplicate initialization
 */
export default function AdUnit({ adCode, className = '' }: AdUnitProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const normalizedMarkup = useMemo(() => normalizeAdSnippet(adCode || ''), [adCode]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    cleanupRef.current?.();
    cleanupRef.current = null;
    container.innerHTML = '';
    container.setAttribute('data-ad-rendered', 'false');

    if (!normalizedMarkup) return;

    container.innerHTML = normalizedMarkup;
    container.setAttribute('data-ad-rendered', 'true');
    cleanupRef.current = initializeAdSlots(container);

    return () => {
      cleanupRef.current?.();
      cleanupRef.current = null;
      container.innerHTML = '';
    };
  }, [normalizedMarkup]);

  if (!normalizedMarkup) return null;

  return (
    <div
      ref={containerRef}
      className={`ad-unit ${className}`}
      data-ad-rendered="false"
    />
  );
}
