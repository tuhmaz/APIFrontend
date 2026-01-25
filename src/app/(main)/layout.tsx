import Navbar from '@/components/common/Navbar';
import Footer from '@/components/common/Footer';
import { getFrontSettings } from '@/lib/front-settings';

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const initialSettings = await getFrontSettings();

  return (
    <>
      <Navbar initialSettings={initialSettings} />
      <main className="min-h-screen">{children}</main>
      <Footer initialSettings={initialSettings} />
    </>
  );
}
