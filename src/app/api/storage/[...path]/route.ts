import { NextRequest, NextResponse } from 'next/server';
import { API_CONFIG } from '@/lib/api/config';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const token = request.cookies.get('token')?.value;

  const base = API_CONFIG.BASE_URL;
  const backendRoot = /\/api\/?$/.test(base) ? base.replace(/\/api\/?$/, '') : base;

  const requestedPath = `/${(path || []).join('/')}`;
  const backendPath = requestedPath.startsWith('/storage/')
    ? requestedPath
    : `/storage${requestedPath}`;

  const backendUrl = new URL(`${backendRoot}${backendPath}`);
  request.nextUrl.searchParams.forEach((value, key) => {
    backendUrl.searchParams.append(key, value);
  });

  const headers: HeadersInit = {
    Accept: '*/*',
    'X-Requested-With': 'XMLHttpRequest',
  };

  const apiKey = process.env.NEXT_PUBLIC_FRONTEND_API_KEY;
  if (apiKey) {
    (headers as Record<string, string>)['X-Frontend-Key'] = apiKey;
  }

  if (token) {
    (headers as Record<string, string>).Authorization = `Bearer ${token}`;
  }

  const resp = await fetch(backendUrl.toString(), {
    method: 'GET',
    headers,
    cache: 'no-store',
  });

  const outHeaders = new Headers();
  const contentType = resp.headers.get('content-type');
  if (contentType) outHeaders.set('content-type', contentType);

  const contentDisposition = resp.headers.get('content-disposition');
  if (contentDisposition) outHeaders.set('content-disposition', contentDisposition);

  return new NextResponse(resp.body, {
    status: resp.status,
    headers: outHeaders,
  });
}

