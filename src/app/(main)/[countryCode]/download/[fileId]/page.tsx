import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api/client';
import { postsService } from '@/lib/api/services';
import { API_ENDPOINTS } from '@/lib/api/config';
import { getStorageUrl, safeJsonLd } from '@/lib/utils';
import DownloadTimer from '@/components/download/DownloadTimer';
import AdSenseDisplay from '@/components/ads/AdSenseDisplay';
import RelatedArticles from '@/components/article/RelatedArticles';
import ClassHeader from '@/components/class/ClassHeader';
import { ChevronLeft, Home, FileText } from 'lucide-react';

interface Props {
  params: Promise<{
    countryCode: string;
    fileId: string;
  }>;
  searchParams: Promise<{
    articleId?: string;
    postId?: string;
  }>;
}

// Fetch article data
async function getArticle(id: string, countryCode: string) {
  try {
    const response = await apiClient.get<any>(
      API_ENDPOINTS.ARTICLES.SHOW_PUBLIC(id),
      { database: countryCode }
    );
    return response?.data?.data || null;
  } catch (err) {
    console.error('Error fetching article:', err);
    return null;
  }
}

// Fetch post data
async function getPost(id: string, countryCode: string) {
  try {
    return await postsService.getById(id, countryCode);
  } catch (err) {
    console.error('Error fetching post:', err);
    return null;
  }
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { countryCode, fileId } = await params;
  const { articleId, postId } = await searchParams;

  let title = 'تحميل الملف';
  let description = 'صفحة تحميل الملفات من منصة التعليم. روابط مباشرة وسريعة.';
  let ogImage = '/assets/img/front-pages/icons/articles_default_image.webp';
  
  let item: any = null;
  let file: any = null;

  if (articleId) {
    item = await getArticle(articleId, countryCode);
    file = item?.files?.find((f: any) => f.id == fileId);
  } else if (postId) {
    item = await getPost(postId, countryCode);
    file = item?.attachments?.find((f: any) => f.id == fileId);
  }
  
  const rawBaseUrl = (item?.site_url || item?.canonical_url || '').toString().trim();
  // Fallback: الهيدر العام لا يوفّر إعدادات هنا، لذا يمكن لاحقاً استخدام getPublicSettings إذا لزم الأمر
  let baseUrl: string | undefined;
  if (rawBaseUrl) {
    const withProtocol = /^https?:\/\//i.test(rawBaseUrl) ? rawBaseUrl : `https://${rawBaseUrl}`;
    try {
      const url = new URL(withProtocol);
      baseUrl = url.origin;
    } catch {
      baseUrl = undefined;
    }
  }

  if (file && item) {
    title = `تحميل ${file.file_name} - ${item.title}`;
    const subjectName = item.subject?.name ? `التابع لمادة ${item.subject.name}` : '';
    description = `تحميل ملف ${file.file_name} ${subjectName}. ${item.meta_description || ''}`;
    
    const rawImageUrl = item.image_url || item.image || ogImage;
    ogImage = rawImageUrl.startsWith('http')
      ? rawImageUrl
      : baseUrl
        ? `${baseUrl}${rawImageUrl.startsWith('/') ? '' : '/'}${rawImageUrl}`
        : rawImageUrl;
  }

  return {
    title: title,
    description: description,
    robots: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
    },
    openGraph: {
      title: title,
      description: description,
      images: [
        {
          url: ogImage,
          width: 800,
          height: 600,
          alt: title,
        }
      ],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: title,
      description: description,
      images: [ogImage],
    },
    alternates: {
      canonical: baseUrl ? `${baseUrl}/${countryCode}/download/${fileId}` : `/${countryCode}/download/${fileId}`,
    },
  };
}

export default async function DownloadPage({ params, searchParams }: Props) {
  const { countryCode, fileId } = await params;
  const { articleId, postId } = await searchParams;

  if (!articleId && !postId) {
    return notFound();
  }

  let item: any = null;
  let file: any = null;
  let type: 'article' | 'post' = 'article';

  if (articleId) {
    item = await getArticle(articleId, countryCode);
    if (item) {
       file = item.files?.find((f: any) => f.id == fileId);
       type = 'article';
    }
  } else if (postId) {
    item = await getPost(postId, countryCode);
    if (item) {
       file = item.attachments?.find((f: any) => f.id == fileId);
       type = 'post';
    }
  }
  
  if (!item || !file) {
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
              <Link
                href={`/${countryCode}/posts`}
                className="inline-flex items-center gap-2 border border-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <FileText size={18} />
                تصفح المقالات
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const rawBaseUrlRuntime = (item.site_url || item.canonical_url || '').toString().trim();
  let baseUrl: string | undefined;
  if (rawBaseUrlRuntime) {
    const withProtocol = /^https?:\/\//i.test(rawBaseUrlRuntime) ? rawBaseUrlRuntime : `https://${rawBaseUrlRuntime}`;
    try {
      const url = new URL(withProtocol);
      baseUrl = url.origin;
    } catch {
      baseUrl = undefined;
    }
  }

  // Schema.org Structured Data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `تحميل ${file.file_name}`,
    description: `صفحة تحميل الملف ${file.file_name} التابع لـ ${item.title}`,
    isPartOf: {
      '@type': 'WebSite',
      name: 'منصة التعليم',
      url: baseUrl ? `${baseUrl}/${countryCode}` : `/${countryCode}`
    },
    mainEntity: {
      '@type': 'DigitalDocument',
      name: file.file_name,
      fileFormat: file.mime_type || 'application/pdf',
      size: `${file.file_size} bytes`,
      url: type === 'post'
        ? getStorageUrl(file.file_url)
        : baseUrl
          ? `${baseUrl}/api/download/${fileId}?countryCode=${countryCode}`
          : `/api/download/${fileId}?countryCode=${countryCode}`,
      isBasedOn: {
        '@type': 'Article',
        headline: item.title,
        url: type === 'post'
          ? (baseUrl ? `${baseUrl}/${countryCode}/posts/${item.id}` : `/${countryCode}/posts/${item.id}`)
          : (baseUrl ? `${baseUrl}/${countryCode}/articles/${item.id}` : `/${countryCode}/articles/${item.id}`)
      }
    }
  };

  const backLink = type === 'post' 
    ? `/${countryCode}/posts/${item.id}`
    : `/${countryCode}/articles/${item.id}`;

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
            <li>
              <Link href={backLink} className="hover:text-blue-600 transition-colors">
                {item.title}
              </Link>
            </li>
            <li>
              <ChevronLeft size={16} className="text-gray-400" />
            </li>
            <li className="font-semibold text-blue-600" aria-current="page">
              تحميل الملف
            </li>
          </ol>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Content (8 cols) */}
          <div className="lg:col-span-8">

            {/* Top Ad - Compliant with Google AdSense Policy */}
            <div className="mb-8">
              <AdSenseDisplay slotType="download_1" className="w-full" />
            </div>

            {/* Download Timer Card */}
            <DownloadTimer
              fileId={fileId}
              countryCode={countryCode}
              fileName={file.file_name}
              fileSize={file.file_size}
              fileType={file.file_type}
              customDownloadUrl={type === 'post' ? getStorageUrl(file.file_url) : undefined}
            />

            {/* Context / Value Content (SEO Friendly) */}
            <div className="mt-8 bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
              <div className="flex items-start gap-4 mb-6">
                <div className="bg-blue-50 p-3 rounded-xl">
                  <FileText size={24} className="text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">حول هذا الملف</h3>
                  <p className="text-sm text-gray-500">معلومات تفصيلية عن الملف الذي ستقوم بتحميله</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">اسم الملف</p>
                  <p className="font-semibold text-gray-900">{file.file_name}</p>
                </div>
                
                {item.subject?.name && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500 mb-1">المادة</p>
                    <p className="font-semibold text-gray-900">{item.subject.name}</p>
                  </div>
                )}
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">حجم الملف</p>
                  <p className="font-semibold text-gray-900">
                    {file.file_size > 1024 * 1024 
                      ? `${(file.file_size / (1024 * 1024)).toFixed(1)} ميجابايت`
                      : `${(file.file_size / 1024).toFixed(1)} كيلوبايت`}
                  </p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">نوع المحتوى</p>
                  <p className="font-semibold text-gray-900">
                    {type === 'post' ? 'منشور' : 'مقال'}
                  </p>
                </div>
              </div>
              
              <div className="prose max-w-none text-gray-600 mb-6">
                <p className="text-sm leading-relaxed">
                  هذا الملف جزء من {type === 'post' ? 'المنشور' : 'المقال'} 
                  <Link href={backLink} className="text-blue-600 hover:underline font-medium mx-1">
                    {item.title}
                  </Link>
                  . نحن نسعى دائماً لتوفير أفضل المصادر التعليمية لضمان تجربة تعلم ممتازة.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-between items-center pt-4 border-t border-gray-100">
                <Link
                  href={backLink}
                  className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors text-sm"
                >
                  <ChevronLeft size={16} className="rtl:rotate-180" />
                  <span>العودة إلى {type === 'post' ? 'المنشور' : 'المقال'}</span>
                </Link>
                
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors text-sm"
                >
                  <Home size={16} />
                  <span>الصفحة الرئيسية</span>
                </Link>
              </div>
            </div>

            {/* Bottom Ad - Separated from content by meaningful spacing */}
            <div className="mt-12">
              <AdSenseDisplay slotType="download_2" className="w-full" />
            </div>
          </div>

          {/* Sidebar (4 cols) */}
          <div className="lg:col-span-4 space-y-6">

            {type === 'article' && item.related_articles && (
                <RelatedArticles
                  articles={item.related_articles}
                  countryCode={countryCode}
                />
            )}

            {/* Can add Related Posts if needed for posts */}

            {/* Sidebar Ad - Natural placement in sidebar */}
            <div className="sticky top-6">
              <AdSenseDisplay slotType="download_sidebar" className="w-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
