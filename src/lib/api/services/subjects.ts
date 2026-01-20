import { apiClient } from '../client';
import { API_ENDPOINTS } from '../config';
import type { Subject } from '@/types';

interface SubjectFormData {
  country: string;
  subject_name: string;
  grade_level: number;
}

export const subjectsService = {
  /**
   * Get all subjects for a country
   */
  async getAll(country: string = 'jordan'): Promise<Subject[]> {
    const response = await apiClient.get<{ data: Subject[] }>(
      API_ENDPOINTS.SUBJECTS.LIST,
      { country }
    );
    return (response.data as any).data ?? (response.data as any);
  },

  /**
   * Get single subject by ID
   */
  async getById(id: number | string, country: string = 'jordan'): Promise<Subject> {
    const response = await apiClient.get<{ data: Subject }>(
      API_ENDPOINTS.SUBJECTS.SHOW(id),
      { country }
    );
    return (response.data as any).data ?? (response.data as any);
  },

  /**
   * Create new subject
   */
  async create(data: SubjectFormData): Promise<Subject> {
    const response = await apiClient.post<{ data: Subject }>(
      API_ENDPOINTS.SUBJECTS.STORE,
      data
    );
    return (response.data as any).data ?? (response.data as any);
  },

  /**
   * Update subject
   */
  async update(id: number | string, data: SubjectFormData): Promise<Subject> {
    const response = await apiClient.put<{ data: Subject }>(
      API_ENDPOINTS.SUBJECTS.UPDATE(id),
      data
    );
    return (response.data as any).data ?? (response.data as any);
  },

  /**
   * Delete subject
   */
  async delete(id: number | string, country: string = 'jordan'): Promise<{ message: string }> {
    const response = await apiClient.delete(API_ENDPOINTS.SUBJECTS.DELETE(id), { country });
    return { message: response.message || 'Deleted successfully' };
  },
};

export default subjectsService;
