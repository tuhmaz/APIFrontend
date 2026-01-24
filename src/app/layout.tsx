import type { Metadata } from 'next';
import { Cairo } from 'next/font/google';
import './globals.css';
import ToastProvider from '@/components/ui/ToastProvider';
import ThemeInitializer from '@/components/ThemeInitializer';
import ResourcePreloader from '@/components/common/ResourcePreloader';
import { getStorageUrl } from '@/lib/utils';
import { ssrFetch, getSSRHeaders } from '@/lib/api/ssr-fetch';
import { API_CONFIG } from '@/lib/api/config';
import GoogleAnalytics from '@/components/GoogleAnalytics';

// Cairo font - Arabic optimized, loaded via Next.js for better performance
const cairo = Cairo({
  variable: '--font-cairo',
  subsets: ['arabic', 'latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700'],
  preload: true,
});

async function getPublicSettings(): Promise<Record<string, string | null>> {
  const baseUrl = API_CONFIG.BASE_URL;
  try {
    const res = await ssrFetch(`${baseUrl}/front/settings`, {
      next: { revalidate: 300 },
      headers: getSSRHeaders()
    });
    if (!res.ok) return {};
    const json: any = await res.json().catch(() => null);
    const body = json?.data ?? json;
    const settings = body?.settings ?? body?.data ?? body;
    if (settings && typeof settings === 'object') return settings as Record<string, string | null>;
    return {};
  } catch {
    return {};
  }
}

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
  const faviconUrl = getStorageUrl(settings.site_favicon);

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
      icon: faviconUrl || '/favicon.ico',
      shortcut: faviconUrl || '/favicon.ico',
      apple: faviconUrl || '/favicon.ico',
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
        <GoogleAnalytics gaId={gaId} />
        <ThemeInitializer />
        <ToastProvider />
        <ResourcePreloader />
        {children}
      </body>
    </html>
  );
}
