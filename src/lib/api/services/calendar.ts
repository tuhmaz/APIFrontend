import { apiClient } from '../client';
import { API_ENDPOINTS } from '../config';

interface EventFormData {
  title: string;
  description?: string;
  event_date: string;
  eventDatabase: string;
}

interface EventResponse {
  id: number;
  title: string;
  start: string;
  allDay: boolean;
  extendedProps: {
    description: string;
    database: string;
  };
}

export const calendarService = {
  /**
   * Get available databases for calendar
   */
  async getDatabases(): Promise<string[]> {
    const response = await apiClient.get<any>(
      API_ENDPOINTS.CALENDAR.DATABASES
    );
    if (response.data?.data?.databases && Array.isArray(response.data.data.databases)) {
      return response.data.data.databases;
    }
    if (response.data?.databases && Array.isArray(response.data.databases)) {
        return response.data.databases;
    }
    return [];
  },

  /**
   * Get events for a date range
   */
  async getEvents(params: {
    database?: string;
    start?: string;
    end?: string;
  }): Promise<EventResponse[]> {
    const response = await apiClient.get<any>(
      API_ENDPOINTS.CALENDAR.EVENTS,
      params
    );
    
    if (response.data?.data?.data && Array.isArray(response.data.data.data)) {
      return response.data.data.data;
    }
    if (response.data?.data && Array.isArray(response.data.data)) {
      return response.data.data;
    }
    if (Array.isArray(response.data)) {
        return response.data;
    }
    console.warn('Unexpected calendar events response:', response.data);
    return [];
  },

  async getHomeEvents(params: {
    database?: string;
    start?: string;
    end?: string;
  }): Promise<EventResponse[]> {
    const response = await apiClient.get<any>(API_ENDPOINTS.HOME.CALENDAR, params);

    if (response.data?.data?.data && Array.isArray(response.data.data.data)) {
      return response.data.data.data;
    }
    if (response.data?.data && Array.isArray(response.data.data)) {
      return response.data.data;
    }
    if (Array.isArray(response.data)) {
      return response.data;
    }
    return [];
  },

  /**
   * Create new calendar event
   */
  async create(data: EventFormData): Promise<EventResponse> {
    const response = await apiClient.post<any>(
      API_ENDPOINTS.CALENDAR.STORE,
      data
    );
    return response.data?.data?.data || response.data?.data || response.data;
  },

  /**
   * Update calendar event
   */
  async update(id: number | string, data: EventFormData): Promise<EventResponse> {
    const response = await apiClient.put<any>(
      API_ENDPOINTS.CALENDAR.UPDATE(id),
      data
    );
    return response.data?.data?.data || response.data?.data || response.data;
  },

  /**
   * Delete calendar event
   */
  async delete(id: number | string, database: string): Promise<{ message: string }> {
    const response = await apiClient.delete(API_ENDPOINTS.CALENDAR.DELETE(id), { database });
    return {
      message: response.message || 'Deleted successfully'
    };
  },
};

export default calendarService;
