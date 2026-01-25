import 'server-only';

import { cache } from 'react';
import { ssrFetch, getSSRHeaders } from '@/lib/api/ssr-fetch';
import { API_CONFIG } from '@/lib/api/config';

export type FrontSettings = Record<string, string | null>;

const parseSettings = (json: any): FrontSettings => {
  const body = json?.data ?? json;
  const settings = body?.settings ?? body?.data ?? body;
  if (settings && typeof settings === 'object') return settings as FrontSettings;
  return {};
};

/**
 * Public settings (logo, site config, ads flags...)
 * Cached/deduped per request via React cache().
 */
export const getFrontSettings = cache(async (): Promise<FrontSettings> => {
  const baseUrl = API_CONFIG.BASE_URL.replace(/\/+$/, '');
  try {
    const res = await ssrFetch(`${baseUrl}/front/settings`, {
      next: { revalidate: 300 },
      headers: getSSRHeaders(),
    });
    if (!res.ok) return {};
    const json = await res.json().catch(() => null);
    return parseSettings(json);
  } catch {
    return {};
  }
});

