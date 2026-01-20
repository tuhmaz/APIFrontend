import AuthLayoutClient from './AuthLayoutClient';

async function getPublicSettings(): Promise<Record<string, string | null>> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
  try {
    const res = await fetch(`${baseUrl}/front/settings`, { next: { revalidate: 300 } });
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

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const settings = await getPublicSettings();
  const siteName = (settings.site_name || (settings as any).siteName || '').toString();
  return <AuthLayoutClient siteName={siteName}>{children}</AuthLayoutClient>;
}
