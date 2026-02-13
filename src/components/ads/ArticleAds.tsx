'use client';

import ResponsiveAd from './ResponsiveAd';

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
 * - Shows appropriate ad based on position (top = slot 1, sidebar-bottom = slot 2)
 * - Delegates to ResponsiveAd for responsive rendering and policy compliance
 */
export default function ArticleAds({ adSettings, position }: ArticleAdsProps) {
  const desktopCode = position === 'top' ? adSettings.googleAdsDesktop : adSettings.googleAdsDesktop2;
  const mobileCode = position === 'top' ? adSettings.googleAdsMobile : adSettings.googleAdsMobile2;

  return (
    <ResponsiveAd
      desktopCode={desktopCode || undefined}
      mobileCode={mobileCode || undefined}
      className={position === 'top' ? 'mb-6' : ''}
    />
  );
}
