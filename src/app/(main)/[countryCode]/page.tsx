import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { API_CONFIG, COUNTRIES } from '@/lib/api/config';
import HomeContent from '@/components/home/HomeContent';
import { ssrFetch, getSSRHeaders } from '@/lib/api/ssr-fetch';
import { getFrontSettings } from '@/lib/front-settings';

// Use ISR with revalidation for better performance
export const revalidate = 60;

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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ countryCode: string }>;
}): Promise<Metadata> {
  const { countryCode } = await params;
  const country = COUNTRIES.find((c) => c.code === countryCode);
  
  if (!country) {
    return {
      title: 'Page Not Found',
    };
  }
  const settings = await getPublicSettings();
  const siteName = (settings.site_name || (settings as any).siteName || '').toString().trim();
  const resolvedSiteName = siteName || 'منصة التعليم';
  
  return {
    title: `${resolvedSiteName} - المنهاج الدراسي ${country.name}`,
    description: `تصفح جميع الصفوف والمواد الدراسية للمنهاج ${country.name} على منصة ${resolvedSiteName} التعليمية.`,
    keywords: [`منهاج ${country.name}`, 'تعليم', 'دروس', 'امتحانات', resolvedSiteName],
    openGraph: {
      title: `${resolvedSiteName} - المنهاج الدراسي ${country.name}`,
      description: `أفضل منصة تعليمية في ${country.name}`,
      type: 'website',
    }
  };
}

export default async function CountryHomePage({
  params,
}: {
  params: Promise<{ countryCode: string }>;
}) {
  const { countryCode } = await params;
  const country = COUNTRIES.find((c) => c.code === countryCode);

  if (!country) {
    notFound();
  }

  const [classes, categories, settings] = await Promise.all([
    getClasses(country.id),
    getCategories(country.id),
    getPublicSettings(),
  ]);

  const initialSiteName = (settings.site_name || (settings as any).siteName || '').toString().trim();
  return <HomeContent country={country} classes={classes} categories={categories} initialSiteName={initialSiteName} />;
}
