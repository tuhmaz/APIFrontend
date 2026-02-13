import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const FEED_ALIAS_PATHS = new Set([
  '/feed',
  '/feed.xml',
  '/feed/posts/default',
  '/blog/feed',
  '/blog/feed.xml',
  '/blog/rss',
  '/blog/rss.xml',
  '/articles/feed',
]);

function normalizePathname(pathname: string): string {
  const lower = pathname.toLowerCase();
  if (lower === '/') return '/';
  return lower.replace(/\/+$/, '');
}

function shouldRedirectToFeed(pathname: string): boolean {
  if (pathname === '/rss') return true;
  if (pathname.startsWith('/rss/')) return true;
  return FEED_ALIAS_PATHS.has(pathname);
}

export function proxy(request: NextRequest) {
  const pathname = normalizePathname(request.nextUrl.pathname);
  const format = request.nextUrl.searchParams.get('format')?.toLowerCase();

  // Feed/RSS redirects → /rss.xml
  if (
    pathname !== '/rss.xml' &&
    (shouldRedirectToFeed(pathname) || (pathname === '/' && format === 'feed'))
  ) {
    const feedUrl = request.nextUrl.clone();
    const nextSearchParams = new URLSearchParams(request.nextUrl.searchParams);

    nextSearchParams.delete('format');
    feedUrl.pathname = '/rss.xml';
    feedUrl.search = nextSearchParams.toString();

    return NextResponse.redirect(feedUrl, 308);
  }

  // Dashboard auth protection
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('return', request.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  const response = NextResponse.next();

  // Performance headers
  response.headers.set('X-DNS-Prefetch-Control', 'on');

  // Cache static assets aggressively
  if (
    request.nextUrl.pathname.startsWith('/_next/static') ||
    request.nextUrl.pathname.startsWith('/static') ||
    request.nextUrl.pathname.match(/\.(jpg|jpeg|png|gif|svg|webp|ico|woff|woff2|ttf|eot)$/)
  ) {
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  }

  // Cache API responses with shorter duration
  if (request.nextUrl.pathname.startsWith('/api/')) {
    response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
