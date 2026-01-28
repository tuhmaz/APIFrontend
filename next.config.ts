import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const currentDir = dirname(fileURLToPath(import.meta.url));

// ==============================================
// Dynamic Domain Configuration from Environment
// ==============================================
// Extract hostnames from environment variables
const getHostFromUrl = (url: string | undefined): string | null => {
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
};

// API hostname (e.g., api.example.com)
const apiHost = getHostFromUrl(process.env.NEXT_PUBLIC_API_URL);
// App hostname (e.g., example.com)
const appHost = getHostFromUrl(process.env.NEXT_PUBLIC_APP_URL);

// Build dynamic remote patterns for images
const buildRemotePatterns = () => {
  const patterns: Array<{
    protocol: 'http' | 'https';
    hostname: string;
    port?: string;
    pathname?: string;
  }> = [
    // Always allow these (external services)
    { protocol: 'https', hostname: 'api.dicebear.com' },
    { protocol: 'https', hostname: 'lh3.googleusercontent.com', pathname: '/**' },
    { protocol: 'https', hostname: '*.googleusercontent.com', pathname: '/**' },
    // Local development
    { protocol: 'http', hostname: 'localhost', port: '8000', pathname: '/**' },
    { protocol: 'http', hostname: '127.0.0.1', port: '8000', pathname: '/**' },
  ];

  // Add API host from environment
  if (apiHost) {
    patterns.push({ protocol: 'https', hostname: apiHost, pathname: '/**' });
  }

  // Add App host from environment
  if (appHost && appHost !== apiHost) {
    patterns.push({ protocol: 'https', hostname: appHost, pathname: '/**' });
  }

  return patterns;
};

const nextConfig: NextConfig = {
  // Performance optimizations
  poweredByHeader: false,
  compress: true,

  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 86400,
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: buildRemotePatterns(),
  },

  // Experimental features for performance
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'framer-motion',
      'date-fns',
      '@headlessui/react',
      'recharts',
    ],
    scrollRestoration: true,
    // Optimize CSS loading
    optimizeCss: true,
  },

  // Compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },

  turbopack: {
    root: currentDir,
  },

  async redirects() {
    return [
      {
        source: "/about",
        destination: "/about-us",
        permanent: true,
      },
      {
        source: "/about/",
        destination: "/about-us",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/download/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          }
        ],
      },
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()'
          }
        ]
      },
      // Cache headers for static assets
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ]
      },
      // Cache headers for images
      {
        source: '/assets/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=604800'
          }
        ]
      }
    ];
  },
  async rewrites() {
    // Get API base URL from environment (remove /api suffix if present)
    const apiUrl = process.env.NEXT_PUBLIC_API_URL
      ? process.env.NEXT_PUBLIC_API_URL.replace(/\/api\/?$/, '')
      : 'http://localhost:8000';

    return [
      {
        source: '/storage/:path*',
        destination: `${apiUrl}/storage/:path*`,
      },
      {
        source: '/assets/:path*',
        destination: `${apiUrl}/assets/:path*`,
      },
    ];
  },

};

export default nextConfig;
