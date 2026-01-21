'use client';

import { useEffect, useState } from 'react';
import AdUnit from './AdUnit';

interface ArticleAdsProps {
  adSettings: {
    googleAdsDesktop: string;
    googleAdsMobile: string;
    googleAdsDesktop2: string;
    googleAdsMobile2: string;
  };
  position: 'top' | 'sidebar-bottom';
}

/**
 * Article Ads Component
 * - Shows appropriate ad based on position
 * - Handles mobile/desktop switching
 * - Includes "إعلان" label for AdSense compliance
 */
export default function ArticleAds({ adSettings, position }: ArticleAdsProps) {
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();

    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Don't render on server or if not yet determined (client-side only)
  if (isMobile === null) return null;

  // Get the appropriate ad code based on position
  const adCode = position === 'top'
    ? (isMobile ? adSettings.googleAdsMobile : adSettings.googleAdsDesktop)
    : (isMobile ? adSettings.googleAdsMobile2 : adSettings.googleAdsDesktop2);

  // Don't render if no ad code
  if (!adCode) return null;

  return (
    <div
      className={`
        relative overflow-hidden rounded-2xl border
        ${position === 'top'
          ? 'bg-gray-50 border-gray-100 p-4 mb-6'
          : 'bg-white shadow-sm border-gray-100 p-4'
        }
      `}
    >
      {/* AdSense required label */}
      <div className="text-xs text-gray-400 mb-2 text-center font-medium">
        إعلان
      </div>

      <AdUnit adCode={adCode} className="min-h-[90px]" />
    </div>
  );
}
