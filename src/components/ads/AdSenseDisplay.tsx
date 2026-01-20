'use client';

import { useEffect, useState, useRef } from 'react';
import apiClient from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/config';

interface AdSenseDisplayProps {
  slotType: 'download_1' | 'download_2' | 'download_sidebar';
  className?: string;
}

const AdSenseDisplay = ({ slotType, className = '' }: AdSenseDisplayProps) => {
  const [adCode, setAdCode] = useState<string>('');
  const isMountedRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    
    const safeFetch = async () => {
      // 1. Initialize safe container
      let fetchedData: Record<string, any> = {};

      try {
        // 2. Wrap EVERYTHING in try-catch to prevent any crash
        let response: any = null;
        try {
          // Verify client exists before usage
          if (apiClient && typeof apiClient.get === 'function') {
             response = await apiClient.get<any>(API_ENDPOINTS.SETTINGS.GET_ALL);
          }
        } catch (netErr) {
          console.warn('AdSenseDisplay: Network/API error', netErr);
        }

        // 3. Flatten response structure safely
        if (response) {
            // Check for data.data (Laravel resource pattern)
            if (response.data && typeof response.data === 'object' && !Array.isArray(response.data)) {
                 if (response.data.data && typeof response.data.data === 'object' && !Array.isArray(response.data.data)) {
                     fetchedData = response.data.data;
                 } else {
                     fetchedData = response.data;
                 }
            } 
            // Check for direct data
            else if (response.data && typeof response.data === 'object') {
                fetchedData = response.data;
            }
        }
      } catch (globalErr) {
        console.error('AdSenseDisplay: Critical setup error', globalErr);
      }

      if (!isMountedRef.current) return;

      // 4. Determine key safely
      const isMobile = typeof window !== 'undefined' ? window.innerWidth < 768 : false;
      let targetKey = '';

      if (slotType === 'download_1') {
        targetKey = isMobile ? 'google_ads_mobile_download' : 'google_ads_desktop_download';
      } else if (slotType === 'download_2') {
        targetKey = isMobile ? 'google_ads_mobile_download_2' : 'google_ads_desktop_download_2';
      } else if (slotType === 'download_sidebar') {
        targetKey = isMobile ? 'google_ads_mobile_download' : 'google_ads_desktop_download';
      }

      // 5. Extract code using Object.entries to avoid direct property access by key
      // This bypasses any weird "undefined" key access issues if the key string is somehow corrupted
      let foundCode = '';
      
      try {
        if (fetchedData && typeof fetchedData === 'object') {
           // Iterate to find the key safely
           const entry = Object.entries(fetchedData).find(([k]) => k === targetKey);
           
           if (entry) {
             const val = entry[1];
             if (typeof val === 'string') {
               if (val.startsWith('__B64__')) {
                 try {
                    foundCode = atob(val.slice(7));
                 } catch (e) { console.warn('Decode failed', e); }
               } else {
                 foundCode = val;
               }
             }
           }
        }
      } catch (accessErr) {
        console.error('AdSenseDisplay: Safe extraction failed', accessErr);
      }

      if (isMountedRef.current) {
        setAdCode(foundCode);
      }
    };

    safeFetch();
    
    return () => {
      isMountedRef.current = false;
    };
  }, [slotType]);

  // No need to check for mounted state here since we're using client-side rendering
  // and useEffect will handle the fetch after mount
  if (!adCode) {
    return (
      <div className={`w-full bg-gray-50 animate-pulse rounded-lg border border-gray-100 flex items-center justify-center min-h-[100px] ${className}`}>
        <span className="text-gray-300 text-xs">Loading Ad...</span>
      </div>
    );
  }

  return (
    <div 
      className={`w-full overflow-hidden ${className}`}
      dangerouslySetInnerHTML={{ __html: adCode }}
    />
  );
};

export default AdSenseDisplay;
