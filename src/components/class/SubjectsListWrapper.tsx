'use client';

import { ReactNode, useState, useEffect } from 'react';
import AnimatedSection from '../ui/AnimatedSection';
import AdUnit from '@/components/ads/AdUnit';

interface SubjectsListWrapperProps {
  children: ReactNode;
  adSettings?: {
    googleAdsDesktop: string;
    googleAdsMobile: string;
    googleAdsDesktop2: string;
    googleAdsMobile2: string;
  };
}

export default function SubjectsListWrapper({ children, adSettings }: SubjectsListWrapperProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <>
      {/* First Ad Position - Below breadcrumb / above subjects */}
	      {isMounted && (adSettings?.googleAdsDesktop || adSettings?.googleAdsMobile) && (
	        <AnimatedSection delay={0.15}>
	          <div className="mb-8 relative overflow-hidden rounded-2xl bg-gray-50 border border-gray-100">
	            {adSettings.googleAdsDesktop && (
	              <div className="hidden md:block">
	                <AdUnit adCode={adSettings.googleAdsDesktop} />
	              </div>
	            )}
	            {adSettings.googleAdsMobile && (
	              <div className="block md:hidden">
	                <AdUnit adCode={adSettings.googleAdsMobile} />
	              </div>
	            )}
	          </div>
	        </AnimatedSection>
	      )}

      {/* Subjects List Content (passed as children from Server Component) */}
      {children}

      {/* Second Ad Position - After subjects list */}
	      {isMounted && (adSettings?.googleAdsDesktop2 || adSettings?.googleAdsMobile2) && (
	        <AnimatedSection delay={0.4}>
	          <div className="mt-8 relative overflow-hidden rounded-2xl bg-gray-50 border border-gray-100">
	            {adSettings.googleAdsDesktop2 && (
	              <div className="hidden md:block">
	                <AdUnit adCode={adSettings.googleAdsDesktop2} />
	              </div>
	            )}
	            {adSettings.googleAdsMobile2 && (
	              <div className="block md:hidden">
	                <AdUnit adCode={adSettings.googleAdsMobile2} />
	              </div>
	            )}
	          </div>
	        </AnimatedSection>
	      )}
    </>
  );
}
