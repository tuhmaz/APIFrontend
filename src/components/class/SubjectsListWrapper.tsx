'use client';

import { ReactNode, useState, useEffect } from 'react';
import AnimatedSection from '../ui/AnimatedSection';
import ResponsiveAd from '@/components/ads/ResponsiveAd';

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
      {isMounted && (
        <AnimatedSection delay={0.15}>
          <div className="mb-8">
            <ResponsiveAd
              desktopCode={adSettings?.googleAdsDesktop || undefined}
              mobileCode={adSettings?.googleAdsMobile || undefined}
            />
          </div>
        </AnimatedSection>
      )}

      {/* Subjects List Content (passed as children from Server Component) */}
      {children}

      {/* Second Ad Position - After subjects list */}
      {isMounted && (
        <AnimatedSection delay={0.4}>
          <div className="mt-8">
            <ResponsiveAd
              desktopCode={adSettings?.googleAdsDesktop2 || undefined}
              mobileCode={adSettings?.googleAdsMobile2 || undefined}
            />
          </div>
        </AnimatedSection>
      )}
    </>
  );
}
