import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { API_CONFIG, API_ENDPOINTS } from '@/lib/api/config';

export async function POST(req: Request) {
  try {
    const fd = await req.formData();
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
      return NextResponse.json({ message: 'غير مصرح لك بالقيام بهذه العملية' }, { status: 401 });
    }

    // Verify permissions
    const base = API_CONFIG.BASE_URL;
    const hasApi = /\/api\/?$/.test(base);
    const primaryBase = hasApi ? base.replace(/\/api\/?$/, '') : base;
    const userUrl = `${primaryBase}${API_ENDPOINTS.AUTH.ME}`;
    
    const permissionHeaders: HeadersInit = {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    };
    
    const apiKey = process.env.NEXT_PUBLIC_FRONTEND_API_KEY;
    if (apiKey) {
      (permissionHeaders as Record<string, string>)['X-Frontend-Key'] = apiKey;
    }

    try {
      const userRes = await fetch(userUrl, {
        headers: permissionHeaders
      });
      
      if (!userRes.ok) {
        return NextResponse.json({ message: 'فشل التحقق من الصلاحيات' }, { status: 401 });
      }
      
      const userData = await userRes.json();
      const user = userData.data || userData; // Handle potential wrapping
      
      const hasPermission = user.roles?.some((r: any) => ['admin', 'super_admin'].includes(r.name)) || 
                            user.permissions?.some((p: any) => p.name === 'manage files');
                            
      if (!hasPermission) {
        return NextResponse.json({ message: 'ليس لديك صلاحية رفع الملفات' }, { status: 403 });
      }
    } catch (e) {
      console.error('Permission check failed:', e);
      return NextResponse.json({ message: 'خطأ في التحقق من الصلاحيات' }, { status: 500 });
    }

    const headers: HeadersInit = { 
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      'X-Requested-With': 'XMLHttpRequest',
    };

    if (apiKey) {
      (headers as Record<string, string>)['X-Frontend-Key'] = apiKey;
    }

    const altBase = hasApi ? base : `${base}/api`;

    const url1 = `${primaryBase}${API_ENDPOINTS.FILES.UPLOAD}`;
    let r = await fetch(url1, { method: 'POST', body: fd, headers });
    let data: any = null;
    try {
      data = await r.json();
    } catch {}

    if (!r.ok) {
      const url2 = `${altBase}${API_ENDPOINTS.FILES.UPLOAD}`;
      r = await fetch(url2, { method: 'POST', body: fd, headers });
      try {
        data = await r.json();
      } catch {}
      if (!r.ok) {
        return NextResponse.json(
          { message: (data && data.message) || 'حدث خطأ ما', errors: data ? data.errors : null },
          { status: r.status }
        );
      }
    }

    return NextResponse.json(data ?? { success: true }, { status: 200 });
  } catch {
    return NextResponse.json({ message: 'خطأ في الاتصال بالخادم' }, { status: 500 });
  }
}
