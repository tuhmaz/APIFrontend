import { apiClient } from '../client';
import { API_ENDPOINTS } from '../config';
import type { Semester } from '@/types';

interface SemesterFormData {
  country: string;
  semester_name: string;
  grade_level: number;
}

export const semestersService = {
  /**
   * Get all semesters for a country
   */
  async getAll(country: string = 'jordan'): Promise<Semester[]> {
    const response = await apiClient.get<{ data: Semester[] }>(
      API_ENDPOINTS.SEMESTERS.LIST,
      { country }
    );
    return (response.data as any).data ?? (response.data as any);
  },

  /**
   * Get single semester by ID
   */
  async getById(id: number | string, country: string = 'jordan'): Promise<Semester> {
    const response = await apiClient.get<{ data: Semester }>(
      API_ENDPOINTS.SEMESTERS.SHOW(id),
      { country }
    );
    return (response.data as any).data ?? (response.data as any);
  },

  /**
   * Create new semester
   */
  async create(data: SemesterFormData): Promise<Semester> {
    const response = await apiClient.post<{ data: Semester }>(
      API_ENDPOINTS.SEMESTERS.STORE,
      data
    );
    return (response.data as any).data ?? (response.data as any);
  },

  /**
   * Update semester
   */
  async update(id: number | string, data: SemesterFormData): Promise<Semester> {
    const response = await apiClient.put<{ data: Semester }>(
      API_ENDPOINTS.SEMESTERS.UPDATE(id),
      data
    );
    return (response.data as any).data ?? (response.data as any);
  },

  /**
   * Delete semester
   */
  async delete(id: number | string, country: string = 'jordan'): Promise<{ message: string }> {
    const response = await apiClient.delete(API_ENDPOINTS.SEMESTERS.DELETE(id), { country });
    return { message: response.message || 'Deleted successfully' };
  },
};

export default semestersService;
