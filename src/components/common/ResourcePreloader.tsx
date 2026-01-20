'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Preloads critical resources based on current route
 * Uses Link headers for HTTP/2 Server Push
 */
export default function ResourcePreloader() {
  const pathname = usePathname();

  useEffect(() => {
    // Google Fonts are already preloaded via @import in CSS
    // No need to preload local fonts since we're using Google Fonts CDN
  }, []);

  useEffect(() => {
    // Prefetch likely next pages based on current route
    const prefetchPage = (url: string) => {
      // Check if page exists before prefetching
      fetch(url, { method: 'HEAD' })
        .then((res) => {
          if (res.ok) {
            const link = document.createElement('link');
            link.rel = 'prefetch';
            link.href = url;
            document.head.appendChild(link);
          }
        })
        .catch(() => {
          // Silently fail if page doesn't exist
        });
    };

    // Smart prefetching based on user behavior
    if (pathname === '/') {
      // From home, likely to visit posts category
      prefetchPage('/jo/posts/category/101');
      // Note: /jo/classes doesn't exist yet, so we skip it
    } else if (pathname.includes('/posts/category/')) {
      // From category, likely to visit individual posts
      // This will be handled by LinkPrefetch component
    } else if (pathname.includes('/classes')) {
      // From classes, likely to visit subjects
      // This will be handled by LinkPrefetch component
    }

    // Prefetch API endpoint responses
    const prefetchAPI = async (endpoint: string) => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        };
        const apiKey = process.env.NEXT_PUBLIC_FRONTEND_API_KEY;
        if (apiKey) {
          (headers as Record<string, string>)['X-Frontend-Key'] = apiKey;
        }
        await fetch(`${baseUrl}${endpoint}`, {
          method: 'GET',
          headers,
        });
      } catch {
        // Silent fail
      }
    };

    // Prefetch common API endpoints
    if (pathname === '/') {
      prefetchAPI('/front/settings');
    }
  }, [pathname]);

  return null; // This component doesn't render anything
}
