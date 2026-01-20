import { apiClient } from '../client';
import { API_ENDPOINTS } from '../config';
import type { Post, PaginatedResponse } from '@/types';

type PostFilters = Record<string, string | number | boolean | undefined> & {
  country?: string;
  search?: string;
  page?: number;
  per_page?: number;
  category_id?: number | string;
  is_featured?: boolean | number;
  sort_by?: string;
  sort_dir?: 'asc' | 'desc';
};

interface PostFormData {
  country: string;
  title: string;
  content: string;
  category_id: number;
  meta_description?: string;
  keywords?: string;
  is_active?: boolean;
  is_featured?: boolean;
  image?: File;
  attachments?: File[];
}

export const postsService = {
  /**
   * Get paginated posts list
   */
  async getAll(filters?: PostFilters, options?: RequestInit): Promise<PaginatedResponse<Post>> {
    const response = await apiClient.get<PaginatedResponse<Post>>(
      API_ENDPOINTS.POSTS.LIST,
      filters,
      options
    );
    return response as any;
  },

  /**
   * Get single post by ID
   */
  async getById(id: number | string, country: string = '1'): Promise<Post> {
    const response = await apiClient.get<{ data: Post }>(
      API_ENDPOINTS.POSTS.SHOW(id),
      { country }
    );
    // apiClient unwraps the response if it has a 'data' property
    // But we need to be careful about the type.
    return (response.data as any).data || response.data;
  },

  /**
   * Create new post with file upload
   */
  async create(data: PostFormData): Promise<Post> {
    const formData = new FormData();

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (key === 'attachments' && Array.isArray(value)) {
          value.forEach((file: File) => {
            formData.append('attachments[]', file);
          });
        } else if (value instanceof File) {
          formData.append(key, value);
        } else if (key === 'image' && typeof value === 'string') {
          // Skip sending image URL string
        } else if (typeof value === 'boolean') {
          formData.append(key, value ? '1' : '0');
        } else {
          formData.append(key, String(value));
        }
      }
    });

    const response = await apiClient.upload<{ data: Post }>(
      API_ENDPOINTS.POSTS.STORE,
      formData
    );
    return (response.data as any).data || response.data;
  },

  /**
   * Update existing post
   */
  async update(id: number | string, data: Partial<PostFormData>): Promise<Post> {
    const formData = new FormData();
    // The route is defined as POST in api.php, so we don't need _method=PUT
    // formData.append('_method', 'PUT');

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (key === 'attachments' && Array.isArray(value)) {
          value.forEach((file: File) => {
            formData.append('attachments[]', file);
          });
        } else if (value instanceof File) {
          formData.append(key, value);
        } else if (typeof value === 'boolean') {
          formData.append(key, value ? '1' : '0');
        } else {
          formData.append(key, String(value));
        }
      }
    });

    const response = await apiClient.upload<{ data: Post }>(
      API_ENDPOINTS.POSTS.UPDATE(id),
      formData
    );
    return (response.data as any).data || response.data;
  },

  /**
   * Toggle post status
   */
  async toggleStatus(id: number | string, country: string = '1'): Promise<boolean> {
    const response = await apiClient.post<{ success: boolean; is_active: boolean }>(
      API_ENDPOINTS.POSTS.TOGGLE_STATUS(id),
      { country }
    );
    return response.data.is_active;
  },

  /**
   * Delete post
   */
  async delete(id: number | string, country: string = '1'): Promise<{ message: string }> {
    const response = await apiClient.delete<{ message: string } | { data: { message: string } }>(
      API_ENDPOINTS.POSTS.DELETE(id),
      { country }
    );
    return 'data' in response.data ? response.data.data : response.data;
  },
};

export default postsService;
