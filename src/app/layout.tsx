import type { Metadata } from 'next';
import { Cairo } from 'next/font/google';
import './globals.css';
import ToastProvider from '@/components/ui/ToastProvider';
import ThemeInitializer from '@/components/ThemeInitializer';
import ResourcePreloader from '@/components/common/ResourcePreloader';
import { getStorageUrl } from '@/lib/utils';
import GoogleAnalytics from '@/components/GoogleAnalytics';
import { getFrontSettings } from '@/lib/front-settings';
import { FrontSettingsProvider } from '@/components/front-settings/FrontSettingsProvider';

// Cairo font - Arabic optimized, loaded via Next.js for better performance
const cairo = Cairo({
  variable: '--font-cairo',
  subsets: ['arabic', 'latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700'],
  preload: true,
  adjustFontFallback: true,
});

async function getPublicSettings(): Promise<Record<string, string | null>> {
  return getFrontSettings();
}

const toPublicStorageUrl = (value?: string | null): string | undefined => {
  const raw = (value || '').toString().trim();
  if (!raw) return undefined;
  if (/^https?:\/\//i.test(raw)) return raw;
  const normalized = raw.startsWith('/') ? raw : `/${raw}`;
  return normalized.startsWith('/storage/') ? normalized : `/storage${normalized}`;
};

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicSettings();
  const siteName = (settings.site_name || (settings as any).siteName || '').toString().trim();

  const normalizeBaseUrl = (value: string | null | undefined): URL | undefined => {
    const trimmed = (value || '').toString().trim();
    if (!trimmed) return undefined;
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    try {
      return new URL(withProtocol);
    } catch {
      return undefined;
    }
  };

  const parseKeywords = (value: string | null | undefined): string[] | undefined => {
    const raw = (value || '').toString().trim();
    if (!raw) return undefined;
    const items = raw
      .split(/[,،\n\r]+/g)
      .map((k) => k.trim())
      .filter(Boolean);
    return items.length ? items : undefined;
  };

  const metaTitle = (settings.meta_title || '').toString().trim();
  const metaDescription = (settings.meta_description || settings.site_description || '').toString().trim();
  const metaKeywords = parseKeywords(settings.meta_keywords);
  const canonicalUrl = (settings.canonical_url || settings.site_url || '').toString().trim();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const metadataBase = normalizeBaseUrl(canonicalUrl) || new URL(appUrl);
  const ogImage = getStorageUrl(settings.site_logo || settings.site_favicon);
  const faviconUrl = toPublicStorageUrl(settings.site_favicon);
  const faviconFallback = '/favicon.ico';
  const iconList = [
    { url: faviconFallback },
    ...(faviconUrl && faviconUrl !== faviconFallback ? [{ url: faviconUrl }] : []),
  ];

  return {
    metadataBase,
    title: metaTitle || siteName || 'منصة التعليم - أخبار ومناهج ونتائج الامتحانات',
    description:
      metaDescription ||
      'المنصة التعليمية الرائدة للأخبار التربوية، المناهج الدراسية، نتائج الامتحانات، والملفات التعليمية للمعلمين والطلاب في الأردن والدول العربية.',
    keywords:
      metaKeywords || ['تعليم', 'أخبار التعليم', 'نتائج الامتحانات', 'مناهج', 'دروس', 'ملفات تعليمية', 'الأردن', 'طلاب', 'معلمين', 'وزارة التربية والتعليم'],
    alternates: canonicalUrl ? { canonical: canonicalUrl } : undefined,
    icons: {
      icon: iconList,
      shortcut: faviconFallback,
      apple: faviconUrl || faviconFallback,
    },
    openGraph: {
      title: metaTitle || siteName || 'منصة التعليم - أخبار ومناهج ونتائج الامتحانات',
      description:
        metaDescription ||
        'المنصة التعليمية الرائدة للأخبار التربوية، المناهج الدراسية، نتائج الامتحانات، والملفات التعليمية للمعلمين والطلاب في الأردن والدول العربية.',
      type: 'website',
      locale: 'ar_JO',
      siteName: siteName || undefined,
      ...(canonicalUrl ? { url: canonicalUrl } : {}),
      ...(ogImage ? { images: [{ url: ogImage }] } : {}),
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await getPublicSettings();
  const gaId =
    (settings.google_analytics_id || settings.google_analytics || '').toString().trim() ||
    (process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID || '').toString().trim() ||
    (process.env.NEXT_PUBLIC_GA_ID || '').toString().trim();

  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        {/* Preconnect to Google Fonts - Critical for LCP */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body
        className={`${cairo.className} ${cairo.variable} antialiased min-h-screen`}
      >
        <FrontSettingsProvider settings={settings}>
          <GoogleAnalytics gaId={gaId} />
          <ThemeInitializer />
          <ToastProvider />
          <ResourcePreloader />
          {children}
        </FrontSettingsProvider>
      </body>
    </html>
  );
}
