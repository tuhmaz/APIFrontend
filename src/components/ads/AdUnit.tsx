'use client';

import { useEffect, useRef } from 'react';

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
  const renderedRef = useRef(false);

  useEffect(() => {
    // Prevent double rendering in strict mode
    if (renderedRef.current || !adCode || !containerRef.current) return;
    renderedRef.current = true;

    // Simply set the HTML content - let AdSense handle it naturally
    containerRef.current.innerHTML = adCode;
    containerRef.current.setAttribute('data-ad-rendered', 'true');

    // Try to push to adsbygoogle if available (for dynamically loaded ads)
    try {
      if (typeof window !== 'undefined' && (window as any).adsbygoogle) {
        (window as any).adsbygoogle.push({});
      }
    } catch {
      // Ignore - AdSense will handle it
    }
  }, [adCode]);

  if (!adCode) return null;

  return (
    <div
      ref={containerRef}
      className={`ad-unit ${className}`}
      data-ad-rendered="false"
    />
  );
}
