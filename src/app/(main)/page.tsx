import { cookies } from 'next/headers';
import { Metadata } from 'next';
import { API_CONFIG, COUNTRIES } from '@/lib/api/config';
import HomeContent from '@/components/home/HomeContent';
import { getStorageUrl, safeJsonLd } from '@/lib/utils';
import { ssrFetch, getSSRHeaders } from '@/lib/api/ssr-fetch';
import { getFrontSettings } from '@/lib/front-settings';

// Force dynamic rendering since we rely on cookies
export const dynamic = 'force-dynamic';

async function getPublicSettings(): Promise<Record<string, string | null>> {
  return getFrontSettings();
}

async function getClasses(countryId: string) {
  try {
    const res = await ssrFetch(`${API_CONFIG.BASE_URL}/school-classes?country_id=${countryId}`, {
      next: { revalidate: 60 },
      headers: getSSRHeaders(countryId)
    });

    if (!res.ok) {
      console.error('Failed to fetch classes:', res.status);
      return [];
    }

    const json = await res.json();
    return json.data || [];
  } catch (error) {
    console.error('Error fetching classes:', error);
    return [];
  }
}

async function getCategories(countryId: string) {
  try {
    const res = await ssrFetch(`${API_CONFIG.BASE_URL}/categories?country=${countryId}`, {
      next: { revalidate: 60 },
      headers: getSSRHeaders(countryId)
    });

    if (!res.ok) {
      console.error('Failed to fetch categories:', res.status);
      return [];
    }

    const json = await res.json();
    return json.data || [];
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const countryId = cookieStore.get('country_id')?.value || '1';
  const country = COUNTRIES.find(c => c.id === countryId) || COUNTRIES[0];
  const settings = await getPublicSettings();
  const siteName = (settings.site_name || settings.siteName || '').toString().trim();
  const resolvedSiteName = siteName || 'منصة التعليم';

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
  const metaDescription = (settings.meta_description || '').toString().trim();
  const metaKeywords = parseKeywords(settings.meta_keywords);
  const canonicalUrl = (settings.canonical_url || settings.site_url || '').toString().trim();
  const metadataBase = normalizeBaseUrl(canonicalUrl);
  const ogImage = getStorageUrl(settings.site_logo);

  const title = metaTitle || `${resolvedSiteName} - المنهاج الدراسي ${country.name}`;
  const description =
    metaDescription ||
    `تصفح جميع الصفوف والمواد الدراسية للمنهاج ${country.name} على منصة ${resolvedSiteName} التعليمية.`;

  return {
    ...(metadataBase ? { metadataBase } : {}),
    title,
    description,
    keywords: metaKeywords || [`منهاج ${country.name}`, 'تعليم', 'دروس', 'امتحانات', resolvedSiteName],
    alternates: canonicalUrl ? { canonical: canonicalUrl } : undefined,
    openGraph: {
      title,
      description,
      type: 'website',
      siteName: resolvedSiteName,
      locale: 'ar_JO',
      ...(canonicalUrl ? { url: canonicalUrl } : {}),
      ...(ogImage ? { images: [{ url: ogImage }] } : {}),
    }
  };
}

export default async function HomePage() {
  const cookieStore = await cookies();
  const countryId = cookieStore.get('country_id')?.value || '1';
  const token = cookieStore.get('token')?.value;
  const country = COUNTRIES.find(c => c.id === countryId) || COUNTRIES[0];
  
  const [classes, categories, settings] = await Promise.all([
    getClasses(countryId),
    getCategories(countryId),
    getPublicSettings(),
  ]);

  const initialSiteName = (settings.site_name || (settings as any).siteName || '').toString().trim();

  const resolvedSiteName = initialSiteName || 'منصة التعليم';

  const rawCanonical = (settings.canonical_url || (settings as any).site_url || '').toString().trim();
  const canonicalUrl = rawCanonical || undefined;
  const logoUrl = getStorageUrl((settings as any).site_logo);

  const jsonLdDescription = (settings.meta_description || (settings as any).metaDescription || '')
    .toString()
    .trim() || `تصفح جميع الصفوف والمواد الدراسية للمنهاج ${country.name} على منصة ${resolvedSiteName} التعليمية.`;

  const schemaGraph = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'EducationalOrganization',
        ...(canonicalUrl ? { '@id': `${canonicalUrl.replace(/\/$/, '')}#organization`, url: canonicalUrl } : {}),
        name: resolvedSiteName,
        description: jsonLdDescription,
        ...(logoUrl ? { logo: logoUrl } : {}),
        address: {
          '@type': 'PostalAddress',
          addressCountry: country.name,
        },
        areaServed: {
          '@type': 'Country',
          name: country.name,
        },
      },
      {
        '@type': 'WebSite',
        ...(canonicalUrl ? { '@id': `${canonicalUrl.replace(/\/$/, '')}#website`, url: canonicalUrl } : {}),
        name: resolvedSiteName,
        description: jsonLdDescription,
        inLanguage: 'ar',
        ...(canonicalUrl ? { publisher: { '@id': `${canonicalUrl.replace(/\/$/, '')}#organization` } } : {}),
      }
    ]
  };

  // Extract ad settings for home page
  const adSettings = {
    // First ad position (below classes)
    googleAdsDesktop: settings.google_ads_desktop_home || '',
    googleAdsMobile: settings.google_ads_mobile_home || '',
    // Second ad position (between sections)
    googleAdsDesktop2: settings.google_ads_desktop_home_2 || '',
    googleAdsMobile2: settings.google_ads_mobile_home_2 || '',
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(schemaGraph) }}
      />
      <HomeContent
        country={country}
        classes={classes}
        categories={categories}
        initialSiteName={initialSiteName}
        isLoggedIn={!!token}
        adSettings={adSettings}
      />
    </>
  );
}
