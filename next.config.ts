import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const currentDir = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Performance optimizations
  poweredByHeader: false,
  compress: true,

  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8000',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '8000',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'api.alemancenter.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'alemancenter.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com',
        pathname: '/**',
      },
    ],
  },

  // Experimental features for performance
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'framer-motion',
      'date-fns',
      '@headlessui/react',
    ],
    scrollRestoration: true,
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
    // Use API domain in production, localhost in development
    let apiUrl = process.env.NODE_ENV === 'production'
      ? 'https://api.alemancenter.com'
      : 'http://localhost:8000';

    if (process.env.NEXT_PUBLIC_API_URL) {
      apiUrl = process.env.NEXT_PUBLIC_API_URL.replace(/\/api\/?$/, '');
    }

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
