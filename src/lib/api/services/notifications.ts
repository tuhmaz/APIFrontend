import { apiClient } from '../client';
import { API_ENDPOINTS } from '../config';

export interface NotificationData {
  title?: string;
  message?: string;
  url?: string;
  type?: string;
  action_url?: string;
  [key: string]: any;
}

export interface Notification {
  id: string;
  type: string;
  notifiable_type: string;
  notifiable_id: number;
  data: NotificationData;
  read_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotificationResponse {
  data: Notification[];
  unread_count: number;
  success: boolean;
}

export const notificationService = {
  /**
   * Get latest notifications for the dropdown.
   * Uses suppressAuthRedirect so background polling doesn't kill the session on transient 401s.
   */
  getLatest: async (limit = 10): Promise<NotificationResponse> => {
    const response = await apiClient.get<NotificationResponse>(
      API_ENDPOINTS.NOTIFICATIONS.LATEST,
      { limit },
      { suppressAuthRedirect: true }
    );
    return response.data;
  },

  /**
   * Get all notifications (paginated)
   */
  getAll: async (params?: { page?: number; per_page?: number; type?: string }): Promise<NotificationResponse> => {
    const response = await apiClient.get<NotificationResponse>(API_ENDPOINTS.NOTIFICATIONS.LIST, params as any);
    return response.data;
  },
  
  /**
   * Mark a single notification as read
   */
  markAsRead: async (id: string): Promise<{ unread_count: number; message: string }> => {
    const response = await apiClient.post<{ data: { unread_count: number; message: string } }>(
      API_ENDPOINTS.NOTIFICATIONS.MARK_READ(id)
    );
    return response.data.data;
  },

  /**
   * Mark all notifications as read
   */
  markAllAsRead: async (): Promise<{ unread_count: number; message: string }> => {
    const response = await apiClient.post<{ data: { unread_count: number; message: string } }>(
      API_ENDPOINTS.NOTIFICATIONS.MARK_ALL_READ
    );
    return response.data.data;
  },

  /**
   * Delete a notification
   */
  delete: async (id: string): Promise<any> => {
    const response = await apiClient.delete(API_ENDPOINTS.NOTIFICATIONS.DELETE(id));
    return response.data;
  },

  /**
   * Bulk action on notifications
   */
  bulkAction: async (ids: string[], action: string): Promise<any> => {
    const response = await apiClient.post(API_ENDPOINTS.NOTIFICATIONS.BULK_ACTION, {
      ids,
      action
    });
    return response.data;
  }
};
