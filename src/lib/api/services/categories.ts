import { apiClient } from '../client';
import { API_ENDPOINTS } from '../config';
import type { Category, PaginatedResponse } from '@/types';

interface CategoryFilters {
  country?: string;
  page?: number;
  per_page?: number;
  search?: string;
  is_active?: boolean;
  [key: string]: string | number | boolean | undefined;
}

interface CategoryFormData {
  country: string;
  name: string;
  parent_id?: number;
  icon_image?: File;
  image?: File;
  is_active?: boolean;
  icon?: string;
}

export const categoriesService = {
  /**
   * Get all categories with optional filters
   */
  async getAll(filters?: CategoryFilters, options?: RequestInit): Promise<unknown> {
    try {
      const response = await apiClient.get<{ data: PaginatedResponse<Category> } | Category[] | PaginatedResponse<Category>>(
        API_ENDPOINTS.CATEGORIES.LIST,
        filters,
        options
      );
      return response.data;
    } catch (e: any) {
      if (e && e.status === 404) {
        const response2 = await apiClient.get<{ data: PaginatedResponse<Category> } | Category[] | PaginatedResponse<Category>>(
          '/dashboard/categories',
          filters,
          options
        );
        return response2.data;
      }
      throw e;
    }
  },

  /**
   * Get single category by ID
   */
  async getById(id: number | string, country: string = '1'): Promise<Category> {
    try {
      const response = await apiClient.get<{ data: Category } | Category>(
        API_ENDPOINTS.CATEGORIES.SHOW(id),
        { country }
      );
      return (response.data as any).data ?? (response.data as any);
    } catch (e: any) {
      if (e && e.status === 404) {
        const response2 = await apiClient.get<{ data: Category } | Category>(
          `/dashboard/categories/${id}`,
          { country }
        );
        return (response2.data as any).data ?? (response2.data as any);
      }
      throw e;
    }
  },

  /**
   * Create new category
   */
  async create(data: CategoryFormData): Promise<Category> {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (value instanceof File) {
          formData.append(key, value);
        } else if (typeof value === 'boolean') {
          formData.append(key, value ? '1' : '0');
        } else {
          formData.append(key, String(value));
        }
      }
    });

    try {
      const response = await apiClient.upload<{ data: Category } | Category>(
        API_ENDPOINTS.CATEGORIES.STORE,
        formData
      );
      return (response.data as any).data ?? (response.data as any);
    } catch (e: any) {
      if (e && e.status === 404) {
        const response2 = await apiClient.upload<{ data: Category } | Category>(
          '/dashboard/categories',
          formData
        );
        return (response2.data as any).data ?? (response2.data as any);
      }
      throw e;
    }
  },

  /**
   * Update existing category
   */
  async update(id: number | string, data: Partial<CategoryFormData>): Promise<Category> {
    const formData = new FormData();
    // formData.append('_method', 'PUT'); // Removed because the route is POST

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (value instanceof File) {
          formData.append(key, value);
        } else if (typeof value === 'boolean') {
          formData.append(key, value ? '1' : '0');
        } else {
          formData.append(key, String(value));
        }
      }
    });

    try {
      const response = await apiClient.upload<{ data: Category } | Category>(
        API_ENDPOINTS.CATEGORIES.UPDATE(id),
        formData
      );
      return (response.data as any).data ?? (response.data as any);
    } catch (e: any) {
      if (e && e.status === 404) {
        const response2 = await apiClient.upload<{ data: Category } | Category>(
          `/dashboard/categories/${id}`,
          formData
        );
        return (response2.data as any).data ?? (response2.data as any);
      }
      throw e;
    }
  },
  
  /**
   * Delete category
   */
  async delete(id: number | string, country: string = '1'): Promise<{ message: string }> {
    try {
      const resp = await apiClient.delete<{ message: string }>(API_ENDPOINTS.CATEGORIES.DELETE(id), { country });
      return (resp.data as any).data ?? (resp.data as any) ?? { message: 'تم الحذف بنجاح' };
    } catch (e: any) {
      if (e && e.status === 404) {
        const resp2 = await apiClient.delete<{ message: string }>(`/dashboard/categories/${id}`, { country });
        return (resp2.data as any).data ?? (resp2.data as any) ?? { message: 'تم الحذف بنجاح' };
      }
      throw e;
    }
  },

  /**
   * Toggle category active status
   */
  async toggle(id: number | string, country: string = '1'): Promise<Category> {
    try {
      const response = await apiClient.post<{ data: Category } | Category>(
        API_ENDPOINTS.CATEGORIES.TOGGLE(id),
        { country }
      );
      return (response.data as any).data ?? (response.data as any);
    } catch (e: any) {
      if (e && e.status === 404) {
        const response2 = await apiClient.post<{ data: Category } | Category>(
          `/dashboard/categories/${id}/toggle`,
          { country }
        );
        return (response2.data as any).data ?? (response2.data as any);
      }
      throw e;
    }
  },
};

export default categoriesService;
