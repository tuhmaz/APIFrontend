import { ReactNode } from 'react';

interface ArticleContentWrapperProps {
  children: ReactNode;
  adSettings?: {
    googleAdsDesktop: string;
    googleAdsMobile: string;
    googleAdsDesktop2: string;
    googleAdsMobile2: string;
  };
}

export default function ArticleContentWrapper({ children, adSettings }: ArticleContentWrapperProps) {
  // Ads are rendered with CSS-based responsive classes (hidden md:block), so SSR is safe and preferred.
  // We removed isMounted check to avoid double render and hydration flicker.

  return (
    <>
      {/* First Ad Position - Top of Article */}
      {(adSettings?.googleAdsDesktop || adSettings?.googleAdsMobile) && (
        <div className="mb-8 relative overflow-hidden rounded-2xl bg-gray-50 border border-gray-100">
          <div className="text-xs text-gray-400 mb-2 text-center">إعلان</div>
          {adSettings.googleAdsDesktop && (
            <div
              className="hidden md:block"
              dangerouslySetInnerHTML={{ __html: adSettings.googleAdsDesktop }}
            />
          )}
          {adSettings.googleAdsMobile && (
            <div
              className="block md:hidden"
              dangerouslySetInnerHTML={{ __html: adSettings.googleAdsMobile }}
            />
          )}
        </div>
      )}

      {/* Article Content (passed as children from Server Component) */}
      {children}

      {/* Second Ad Position - Bottom of Article */}
      {(adSettings?.googleAdsDesktop2 || adSettings?.googleAdsMobile2) && (
        <div className="mt-8 relative overflow-hidden rounded-2xl bg-gray-50 border border-gray-100">
          <div className="text-xs text-gray-400 mb-2 text-center">إعلان</div>
          {adSettings.googleAdsDesktop2 && (
            <div
              className="hidden md:block"
              dangerouslySetInnerHTML={{ __html: adSettings.googleAdsDesktop2 }}
            />
          )}
          {adSettings.googleAdsMobile2 && (
            <div
              className="block md:hidden"
              dangerouslySetInnerHTML={{ __html: adSettings.googleAdsMobile2 }}
            />
          )}
        </div>
      )}
    </>
  );
}
