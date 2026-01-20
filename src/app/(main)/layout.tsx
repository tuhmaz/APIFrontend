import Navbar from '@/components/common/Navbar';
import Footer from '@/components/common/Footer';

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

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const initialSettings = await getPublicSettings();

  return (
    <>
      <Navbar initialSettings={initialSettings} />
      <main className="min-h-screen">{children}</main>
      <Footer initialSettings={initialSettings} />
    </>
  );
}
