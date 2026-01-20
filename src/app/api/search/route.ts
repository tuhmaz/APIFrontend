import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { API_CONFIG } from '@/lib/api/config';

// واجهة نتيجة البحث
interface SearchResult {
  id: string;
  title: string;
  type: 'post' | 'article' | 'lesson';
  description?: string;
  url: string;
  date: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // استخراج معلمات البحث
    const classId = searchParams.get('class');
    const subjectId = searchParams.get('subject');
    const semester = searchParams.get('semester');
    const fileType = searchParams.get('type');
    const query = searchParams.get('q');
    const country = searchParams.get('country') || 'jo';

    // بناء معلمات الطلب للواجهة الخلفية
    const backendParams = new URLSearchParams();
    if (classId) backendParams.append('class_id', classId);
    if (subjectId) backendParams.append('subject_id', subjectId);
    if (semester) backendParams.append('semester_id', semester);
    if (fileType) backendParams.append('file_category', fileType);
    if (query) backendParams.append('q', query);
    if (country) backendParams.append('country', country);

    // محاولة الاتصال بالواجهة الخلفية
    try {
      const cookieStore = await cookies();
      const token = cookieStore.get('token')?.value;
      const headers: HeadersInit = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_CONFIG.BASE_URL}/articles?${backendParams.toString()}`, {
        headers,
        cache: 'no-store',
      });

      if (response.ok) {
        const data = await response.json();
        const articles = data.data || [];

        const results: SearchResult[] = articles.map((article: any) => {
          const type = mapCategoryToType(article.file_category);
          const pathSegment = type === 'post' ? 'posts' : 'articles';
          
          return {
            id: String(article.id),
            title: article.title,
            type: type,
            description: article.meta_description || article.description || extractExcerpt(article.content),
            url: `/${country}/${pathSegment}/${article.id}`,
            date: new Date(article.created_at).toLocaleDateString('ar-JO'),
          };
        });

        return NextResponse.json({
          success: true,
          results,
          total: data.meta?.total || results.length,
          filters: {
            class: classId,
            subject: subjectId,
            semester: semester,
            type: fileType,
            query: query
          }
        });
      }
    } catch (apiError) {
      console.warn('Backend API connection failed, falling back to mock data', apiError);
    }

    // ==========================================
    // Fallback: Mock Data (if API fails)
    // ==========================================
    
    // بيانات تجريبية للبحث
    const mockSearchData: SearchResult[] = [
      {
        id: '1',
        title: 'خطة دراسة الرياضيات للصف الأول - الفصل الأول',
        type: 'lesson',
        description: 'خطة دراسية شاملة لمادة الرياضيات للصف الأول الفصل الدراسي الأول',
        url: `/${country}/articles/1`,
        date: '2024-01-15'
      },
      {
        id: '2',
        title: 'تحليل محتوى اللغة العربية - الصف الأول',
        type: 'article',
        description: 'تحليل مفصل لمحتوى منهج اللغة العربية للصف الأول',
        url: `/${country}/articles/2`,
        date: '2024-01-12'
      },
      {
        id: '3',
        title: 'اختبار تقييمي للعلوم - الفصل الأول',
        type: 'post',
        description: 'اختبار شامل لمادة العلوم للفصل الدراسي الأول',
        url: `/${country}/posts/3`,
        date: '2024-01-08'
      },
      {
        id: '4',
        title: 'كتاب الرياضيات للصف الأول',
        type: 'lesson',
        description: 'الكتاب المدرسي لمادة الرياضيات كامل',
        url: `/${country}/articles/4`,
        date: '2024-01-05'
      },
      {
        id: '5',
        title: 'دوسية اللغة الإنجليزية',
        type: 'article',
        description: 'ملخص شامل لقواعد اللغة الإنجليزية',
        url: `/${country}/articles/5`,
        date: '2024-01-03'
      }
    ];

    // تصفية النتائج بناءً على المعلمات (Mock Logic)
    let filteredResults = mockSearchData;
    const qLower = query?.toLowerCase();

    if (classId) {
      filteredResults = filteredResults.filter(item => 
        item.title.includes(`الصف ${classId}`) || 
        item.description?.includes(`الصف ${classId}`)
      );
    }

    if (subjectId) {
        // Simple mapping for mock
        const subjectMap: Record<string, string> = { 'math': 'رياضيات', 'science': 'علوم', 'arabic': 'عربية', 'english': 'انجليزي' };
        const term = subjectMap[subjectId] || subjectId;
        filteredResults = filteredResults.filter(item => item.title.includes(term));
    }

    if (query) {
      filteredResults = filteredResults.filter(item =>
        item.title.toLowerCase().includes(qLower!) ||
        item.description?.toLowerCase().includes(qLower!)
      );
    }

    return NextResponse.json({
      success: true,
      results: filteredResults,
      total: filteredResults.length,
      filters: {
        class: classId,
        subject: subjectId,
        semester: semester,
        type: fileType,
        query: query
      }
    });

  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'حدث خطأ أثناء معالجة طلب البحث',
        results: []
      },
      { status: 500 }
    );
  }
}

function mapCategoryToType(category: string): 'post' | 'article' | 'lesson' {
  const map: Record<string, 'post' | 'article' | 'lesson'> = {
    'study_plan': 'lesson',
    'worksheet': 'lesson',
    'exam': 'lesson',
    'book': 'lesson',
    'record': 'article',
    'article': 'article',
    'post': 'post'
  };
  return map[category] || 'article';
}

function extractExcerpt(html?: string): string {
  if (!html) return '';
  return html.replace(/<[^>]+>/g, '').substring(0, 150) + '...';
}