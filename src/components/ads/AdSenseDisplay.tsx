'use client';

import { useEffect, useState, useRef } from 'react';
import apiClient from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/config';

interface AdSenseDisplayProps {
  slotType: 'download_top' | 'download_sidebar';
  className?: string;
}

/**
 * AdSense Display for Download Pages
 * - Fetches ad code from settings
 * - Renders only once to avoid duplicate ads
 * - Includes "إعلان" label for AdSense compliance
 */
const AdSenseDisplay = ({ slotType, className = '' }: AdSenseDisplayProps) => {
  const [adCode, setAdCode] = useState<string>('');
  const [isLoaded, setIsLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const fetchedRef = useRef(false);
  const renderedRef = useRef(false);

  // Fetch ad code from settings
  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    const fetchAdCode = async () => {
      try {
        const response = await apiClient.get<any>(API_ENDPOINTS.SETTINGS.GET_ALL);

        let settings: Record<string, any> = {};
        if (response?.data?.data) {
          settings = response.data.data;
        } else if (response?.data) {
          settings = response.data;
        }

        const isMobile = window.innerWidth < 768;

        // Map slot type to setting key
        let targetKey = '';
        if (slotType === 'download_top') {
          targetKey = isMobile ? 'google_ads_mobile_download' : 'google_ads_desktop_download';
        } else if (slotType === 'download_sidebar') {
          targetKey = isMobile ? 'google_ads_mobile_download_2' : 'google_ads_desktop_download_2';
        }

        let code = settings[targetKey] || '';

        // Handle base64 encoded ads
        if (typeof code === 'string' && code.startsWith('__B64__')) {
          try {
            code = atob(code.slice(7));
          } catch {
            code = '';
          }
        }

        setAdCode(code);
        setIsLoaded(true);
      } catch (error) {
        console.warn('AdSenseDisplay: Failed to fetch ad settings', error);
        setIsLoaded(true);
      }
    };

    fetchAdCode();
  }, [slotType]);

  // Render ad code only once
  useEffect(() => {
    if (!adCode || !containerRef.current || renderedRef.current) return;
    renderedRef.current = true;

    containerRef.current.innerHTML = adCode;

    // Try to initialize AdSense
    try {
      if ((window as any).adsbygoogle) {
        (window as any).adsbygoogle.push({});
      }
    } catch {
      // Ignore
    }
  }, [adCode]);

  if (!isLoaded) {
    return null; // Don't show loading state - cleaner UX
  }

  if (!adCode) {
    return null; // No ad configured
  }

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gray-50 border border-gray-100 p-4 ${className}`}>
      {/* AdSense required label */}
      <div className="text-xs text-gray-400 mb-2 text-center font-medium">
        إعلان
      </div>

      <div
        ref={containerRef}
        className="min-h-[90px]"
      />
    </div>
  );
};

export default AdSenseDisplay;
