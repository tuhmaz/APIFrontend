import { apiClient } from '../client';
import { API_ENDPOINTS } from '../config';
import type { Article, PaginatedResponse, SchoolClass, Subject, Semester } from '@/types';

interface ArticleFilters {
  country?: string;
  page?: number;
  per_page?: number;
  q?: string;
  subject_id?: number;
  semester_id?: number;
  status?: boolean;
}

interface ArticleCreateData {
  country: string;
  classes: SchoolClass[];
  subjects: Subject[];
  semesters: Semester[];
}

export interface ArticleFormData {
  country: string;
  title: string;
  description?: string;
  meta_description?: string;
  content?: string;
  subject_id?: number;
  semester_id?: number;
  class_id?: number;
  file?: File;
  is_published?: boolean;
  tags?: string[];
  keywords?: string;
  file_category?: string;
  file_name?: string;
  status?: boolean;
}

export interface ArticleStats {
  total: number;
  views: number;
  published: number;
  drafts: number;
}

export const articlesService = {
  /**
   * Get article statistics
   */
  async getStats(country: string = '1'): Promise<ArticleStats> {
    const response = await apiClient.get<{ data: ArticleStats }>(
      API_ENDPOINTS.ARTICLES.STATS,
      { country }
    );
    return response.data.data;
  },

  /**
   * Get paginated list of articles
   */
  async getAll(filters?: ArticleFilters): Promise<PaginatedResponse<Article>> {
    // Cast filters to Record<string, string | number | boolean | undefined> to satisfy TS
    const params = filters as unknown as Record<string, string | number | boolean | undefined>;
    const response = await apiClient.get<PaginatedResponse<Article>>(
      API_ENDPOINTS.ARTICLES.LIST,
      params
    );
    return response.data;
  },

  /**
   * Get data needed for creating an article (classes, subjects, semesters)
   */
  async getCreateData(country: string = '1'): Promise<ArticleCreateData> {
    const response = await apiClient.get<{ data: ArticleCreateData }>(
      API_ENDPOINTS.ARTICLES.CREATE,
      { country }
    );
    return (response.data as any).data ?? (response.data as any);
  },

  /**
   * Get single article by ID
   */
  async getById(id: number | string, country: string = '1'): Promise<Article> {
    const response = await apiClient.get<{ data: Article }>(
      API_ENDPOINTS.ARTICLES.SHOW(id),
      { country }
    );
    // Unwrap the 'data' property if the response is wrapped
    return (response.data as any).data || response.data;
  },

  /**
   * Get article edit data (article + classes, subjects, semesters)
   */
  async getEditData(id: number | string, country: string = '1'): Promise<{
    data: Article;
    classes: SchoolClass[];
    subjects: Subject[];
    semesters: Semester[];
  }> {
    const response = await apiClient.get<{
      data: Article;
      classes: SchoolClass[];
      subjects: Subject[];
      semesters: Semester[];
    }>(
      API_ENDPOINTS.ARTICLES.EDIT(id),
      { country }
    );
    // Handle nested data structure from Laravel Resource
    const resData = response.data as any;
    return {
      data: resData.data || resData,
      classes: resData.classes || [],
      subjects: resData.subjects || [],
      semesters: resData.semesters || [],
    };
  },

  /**
   * Create new article with file upload support
   */
  async create(data: ArticleFormData): Promise<Article> {
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

    const response = await apiClient.upload<{ data: Article }>(
      API_ENDPOINTS.ARTICLES.STORE,
      formData
    );
    // Unwrap the 'data' property
    return (response.data as any).data || response.data;
  },

  /**
   * Update existing article
   */
  async update(id: number | string, data: Partial<ArticleFormData>): Promise<Article> {
    const formData = new FormData();
    formData.append('_method', 'PUT');

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (value instanceof File) {
          // new_file for updating the attachment
          formData.append(key === 'file' ? 'new_file' : key, value);
        } else if (typeof value === 'boolean') {
          formData.append(key, value ? '1' : '0');
        } else {
          formData.append(key, String(value));
        }
      }
    });

    const response = await apiClient.upload<{ data: Article }>(
      API_ENDPOINTS.ARTICLES.UPDATE(id),
      formData
    );
    // Unwrap the 'data' property
    return (response.data as any).data || response.data;
  },

  /**
   * Delete article
   */
  async delete(id: number | string, country: string = '1'): Promise<{ message: string }> {
    const response = await apiClient.delete<{ message: string }>(API_ENDPOINTS.ARTICLES.DELETE(id), { country });
    return response.data;
  },

  /**
   * Toggle article status (publish/unpublish)
   */
  async toggleStatus(id: number | string, status: boolean, country: string = '1'): Promise<Article> {
    // Use dedicated publish/unpublish endpoints
    const endpoint = status
      ? API_ENDPOINTS.ARTICLES.PUBLISH(id)
      : API_ENDPOINTS.ARTICLES.UNPUBLISH(id);

    const response = await apiClient.post<{ data: Article }>(
      endpoint,
      { database: country }
    );
    return (response.data as any).data || response.data;
  },

  /**
   * Get articles by class/grade level
   */
  async getByClass(gradeLevel: number | string, country: string = '1'): Promise<Article[]> {
    const response = await apiClient.get<{ data: Article[] }>(
      API_ENDPOINTS.ARTICLES.BY_CLASS(gradeLevel),
      { country }
    );
    // Unwrap the 'data' property
    return (response.data as any).data || response.data;
  },

  /**
   * Get articles by keyword
   */
  async getByKeyword(keyword: string, country: string = '1'): Promise<Article[]> {
    const response = await apiClient.get<{ data: Article[] }>(
      API_ENDPOINTS.ARTICLES.BY_KEYWORD(keyword),
      { country }
    );
    // Unwrap the 'data' property
    return (response.data as any).data || response.data;
  },

  /**
   * Publish article
   */
  async publish(id: number | string, country: string = '1'): Promise<Article> {
    const response = await apiClient.post<{ data: Article }>(
      API_ENDPOINTS.ARTICLES.PUBLISH(id),
      { country }
    );
    // Unwrap the 'data' property
    return (response.data as any).data || response.data;
  },

  /**
   * Unpublish article
   */
  async unpublish(id: number | string, country: string = '1'): Promise<Article> {
    const response = await apiClient.post<{ data: Article }>(
      API_ENDPOINTS.ARTICLES.UNPUBLISH(id),
      { country }
    );
    // Unwrap the 'data' property
    return (response.data as any).data || response.data;
  },
 
  async isTitleUnique(title: string, country: string = '1'): Promise<boolean> {
    if (!title.trim()) return true;
    const response = await apiClient.get<PaginatedResponse<Article>>(
      API_ENDPOINTS.ARTICLES.LIST,
      { country, q: title, per_page: 1 }
    );
    const list = response.data?.data || [];
    const found = list.some((a) => (a.title || '').trim().toLowerCase() === title.trim().toLowerCase());
    return !found;
  },
};

export default articlesService;
