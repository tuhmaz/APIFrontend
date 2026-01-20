import { apiClient } from '../client';
import { API_ENDPOINTS } from '../config';
import type { User, LoginCredentials, RegisterData, AuthResponse } from '@/types';

export const authService = {
  /**
   * Login user with credentials
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse | { data: AuthResponse }>(
      API_ENDPOINTS.AUTH.LOGIN,
      credentials
    );
    const payload = 'data' in response.data ? (response.data as { data: AuthResponse }).data : (response.data as AuthResponse);
    if (payload.token) {
      apiClient.setToken(payload.token);
    }
    return payload;
  },

  /**
   * Register new user
   */
  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse | { data: AuthResponse }>(
      API_ENDPOINTS.AUTH.REGISTER,
      data
    );
    const payload = 'data' in response.data ? (response.data as { data: AuthResponse }).data : (response.data as AuthResponse);
    if (payload.token) {
      apiClient.setToken(payload.token);
    }
    return payload;
  },

  /**
   * Logout current user
   */
  async logout(): Promise<void> {
    await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT);
    apiClient.setToken(null);
  },

  /**
   * Get current authenticated user
   */
  async me(): Promise<User> {
    const response = await apiClient.get<{ data: { user: User } } | { user: User }>(
      '/auth/user',
      undefined,
      { cache: 'no-store' }
    );

    if ('data' in response.data && response.data.data && 'user' in response.data.data) {
      return response.data.data.user;
    }

    if ('user' in response.data) {
      return (response.data as { user: User }).user;
    }

    throw new Error('Invalid response format');
  },

  /**
   * Update current user's profile (doesn't require admin permissions)
   */
  async updateProfile(data: {
    name?: string;
    email?: string;
    phone?: string;
    bio?: string;
    profile_photo?: File;
    job_title?: string;
    gender?: string;
    country?: string;
    password?: string;
    password_confirmation?: string;
    social_links?: Record<string, string>;
  }): Promise<User> {
    const formData = new FormData();
    formData.append('_method', 'PUT');

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (value instanceof File) {
          formData.append(key, value);
        } else if (key === 'social_links' && typeof value === 'object') {
          Object.entries(value).forEach(([k, v]) => {
            formData.append(`social_links[${k}]`, String(v || ''));
          });
        } else {
          formData.append(key, String(value));
        }
      }
    });

    const response = await apiClient.upload<{ data: User } | User>(
      '/auth/profile',
      formData
    );
    return 'data' in response.data ? response.data.data : response.data;
  },

  /**
   * Send forgot password email
   */
  async forgotPassword(email: string): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string } | { data: { message: string } }>(
      API_ENDPOINTS.AUTH.FORGOT_PASSWORD,
      { email }
    );
    return 'data' in response.data ? response.data.data : response.data;
  },

  /**
   * Reset password with token
   */
  async resetPassword(data: {
    token: string;
    email: string;
    password: string;
    password_confirmation: string;
  }): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string } | { data: { message: string } }>(
      API_ENDPOINTS.AUTH.RESET_PASSWORD,
      data
    );
    return 'data' in response.data ? response.data.data : response.data;
  },

  /**
   * Verify email with link parameters
   */
  async verifyEmail(id: string, hash: string): Promise<{ message: string }> {
    const response = await apiClient.get<{ message: string } | { data: { message: string } }>(
      API_ENDPOINTS.AUTH.VERIFY_EMAIL(id, hash)
    );
    return 'data' in response.data ? response.data.data : response.data;
  },

  /**
   * Resend verification email
   */
  async resendVerifyEmail(): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string } | { data: { message: string } }>(
      API_ENDPOINTS.AUTH.RESEND_VERIFY
    );
    return 'data' in response.data ? response.data.data : response.data;
  },

  /**
   * Get Google OAuth redirect URL
   */
  getGoogleRedirectUrl(): string {
    return `${API_ENDPOINTS.AUTH.GOOGLE_REDIRECT}`;
  },

  /**
   * Handle Google OAuth callback
   */
  async handleGoogleCallback(code: string): Promise<AuthResponse> {
    const response = await apiClient.get<AuthResponse | { data: AuthResponse }>(
      API_ENDPOINTS.AUTH.GOOGLE_CALLBACK,
      { code }
    );
    const payload = 'data' in response.data ? (response.data as { data: AuthResponse }).data : (response.data as AuthResponse);
    if (payload.token) {
      apiClient.setToken(payload.token);
    }
    return payload;
  },
};

export default authService;
