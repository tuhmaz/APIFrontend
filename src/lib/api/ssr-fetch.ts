/**
 * SSR Fetch Utility with Timeout and Retry
 * Provides reliable server-side data fetching with automatic retries
 * Uses internal API URL for faster server-to-server communication
 */

import { API_CONFIG, getApiHostname } from './config';

const SSR_CONFIG = {
  timeout: 10000, // 10 seconds timeout
  maxRetries: 3,
  retryDelay: 500, // Base delay in ms
};

/**
 * Generate unique request ID for tracing
 */
function generateRequestId(): string {
  return `ssr_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Log SSR request/response for debugging (works in both dev and production)
 */
function logSSR(level: 'info' | 'warn' | 'error', message: string, data?: Record<string, any>) {
  const timestamp = new Date().toISOString();
  const logData = { timestamp, ...data };

  // Always log errors, only log info/warn in development
  if (level === 'error' || process.env.NODE_ENV === 'development') {
    console[level](`[SSR] ${message}`, JSON.stringify(logData));
  }
}

/**
 * Get the internal API base URL for SSR requests
 * This uses localhost connection for faster performance
 */
export function getInternalApiUrl(): string {
  return API_CONFIG.INTERNAL_URL;
}

/**
 * Convert a public API URL to internal URL for SSR
 * Example: https://api.example.com/api/users -> http://127.0.0.1:8000/api/users
 */
export function toInternalUrl(url: string): string {
  const publicUrl = API_CONFIG.BASE_URL;
  const internalUrl = API_CONFIG.INTERNAL_URL;

  // If URL starts with public API URL, replace with internal
  if (url.startsWith(publicUrl)) {
    return url.replace(publicUrl, internalUrl);
  }

  // If URL is a relative path starting with /api, prepend internal URL
  if (url.startsWith('/api')) {
    // Remove /api from internal URL if it already has it
    const baseInternal = internalUrl.replace(/\/api\/?$/, '');
    return `${baseInternal}${url}`;
  }

  return url;
}

/**
 * Get common headers for SSR requests
 * Includes Host header for internal requests so Nginx knows which vhost to use
 */
export function getSSRHeaders(countryId?: string): HeadersInit {
  const headers: HeadersInit = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  };

  const apiKey = process.env.NEXT_PUBLIC_FRONTEND_API_KEY;
  if (apiKey) {
    (headers as Record<string, string>)['X-Frontend-Key'] = apiKey;
  }

  if (countryId) {
    (headers as Record<string, string>)['X-Country-Id'] = countryId;
  }

  // Add Host header for internal requests (Nginx needs this to route to correct vhost)
  (headers as Record<string, string>)['Host'] = getApiHostname();

  return headers;
}

/**
 * Fetch with timeout
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeout: number = SSR_CONFIG.timeout
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * SSR Fetch with retry logic and timeout
 */
export async function ssrFetch(
  url: string,
  options: RequestInit & { next?: { revalidate?: number | false } } = {},
  config?: Partial<typeof SSR_CONFIG>
): Promise<Response> {
  const { timeout, maxRetries, retryDelay } = { ...SSR_CONFIG, ...config };
  const requestId = generateRequestId();
  let lastError: Error | null = null;
  const startTime = Date.now();

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, options, timeout);

      // Log successful request with timing
      logSSR('info', 'Request completed', {
        requestId,
        url,
        status: response.status,
        attempt: attempt + 1,
        duration: Date.now() - startTime,
      });

      return response;
    } catch (error: any) {
      lastError = error;

      // Only retry on network errors or timeouts
      const isRetryable =
        error.name === 'AbortError' ||
        error.message?.includes('fetch failed') ||
        error.message?.includes('ECONNRESET') ||
        error.message?.includes('ECONNREFUSED') ||
        error.message?.includes('ETIMEDOUT');

      // Log retry attempt
      logSSR('warn', `Request failed, ${isRetryable ? 'retrying' : 'not retryable'}`, {
        requestId,
        url,
        attempt: attempt + 1,
        maxRetries: maxRetries + 1,
        error: error.message,
        errorName: error.name,
        isRetryable,
      });

      if (!isRetryable) {
        throw error;
      }

      // Don't wait after the last attempt
      if (attempt < maxRetries) {
        const delay = retryDelay * Math.pow(2, attempt) + Math.random() * 200;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // Log final failure
  logSSR('error', 'Request failed after all retries', {
    requestId,
    url,
    totalAttempts: maxRetries + 1,
    duration: Date.now() - startTime,
    lastError: lastError?.message,
  });

  throw lastError || new Error('SSR fetch failed after retries');
}

/**
 * SSR Fetch JSON data with error handling
 * Returns defaultValue on error instead of throwing
 */
export async function ssrFetchJson<T>(
  url: string,
  options: RequestInit & { next?: { revalidate?: number | false } } = {},
  defaultValue: T
): Promise<T> {
  const requestId = generateRequestId();

  try {
    const response = await ssrFetch(url, {
      ...options,
      headers: {
        ...getSSRHeaders(),
        ...options.headers,
      },
    });

    if (!response.ok) {
      logSSR('error', 'HTTP error response', {
        requestId,
        url,
        status: response.status,
        statusText: response.statusText,
      });
      return defaultValue;
    }

    const json = await response.json();

    // Log successful data fetch
    logSSR('info', 'JSON data fetched', {
      requestId,
      url,
      hasData: !!json?.data,
      dataType: typeof (json?.data ?? json),
    });

    return json?.data ?? json ?? defaultValue;
  } catch (error: any) {
    logSSR('error', 'Failed to fetch JSON', {
      requestId,
      url,
      error: error.message,
      defaultValueUsed: true,
    });
    return defaultValue;
  }
}
