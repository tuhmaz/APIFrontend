'use client';

import { useEffect, useMemo, useRef } from 'react';
import {
  detectAdType,
  normalizeAdSnippet,
  extractScripts,
  initializeAdSlots,
} from '@/lib/adsense';

/** Returns true if CookieYes consent for `category` has been given (or CookieYes is absent). */
function hasCkyConsent(category: string): boolean {
  const win = window as Window & {
    getCkyConsent?: () => { categories?: { accepted?: string[] } };
  };
  if (typeof win.getCkyConsent !== 'function') return true;
  return win.getCkyConsent()?.categories?.accepted?.includes(category) ?? true;
}

interface AdUnitProps {
  adCode: string;
  className?: string;
}

export default function AdUnit({ adCode, className = '' }: AdUnitProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const adType = useMemo(() => detectAdType(adCode || ''), [adCode]);

  // AdSense path: strip scripts, keep <ins> markup
  const normalizedMarkup = useMemo(
    () => (adType === 'adsense' ? normalizeAdSnippet(adCode || '') : ''),
    [adType, adCode]
  );

  // Script path: extract all <script> tags as structured objects
  const scripts = useMemo(
    () => (adType === 'script' ? extractScripts(adCode || '') : []),
    [adType, adCode]
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Clear previous content
    container.innerHTML = '';

    // ── AdSense path ──────────────────────────────────────────────
    if (adType === 'adsense') {
      if (!normalizedMarkup) return;
      container.innerHTML = normalizedMarkup;
      container.setAttribute('data-ad-rendered', 'true');
      return initializeAdSlots(container);
    }

    // ── Generic script path ───────────────────────────────────────
    if (adType === 'script' && scripts.length > 0) {
      const inject = () => {
        scripts.forEach((info) => {
          const el = document.createElement('script');
          if (info.src) {
            el.src = info.src;
            el.async = info.async;
            if (info.referrerPolicy) el.referrerPolicy = info.referrerPolicy;
            if (info.crossOrigin) el.crossOrigin = info.crossOrigin;
          } else if (info.content) {
            el.textContent = info.content;
          }
          container.appendChild(el);
        });
      };

      if (hasCkyConsent('advertisement')) {
        inject();
      } else {
        // Wait for the user to accept advertisement cookies
        const onConsent = (e: Event) => {
          const accepted: string[] = (e as CustomEvent).detail?.accepted ?? [];
          if (accepted.includes('advertisement')) {
            inject();
            document.removeEventListener('cookieyes_consent_update', onConsent);
          }
        };
        document.addEventListener('cookieyes_consent_update', onConsent);
        return () => {
          document.removeEventListener('cookieyes_consent_update', onConsent);
          container.innerHTML = '';
        };
      }
    }

    return () => {
      container.innerHTML = '';
    };
  }, [adType, normalizedMarkup, scripts]);

  if (adType === 'empty') return null;

  return (
    <div
      ref={containerRef}
      className={`ad-unit ${className}`}
      data-ad-rendered="false"
    />
  );
}
