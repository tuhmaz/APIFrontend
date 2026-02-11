'use client';

import AdUnit from './AdUnit';
import { useFrontSettings } from '@/components/front-settings/FrontSettingsProvider';

interface AdSenseDisplayProps {
  slotType: 'download_top' | 'download_sidebar';
  className?: string;
}

/**
 * AdSense Display for Download Pages
 * - Resolves mobile/desktop slots from public settings
 * - Uses AdUnit so ad initialization does not rely on injected <script> execution
 * - Includes "إعلان" label for AdSense compliance
 */
const AdSenseDisplay = ({ slotType, className = '' }: AdSenseDisplayProps) => {
  const settings = useFrontSettings();

  const desktopKey =
    slotType === 'download_top' ? 'google_ads_desktop_download' : 'google_ads_desktop_download_2';
  const mobileKey =
    slotType === 'download_top' ? 'google_ads_mobile_download' : 'google_ads_mobile_download_2';

  const desktopCode = (settings?.[desktopKey] || '').toString();
  const mobileCode = (settings?.[mobileKey] || '').toString();

  if (!desktopCode && !mobileCode) {
    return null;
  }

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gray-50 border border-gray-100 p-4 ${className}`}>
      <div className="text-xs text-gray-400 mb-2 text-center font-medium">إعلان</div>

      {desktopCode && (
        <div className="hidden md:block">
          <AdUnit adCode={desktopCode} className="min-h-[90px]" />
        </div>
      )}
      {mobileCode && (
        <div className="block md:hidden">
          <AdUnit adCode={mobileCode} className="min-h-[90px]" />
        </div>
      )}
    </div>
  );
};

export default AdSenseDisplay;
