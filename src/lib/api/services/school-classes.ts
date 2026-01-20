import { apiClient } from '../client';
import { API_ENDPOINTS } from '../config';
import type { SchoolClass } from '@/types';

interface SchoolClassFormData {
  country_id: string;
  grade_name: string;
  grade_level: number;
}

export const schoolClassesService = {
  /**
   * Get all school classes for a country
   */
  async getAll(country_id: string = '1'): Promise<SchoolClass[]> {
    const response = await apiClient.get<{ data: SchoolClass[] }>(
      API_ENDPOINTS.SCHOOL_CLASSES.LIST,
      { country_id }
    );
    return (response.data as any).data ?? (response.data as any);
  },

  /**
   * Get all public school classes (Frontend)
   */
  async getPublicAll(country_id: string = '1'): Promise<SchoolClass[]> {
    const response = await apiClient.get<{ data: SchoolClass[] }>(
      API_ENDPOINTS.FRONTEND.CLASSES,
      { country_id }
    );
    return (response.data as any).data ?? (response.data as any);
  },

  /**
   * Get single school class by ID
   */
  async getById(id: number | string, country_id: string = '1'): Promise<SchoolClass> {
    const response = await apiClient.get<{ data: SchoolClass }>(
      API_ENDPOINTS.SCHOOL_CLASSES.SHOW(id),
      { country_id }
    );
    return (response.data as any).data ?? (response.data as any);
  },

  /**
   * Get public school class details (Frontend)
   */
  async getPublicById(id: number | string, country_id: string = '1'): Promise<SchoolClass> {
    const response = await apiClient.get<{ data: SchoolClass }>(
      API_ENDPOINTS.FRONTEND.CLASS_DETAILS(id),
      { country_id }
    );
    return (response.data as any).data ?? (response.data as any);
  },

  /**
   * Create new school class
   */
  async create(data: SchoolClassFormData): Promise<SchoolClass> {
    const response = await apiClient.post<{ data: SchoolClass }>(
      API_ENDPOINTS.SCHOOL_CLASSES.STORE,
      data
    );
    return (response.data as any).data ?? (response.data as any);
  },

  /**
   * Update school class
   */
  async update(id: number | string, data: SchoolClassFormData): Promise<SchoolClass> {
    const response = await apiClient.put<{ data: SchoolClass }>(
      API_ENDPOINTS.SCHOOL_CLASSES.UPDATE(id),
      data
    );
    return (response.data as any).data ?? (response.data as any);
  },

  /**
   * Delete school class
   */
  async delete(id: number | string, country_id: string = '1'): Promise<{ message: string }> {
    const response = await apiClient.delete(API_ENDPOINTS.SCHOOL_CLASSES.DELETE(id), { country_id });
    return { message: response.message || 'Deleted successfully' };
  },
};

export default schoolClassesService;
