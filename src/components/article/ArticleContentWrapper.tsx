'use client';

import { ReactNode } from 'react';
import ArticleAds from '@/components/ads/ArticleAds';

interface ArticleContentWrapperProps {
  children: ReactNode;
  adSettings?: {
    googleAdsDesktop: string;
    googleAdsMobile: string;
    googleAdsDesktop2: string;
    googleAdsMobile2: string;
  };
}

/**
 * Article Content Wrapper
 * - Shows one ad at the top of article content
 */
export default function ArticleContentWrapper({
  children,
  adSettings
}: ArticleContentWrapperProps) {
  const hasTopAd = !!(adSettings?.googleAdsDesktop || adSettings?.googleAdsMobile);

  return (
    <>
      {/* Top Ad */}
      {hasTopAd && adSettings && (
        <ArticleAds adSettings={adSettings} position="top" />
      )}

      {/* Article Content */}
      {children}
    </>
  );
}
