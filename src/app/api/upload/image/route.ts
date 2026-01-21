import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { API_CONFIG, API_ENDPOINTS } from '@/lib/api/config';

export async function POST(req: Request) {
  try {
    const fd = await req.formData();
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
      console.log('[Upload] No token found in cookies');
      return NextResponse.json({ message: 'غير مصرح لك بالقيام بهذه العملية' }, { status: 401 });
    }

    // Build API base URL
    const base = API_CONFIG.BASE_URL;
    const hasApi = /\/api\/?$/.test(base);
    const primaryBase = hasApi ? base.replace(/\/api\/?$/, '') : base;
    const apiBase = hasApi ? base : `${base}/api`;

    const headers: HeadersInit = {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      'X-Requested-With': 'XMLHttpRequest',
    };

    const apiKey = process.env.NEXT_PUBLIC_FRONTEND_API_KEY;
    if (apiKey) {
      (headers as Record<string, string>)['X-Frontend-Key'] = apiKey;
    }

    // Try upload endpoint
    const uploadUrl = `${apiBase}${API_ENDPOINTS.FILES.UPLOAD}`;
    console.log('[Upload] Attempting upload to:', uploadUrl);

    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: fd,
      headers
    });

    let data: any = null;
    const contentType = response.headers.get('content-type');

    if (contentType?.includes('application/json')) {
      try {
        data = await response.json();
      } catch {
        console.error('[Upload] Failed to parse JSON response');
      }
    }

    if (!response.ok) {
      console.error('[Upload] Upload failed:', response.status, data);

      // Try alternative URL without /api prefix
      const altUrl = `${primaryBase}${API_ENDPOINTS.FILES.UPLOAD}`;
      if (altUrl !== uploadUrl) {
        console.log('[Upload] Trying alternative URL:', altUrl);
        const altResponse = await fetch(altUrl, { method: 'POST', body: fd, headers });

        if (altResponse.ok) {
          const altContentType = altResponse.headers.get('content-type');
          if (altContentType?.includes('application/json')) {
            data = await altResponse.json().catch(() => null);
          }
          return NextResponse.json(data ?? { success: true }, { status: 200 });
        }

        // Parse error from alt response
        const altErrorContentType = altResponse.headers.get('content-type');
        if (altErrorContentType?.includes('application/json')) {
          data = await altResponse.json().catch(() => data);
        }
      }

      return NextResponse.json(
        { message: data?.message || 'حدث خطأ أثناء رفع الصورة', errors: data?.errors },
        { status: response.status }
      );
    }

    console.log('[Upload] Upload successful');
    return NextResponse.json(data ?? { success: true }, { status: 200 });
  } catch (error) {
    console.error('[Upload] Server error:', error);
    return NextResponse.json({ message: 'خطأ في الاتصال بالخادم' }, { status: 500 });
  }
}
