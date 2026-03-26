'use client';

import { ReactNode } from 'react';
import ArticleAds from '@/components/ads/ArticleAds';
import ContentGate from '@/components/common/ContentGate';

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
 * - Gates content behind login + profile completion
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

      {/* Article Content — gated behind login & profile completion */}
      <ContentGate>
        {children}
      </ContentGate>
    </>
  );
}
