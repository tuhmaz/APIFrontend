const FEED_REVALIDATE_SECONDS = 3600;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function resolveSiteUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_APP_URL || '').trim();
  if (!raw) return 'http://localhost:3000';

  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    return new URL(withProtocol).origin;
  } catch {
    return 'http://localhost:3000';
  }
}

export const revalidate = 3600;

export async function GET(): Promise<Response> {
  const siteUrl = resolveSiteUrl();
  const siteName = (process.env.NEXT_PUBLIC_SITE_NAME || 'Education Platform').trim();
  const siteDescription = (
    process.env.NEXT_PUBLIC_SITE_DESCRIPTION || 'Latest educational updates and posts.'
  ).trim();
  const now = new Date().toUTCString();

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(siteName)}</title>
    <link>${escapeXml(siteUrl)}</link>
    <description>${escapeXml(siteDescription)}</description>
    <language>ar</language>
    <lastBuildDate>${now}</lastBuildDate>
    <generator>Next.js</generator>
    <atom:link href="${escapeXml(`${siteUrl}/rss.xml`)}" rel="self" type="application/rss+xml" />
    <item>
      <title>${escapeXml(siteName)}</title>
      <link>${escapeXml(siteUrl)}</link>
      <guid isPermaLink="true">${escapeXml(siteUrl)}</guid>
      <pubDate>${now}</pubDate>
      <description>${escapeXml(siteDescription)}</description>
    </item>
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': `public, s-maxage=${FEED_REVALIDATE_SECONDS}, stale-while-revalidate=86400`,
    },
  });
}
