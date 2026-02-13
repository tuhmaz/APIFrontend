'use client';

import AdUnit from './AdUnit';

interface ResponsiveAdProps {
  desktopCode?: string;
  mobileCode?: string;
  className?: string;
}

/**
 * Responsive AdSense Ad Component
 * - Renders separate desktop/mobile ad slots with proper CSS visibility toggling
 * - Includes "إعلان" label for AdSense policy compliance
 * - Uses proper container styling (no overflow-hidden to avoid clipping ads)
 * - Ensures only the visible slot gets initialized via CSS media queries
 */
export default function ResponsiveAd({ desktopCode, mobileCode, className = '' }: ResponsiveAdProps) {
  if (!desktopCode && !mobileCode) return null;

  return (
    <div
      className={`relative rounded-2xl border border-gray-100 bg-gray-50 p-4 ${className}`}
      role="complementary"
      aria-label="Advertisement"
    >
      <div className="text-xs text-gray-400 mb-2 text-center font-medium select-none">
        إعلان
      </div>

      {desktopCode && (
        <div className="hidden md:block min-h-[100px]">
          <AdUnit adCode={desktopCode} />
        </div>
      )}
      {mobileCode && (
        <div className="block md:hidden min-h-[100px]">
          <AdUnit adCode={mobileCode} />
        </div>
      )}
    </div>
  );
}
