'use client';

import { useState, useEffect } from 'react';
import AdUnit from './AdUnit';

interface ResponsiveAdProps {
  desktopCode?: string;
  mobileCode?: string;
  className?: string;
}

/**
 * Responsive AdSense Ad Component
 *
 * IMPORTANT: Only ONE <ins class="adsbygoogle"> element is rendered at a time.
 * Google's push({}) processes <ins> elements in DOM order. If we render both
 * a hidden desktop and visible mobile <ins>, push({}) would fill the hidden
 * desktop slot (first in DOM) instead of the visible mobile one.
 *
 * Uses matchMedia to detect viewport and render only the correct ad slot.
 */
export default function ResponsiveAd({ desktopCode, mobileCode, className = '' }: ResponsiveAdProps) {
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    setIsDesktop(mq.matches);

    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  if (!desktopCode && !mobileCode) return null;

  // During SSR / first paint, render nothing to avoid hydration mismatch.
  // Ads are not critical for LCP; a brief delay is acceptable.
  if (isDesktop === null) {
    return (
      <div
        className={`relative rounded-2xl border border-gray-100 bg-gray-50 p-4 ${className}`}
        role="complementary"
        aria-label="Advertisement"
      >
        <div className="min-h-[100px]" />
      </div>
    );
  }

  const adCode = isDesktop ? desktopCode : mobileCode;
  if (!adCode) return null;

  return (
    <div
      className={`relative rounded-2xl border border-gray-100 bg-gray-50 p-4 ${className}`}
      role="complementary"
      aria-label="Advertisement"
    >
      <div className="text-xs text-gray-400 mb-2 text-center font-medium select-none">
        إعلان
      </div>

      <div className="min-h-[100px]">
        <AdUnit adCode={adCode} />
      </div>
    </div>
  );
}
