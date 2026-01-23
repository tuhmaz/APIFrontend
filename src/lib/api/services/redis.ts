import { apiClient } from '../client';
import { API_ENDPOINTS } from '../config';
export interface RedisKey {
  key: string;
  value: string;
  ttl: number;
}

export type RedisInfoSection = Record<string, string>;
export interface RedisInfo {
  [key: string]: string | RedisInfoSection;
}

export const redisService = {
  /**
   * Get all Redis keys
   */
  async getKeys(search?: string): Promise<{ count: number; data: RedisKey[] }> {
    const params = search ? { search } : {};
    const response = await apiClient.get<{ data: { count: number; data: RedisKey[] } }>(
      API_ENDPOINTS.REDIS.KEYS,
      params
    );
    return response.data.data;
  },

  /**
   * Get Redis server info
   */
  async getInfo(): Promise<RedisInfo> {
    const response = await apiClient.get<{ data: { data: RedisInfo } }>(API_ENDPOINTS.REDIS.INFO);
    return response.data.data;
  },

  /**
   * Test Redis connection
   */
  async testConnection(): Promise<{ message: string }> {
    const response = await apiClient.get<{ data: { message: string } }>(API_ENDPOINTS.REDIS.TEST);
    return response.data.data;
  },

  /**
   * Add a new key
   */
  async addKey(data: { key: string; value: string; ttl?: number }): Promise<void> {
    await apiClient.post(API_ENDPOINTS.REDIS.STORE, data);
  },

  /**
   * Delete a key
   */
  async deleteKey(key: string): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.REDIS.DELETE(key));
  },

  /**
   * Update Redis environment settings
   */
  async updateEnv(data: {
    REDIS_HOST?: string;
    REDIS_PORT?: string;
    REDIS_PASSWORD?: string;
    REDIS_DB?: string;
  }): Promise<void> {
    await apiClient.post(API_ENDPOINTS.REDIS.UPDATE_ENV, data);
  },
};
