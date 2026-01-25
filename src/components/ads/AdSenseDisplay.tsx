'use client';

import { useEffect, useState, useRef } from 'react';
import { useFrontSettings } from '@/components/front-settings/FrontSettingsProvider';

interface AdSenseDisplayProps {
  slotType: 'download_top' | 'download_sidebar';
  className?: string;
}

/**
 * AdSense Display for Download Pages
 * - Fetches ad code from settings
 * - Renders only once to avoid duplicate ads
 * - Includes "إعلان" label for AdSense compliance
 */
const AdSenseDisplay = ({ slotType, className = '' }: AdSenseDisplayProps) => {
  const [adCode, setAdCode] = useState<string>('');
  const [isLoaded, setIsLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const renderedRef = useRef(false);
  const settings = useFrontSettings();

  // Resolve ad code from SSR-provided settings (no client API calls)
  useEffect(() => {
    const isMobile = window.innerWidth < 768;

    // Map slot type to setting key
    let targetKey = '';
    if (slotType === 'download_top') {
      targetKey = isMobile ? 'google_ads_mobile_download' : 'google_ads_desktop_download';
    } else if (slotType === 'download_sidebar') {
      targetKey = isMobile ? 'google_ads_mobile_download_2' : 'google_ads_desktop_download_2';
    }

    let code: any = (settings as any)?.[targetKey] || '';

    // Handle base64 encoded ads
    if (typeof code === 'string' && code.startsWith('__B64__')) {
      try {
        code = atob(code.slice(7));
      } catch {
        code = '';
      }
    }

    setAdCode(typeof code === 'string' ? code : '');
    setIsLoaded(true);
  }, [slotType, settings]);

  // Render ad code only once
  useEffect(() => {
    if (!adCode || !containerRef.current || renderedRef.current) return;
    renderedRef.current = true;

    containerRef.current.innerHTML = adCode;

    // Try to initialize AdSense
    try {
      if ((window as any).adsbygoogle) {
        (window as any).adsbygoogle.push({});
      }
    } catch {
      // Ignore
    }
  }, [adCode]);

  if (!isLoaded) {
    return null; // Don't show loading state - cleaner UX
  }

  if (!adCode) {
    return null; // No ad configured
  }

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gray-50 border border-gray-100 p-4 ${className}`}>
      {/* AdSense required label */}
      <div className="text-xs text-gray-400 mb-2 text-center font-medium">
        إعلان
      </div>

      <div
        ref={containerRef}
        className="min-h-[90px]"
      />
    </div>
  );
};

export default AdSenseDisplay;
