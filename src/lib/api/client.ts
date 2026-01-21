import { API_CONFIG } from './config';

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

interface ApiResponse<T> {
  data: T;
  message?: string;
  status: number;
  success: boolean;
}

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private cacheTimeout = 300000; // 5 minutes cache (300000ms)
  private requestTimeout = 15000; // 15 seconds timeout
  private maxRetries = 3; // Maximum retry attempts
  private retryDelay = 1000; // Base delay between retries (ms)

  constructor() {
    this.baseUrl = API_CONFIG.BASE_URL;
    if (!/^https?:\/\//i.test(this.baseUrl)) {
      this.baseUrl = 'http://localhost:8000/api';
    }
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('token');
    }
  }

  // Fetch with timeout
  private async fetchWithTimeout(
    url: string,
    options: RequestInit,
    timeout: number = this.requestTimeout
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

  // Retry logic with exponential backoff
  private async fetchWithRetry(
    url: string,
    options: RequestInit,
    retries: number = this.maxRetries
  ): Promise<Response> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await this.fetchWithTimeout(url, options);
        return response;
      } catch (error: any) {
        lastError = error;

        // Don't retry on abort (user cancelled) or non-network errors
        if (error.name === 'AbortError') {
          // Timeout - worth retrying
          console.warn(`Request timeout (attempt ${attempt + 1}/${retries + 1}): ${url}`);
        } else if (error.message?.includes('fetch failed') || error.message?.includes('ECONNRESET')) {
          // Network error - worth retrying
          console.warn(`Network error (attempt ${attempt + 1}/${retries + 1}): ${url}`);
        } else {
          // Other errors - don't retry
          throw error;
        }

        // Don't wait after the last attempt
        if (attempt < retries) {
          // Exponential backoff with jitter
          const delay = this.retryDelay * Math.pow(2, attempt) + Math.random() * 500;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // All retries failed
    throw lastError || new Error('Request failed after retries');
  }

  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('token', token);
        document.cookie = `token=${token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
      } else {
        localStorage.removeItem('token');
        document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      }
    }
  }

  getToken(): string | null {
    if (typeof window !== 'undefined' && !this.token) {
      this.token = localStorage.getItem('token');
    }
    return this.token;
  }

  private buildUrl(endpoint: string, params?: Record<string, string | number | boolean | undefined>): string {
    // Handle dynamic endpoints that already contain parameters in the path
    let finalEndpoint = endpoint;
    
    if (params) {
      // Replace path parameters first (e.g., :id, {id})
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && finalEndpoint.includes(`:${key}`)) {
          finalEndpoint = finalEndpoint.replace(`:${key}`, String(value));
        } else if (value !== undefined && finalEndpoint.includes(`{${key}}`)) {
          finalEndpoint = finalEndpoint.replace(`{${key}}`, String(value));
        }
      });
      
      // Then add remaining params as query parameters
      const url = new URL(`${this.baseUrl}${finalEndpoint}`);
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && !finalEndpoint.includes(`:${key}`) && !finalEndpoint.includes(`{${key}}`)) {
          url.searchParams.append(key, String(value));
        }
      });
      return url.toString();
    }
    
    return `${this.baseUrl}${finalEndpoint}`;
  }

  private sanitizeReturnPath(path: string): string | null {
    if (!path) return null;
    if (!path.startsWith('/')) return null;

    const blocked = ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email'];
    for (const p of blocked) {
      if (path === p || path.startsWith(`${p}?`) || path.startsWith(`${p}/`)) {
        return null;
      }
    }

    if (path.length > 800) return path.slice(0, 800);
    return path;
  }

  private handleUnauthorizedRedirect() {
    this.setToken(null);

    if (typeof window === 'undefined') return;

    const currentPath = window.location.pathname;
    if (!currentPath.startsWith('/dashboard')) return;

    const ret = this.sanitizeReturnPath(window.location.pathname + window.location.search);
    window.location.href = ret ? `/login?return=${encodeURIComponent(ret)}` : '/login';
  }

  private async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const { params, ...fetchOptions } = options;
    const url = this.buildUrl(endpoint, params);

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-App-Locale': 'ar',
      'X-Requested-With': 'XMLHttpRequest',
      ...(options.headers || {}),
    };

    // Add Frontend API Key if available
    const frontendApiKey = process.env.NEXT_PUBLIC_FRONTEND_API_KEY;
    if (frontendApiKey) {
      (headers as Record<string, string>)['X-Frontend-Key'] = frontendApiKey;
    }

    // Add Country Header
    if (typeof window !== 'undefined') {
      try {
        const countryStorage = localStorage.getItem('country-storage');
        if (countryStorage) {
          const { state } = JSON.parse(countryStorage);
          if (state?.country?.id) {
            (headers as Record<string, string>)['X-Country-Id'] = state.country.id;
            (headers as Record<string, string>)['X-Country-Code'] = state.country.code;
          }
        }
      } catch {
        // Fallback or ignore
      }
    }

    const token = this.getToken();
    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    // Use Next.js cache for server-side GET requests without auth
    const isServerSide = typeof window === 'undefined';
    const isGetRequest = !fetchOptions.method || fetchOptions.method === 'GET';
    const fetchConfig: RequestInit & { next?: { revalidate?: number | false } } = {
      ...fetchOptions,
      headers,
    };

    // Enable Next.js caching for public GET requests on server
    if (isServerSide && isGetRequest && !token) {
      // Only add default revalidate if no cache control is specified
      if (fetchConfig.cache !== 'no-store' && fetchConfig.cache !== 'no-cache' && !fetchConfig.next) {
        fetchConfig.next = { revalidate: 60 }; // Cache for 60 seconds
      }
    }

    try {
      // Use retry mechanism for better reliability
      const response = await this.fetchWithRetry(url, fetchConfig);

      let data: any;
      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (!response.ok) {
        if (response.status === 401) {
          this.handleUnauthorizedRedirect();
        }
        const err = new Error((data && data.message) || 'حدث خطأ ما');
        (err as any).status = response.status;
        (err as any).errors = data ? data.errors : null;
        throw err;
      }

      return {
        data,
        status: response.status,
        success: true,
      };
    } catch (error: any) {
      if (error && (error as any).status) {
        throw error as any;
      }
      // More descriptive error message
      const err = new Error(
        error.name === 'AbortError'
          ? 'انتهت مهلة الاتصال - يرجى المحاولة مرة أخرى'
          : 'خطأ في الاتصال بالخادم'
      );
      (err as any).status = 500;
      (err as any).errors = null;
      throw err;
    }
  }

  private getCacheKey(endpoint: string, params?: Record<string, any>): string {
    return `${endpoint}${params ? JSON.stringify(params) : ''}`;
  }

  private getFromCache<T>(key: string): ApiResponse<T> | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > this.cacheTimeout) {
      this.cache.delete(key);
      return null;
    }

    return cached.data as ApiResponse<T>;
  }

  private setCache<T>(key: string, data: ApiResponse<T>): void {
    this.cache.set(key, { data, timestamp: Date.now() });

    // Clear old cache entries (keep only last 100)
    if (this.cache.size > 100) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
  }

  async get<T>(endpoint: string, params?: Record<string, string | number | boolean | undefined>, options?: Omit<RequestOptions, 'method' | 'params'>) {
    // Check cache for GET requests
    const cacheKey = this.getCacheKey(endpoint, params);
    const cached = this.getFromCache<T>(cacheKey);

    // Return cached data if available and caching is not disabled
    if (cached && !options?.cache) {
      return cached;
    }

    const response = await this.request<T>(endpoint, { method: 'GET', params, ...options });

    // Cache successful GET requests
    this.setCache(cacheKey, response);

    return response;
  }

  async post<T>(endpoint: string, data?: any, options?: RequestOptions) {
    const response = await this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    });
    // Clear cache after mutations
    this.clearCache();
    return response;
  }

  async put<T>(endpoint: string, data?: any) {
    const response = await this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
    // Clear cache after mutations
    this.clearCache();
    return response;
  }

  async patch<T>(endpoint: string, data?: any) {
    const response = await this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
    // Clear cache after mutations
    this.clearCache();
    return response;
  }

  async delete<T>(endpoint: string, params?: Record<string, string | number | boolean | undefined>) {
    const response = await this.request<T>(endpoint, { method: 'DELETE', params });
    // Clear cache after successful delete operations
    this.clearCache();
    return response;
  }

  // Clear all cached data
  clearCache() {
    this.cache.clear();
  }

  // Upload file with FormData
  async upload<T>(endpoint: string, formData: FormData) {
    const url = this.buildUrl(endpoint);
    const headers: HeadersInit = {
      Accept: 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    };

    // Add Frontend API Key if available
    const frontendApiKey = process.env.NEXT_PUBLIC_FRONTEND_API_KEY;
    if (frontendApiKey) {
      (headers as Record<string, string>)['X-Frontend-Key'] = frontendApiKey;
    }

    const token = this.getToken();
    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    let response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers,
      body: formData,
    });

    let data: any = null;
    try {
      data = await response.json();
    } catch {}

    if (!response.ok) {
      if (response.status === 401) {
        this.handleUnauthorizedRedirect();
      }
      if (response.status === 404 && this.baseUrl.endsWith('/api')) {
        const altBase = this.baseUrl.slice(0, -4);
        const altUrl = new URL(`${altBase}${endpoint}`).toString();
        response = await fetch(altUrl, {
          method: 'POST',
          headers,
          body: formData,
        });
        try {
          data = await response.json();
        } catch {
          data = null;
        }
        if (!response.ok) {
          if (response.status === 401) {
            this.handleUnauthorizedRedirect();
          }
          const err = new Error((data && data.message) || 'حدث خطأ ما');
          (err as any).status = response.status;
          (err as any).errors = data ? data.errors : null;
          throw err;
        }
      } else {
        if (response.status === 401) {
          this.handleUnauthorizedRedirect();
        }
        const err = new Error((data && data.message) || 'حدث خطأ ما');
        (err as any).status = response.status;
        (err as any).errors = data ? data.errors : null;
        throw err;
      }
    }

    // Clear cache after successful upload
    this.clearCache();

    return {
      data,
      status: response.status,
      success: true,
    } as ApiResponse<T>;
  }
}

export const apiClient = new ApiClient();
export default apiClient;
