import Navbar from '@/components/common/Navbar';
import Footer from '@/components/common/Footer';
import { getFrontSettings } from '@/lib/front-settings';

const ADSENSE_CLIENT_PATTERN = /ca-pub-\d+/;

function resolveAdsenseClient(settings: Record<string, string | null>): string {
  const explicit = (settings.adsense_client || process.env.NEXT_PUBLIC_ADSENSE_CLIENT || '')
    .toString()
    .trim();
  // Always extract just the ca-pub-XXXXX ID, even if the stored value is a full <script> tag
  const explicitMatch = explicit.match(ADSENSE_CLIENT_PATTERN);
  if (explicitMatch) return explicitMatch[0];

  for (const [key, rawValue] of Object.entries(settings)) {
    if (!key.startsWith('google_ads_') || typeof rawValue !== 'string') continue;
    const snippet = rawValue.trim().startsWith('__B64__')
      ? (() => { try { return Buffer.from(rawValue.trim().slice(7), 'base64').toString('utf8'); } catch { return ''; } })()
      : rawValue;
    const match = snippet.match(ADSENSE_CLIENT_PATTERN);
    if (match) return match[0];
  }

  return '';
}

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const initialSettings = await getFrontSettings();
  const adsenseClient = resolveAdsenseClient(initialSettings);

  return (
    <>
      {adsenseClient && (
        <>
          <link rel="preconnect" href="https://pagead2.googlesyndication.com" crossOrigin="anonymous" />
          <link rel="preconnect" href="https://googleads.g.doubleclick.net" crossOrigin="anonymous" />
          <link rel="dns-prefetch" href="https://pagead2.googlesyndication.com" />
          <link rel="dns-prefetch" href="https://googleads.g.doubleclick.net" />
          {/* eslint-disable-next-line @next/next/no-before-interactive-script-outside-document */}
          <script
            async={true}
            crossOrigin="anonymous"
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClient}`}
          />
        </>
      )}
      <Navbar initialSettings={initialSettings} />
      <main className="min-h-screen">{children}</main>
      <Footer initialSettings={initialSettings} />
    </>
  );
}
