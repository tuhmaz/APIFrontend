import { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/config';
import { safeJsonLd } from '@/lib/utils';
import DownloadTimer from '@/components/download/DownloadTimer';
import AdSenseDisplay from '@/components/ads/AdSenseDisplay';
import ClassHeader from '@/components/class/ClassHeader';
import DownloadPageContent from '@/components/download/DownloadPageContent';
import { ChevronLeft, Home, FileText } from 'lucide-react';

interface Props {
  params: Promise<{
    fileId: string;
  }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

// Fetch file info with related article/post
async function getFileInfo(fileId: string, countryCode: string = 'jo') {
  try {
    const response = await apiClient.get<any>(
      API_ENDPOINTS.FILES.INFO(fileId),
      { database: countryCode },
      { cache: 'no-store' } as any
    );
    return response?.data?.data || null;
  } catch (err) {
    console.error('Error fetching file info:', err);
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { fileId } = await params;
  const cookieStore = await cookies();
  const countryCode = cookieStore.get('country')?.value || 'jo';

  const data = await getFileInfo(fileId, countryCode);

  if (!data || !data.file) {
    return {
      title: 'ملف غير موجود',
      description: 'الملف المطلوب غير متوفر',
    };
  }

  const { file, item } = data;

  const title = `تحميل ${file.file_name}${item ? ` - ${item.title}` : ''}`;
  const subjectName = item?.subject?.name ? `التابع لمادة ${item.subject.name}` : '';
  const description = `تحميل ملف ${file.file_name} ${subjectName}. ${item?.meta_description || 'ملف تعليمي عالي الجودة متاح للتحميل المباشر.'}`;

  const ogImage = item?.image_url || '/assets/img/front-pages/icons/articles_default_image.webp';

  return {
    title,
    description,
    robots: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
    },
    openGraph: {
      title,
      description,
      images: [{ url: ogImage, width: 800, height: 600, alt: title }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
    alternates: {
      canonical: `/download/${fileId}`,
    },
  };
}

export default async function DownloadPage({ params, searchParams }: Props) {
  const { fileId } = await params;
  const sp = await searchParams;
  const cookieStore = await cookies();
  const countryCode = cookieStore.get('country')?.value || 'jo';

  const data = await getFileInfo(fileId, countryCode);

  if (!data || !data.file) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md mx-auto">
            <div className="bg-yellow-50 p-4 rounded-xl mb-6">
              <FileText size={32} className="text-yellow-600 mx-auto" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">عذراً، لم يتم العثور على الملف</h2>
            <p className="text-gray-600 mb-6">
              يبدو أن الملف الذي تبحث عنه غير متوفر حالياً. قد يكون قد تم حذفه أو نقله إلى مكان آخر.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/"
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Home size={18} />
                الصفحة الرئيسية
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { file, item, type } = data;

  // Schema.org Structured Data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `تحميل ${file.file_name}`,
    description: item ? `صفحة تحميل الملف ${file.file_name} التابع لـ ${item.title}` : `صفحة تحميل الملف ${file.file_name}`,
    mainEntity: {
      '@type': 'DigitalDocument',
      name: file.file_name,
      fileFormat: file.mime_type || 'application/pdf',
      size: `${file.file_size} bytes`,
    }
  };

  const backParamRaw = sp?.back;
  const backParam = Array.isArray(backParamRaw) ? backParamRaw[0] : backParamRaw;

  const backLink = backParam || (item
    ? (type === 'post' ? `/${countryCode}/posts/${item.id}` : `/${countryCode}/lesson/articles/${item.id}`)
    : `/${countryCode}`);

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* JSON-LD for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />

      {/* Header */}
      <ClassHeader title={`تحميل: ${file.file_name}`} />

      <div className="container mx-auto px-4 mt-8">

        {/* Breadcrumb */}
        <nav aria-label="breadcrumb" className="bg-white p-4 rounded-xl shadow-md border border-gray-100 mb-8">
          <ol className="flex items-center flex-wrap gap-2 text-sm text-gray-600">
            <li>
              <Link href="/" className="flex items-center gap-1 hover:text-blue-600 transition-colors">
                <Home size={16} />
                <span>الرئيسية</span>
              </Link>
            </li>
            <li>
              <ChevronLeft size={16} className="text-gray-400" />
            </li>
            {item && (
              <>
                <li>
                  <Link href={backLink} className="hover:text-blue-600 transition-colors line-clamp-1">
                    {item.title}
                  </Link>
                </li>
                <li>
                  <ChevronLeft size={16} className="text-gray-400" />
                </li>
              </>
            )}
            <li className="font-semibold text-blue-600" aria-current="page">
              تحميل الملف
            </li>
          </ol>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Content (8 cols) */}
          <div className="lg:col-span-8">

            {/* Top Ad - إعلان 1 */}
            <div className="mb-8">
              <AdSenseDisplay slotType="download_top" />
            </div>

            {/* Download Timer Card */}
            <DownloadTimer
              fileId={fileId}
              countryCode={countryCode}
              fileName={file.file_name}
              fileSize={file.file_size}
              fileType={file.file_type}
              viewsCount={file.views_count ?? 0}
              downloadCount={file.download_count ?? 0}
            />

            {/* Rich Content Section - AdSense Compliant */}
            <DownloadPageContent
              fileName={file.file_name}
              fileSize={file.file_size}
              itemTitle={item?.title || 'ملف تعليمي'}
              itemType={type || 'article'}
              subjectName={item?.subject?.name}
              backLink={backLink}
            />

          </div>

          {/* Sidebar (4 cols) */}
          <div className="lg:col-span-4 space-y-6">

            {/* Sidebar Ad - إعلان 2 */}
            <div className="sticky top-6">
              <AdSenseDisplay slotType="download_sidebar" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
