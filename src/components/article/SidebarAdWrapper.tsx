interface SidebarAdWrapperProps {
  adSettings?: {
    googleAdsDesktop: string;
    googleAdsMobile: string;
    googleAdsDesktop2: string;
    googleAdsMobile2: string;
  };
  children?: React.ReactNode;
}

export default function SidebarAdWrapper({ adSettings, children }: SidebarAdWrapperProps) {
  return (
    <div className="lg:col-span-4 space-y-8">
      {/* First Sidebar Ad (Top) */}
      {(adSettings?.googleAdsDesktop || adSettings?.googleAdsMobile) && (
        <div className="relative overflow-hidden rounded-2xl bg-white shadow-sm border border-gray-100 p-4">
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

      {/* Related Articles or other sidebar content */}
      {children}

      {/* Sticky Sidebar Ad (Bottom - stays visible on scroll) */}
      {(adSettings?.googleAdsDesktop2 || adSettings?.googleAdsMobile2) && (
        <div className="mt-8">
          <div className="relative overflow-hidden rounded-2xl bg-white shadow-sm border border-gray-100 p-4">
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
        </div>
      )}
    </div>
  );
}
