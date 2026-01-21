// API Configuration
export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api',
  TIMEOUT: 30000,
};

// Available Countries (multi-database support)
export const COUNTRIES = [
  { id: '1', code: 'jo', name: 'الأردن' },
  { id: '2', code: 'sa', name: 'السعودية' },
  { id: '3', code: 'eg', name: 'مصر' },
  { id: '4', code: 'ps', name: 'فلسطين' },
] as const;

export type CountryId = typeof COUNTRIES[number]['id'];
export type CountryCode = typeof COUNTRIES[number]['code'];

// API Endpoints based on Laravel Controllers
export const API_ENDPOINTS = {
  // ========== AUTH ==========
  AUTH: {
    REGISTER: '/auth/register',
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    ME: '/auth/user',
    FORGOT_PASSWORD: '/auth/password/forgot',
    RESET_PASSWORD: '/auth/password/reset',
    VERIFY_EMAIL: (id: string, hash: string) => `/auth/email/verify/${id}/${hash}`,
    RESEND_VERIFY: '/auth/email/resend',
    GOOGLE_REDIRECT: '/auth/google/redirect',
    GOOGLE_CALLBACK: '/auth/google/callback',
  },

  // ========== DASHBOARD ==========
  DASHBOARD: {
    INDEX: '/dashboard',
    ANALYTICS: '/dashboard/visitor-analytics',
  },

  // ========== PERFORMANCE ==========
  PERFORMANCE: {
    SUMMARY: '/dashboard/performance/summary',
    LIVE: '/dashboard/performance/live',
    RAW: '/dashboard/performance/raw',
    RESPONSE_TIME: '/dashboard/performance/response-time',
    CACHE: '/dashboard/performance/cache',
  },

  // ========== HOME (Frontend) ==========
  HOME: {
    INDEX: '/home',
    CALENDAR: '/home/calendar',
    EVENT: (id: number | string) => `/home/event/${id}`,
  },

  // ========== FRONTEND ==========
  FRONTEND: {
    CLASSES: '/school-classes',
    CLASS_DETAILS: (id: number | string) => `/school-classes/${id}`,
  },

  // ========== FRONT (Public) ==========
  FRONT: {
    SETTINGS: '/front/settings',
  },

  // ========== FILTER ==========
  FILTER: {
    INDEX: '/filter',
    SUBJECTS_BY_CLASS: (classId: number | string) => `/filter/subjects/${classId}`,
    SEMESTERS_BY_SUBJECT: (subjectId: number | string) => `/filter/semesters/${subjectId}`,
    FILE_TYPES_BY_SEMESTER: (semesterId: number | string) => `/filter/file-types/${semesterId}`,
  },

  // ========== SCHOOL CLASSES ==========
  SCHOOL_CLASSES: {
    LIST: '/dashboard/school-classes',
    SHOW: (id: number | string) => `/dashboard/school-classes/${id}`,
    STORE: '/dashboard/school-classes',
    UPDATE: (id: number | string) => `/dashboard/school-classes/${id}`,
    DELETE: (id: number | string) => `/dashboard/school-classes/${id}`,
  },

  // ========== SUBJECTS ==========
  SUBJECTS: {
    LIST: '/dashboard/subjects',
    SHOW: (id: number | string) => `/dashboard/subjects/${id}`,
    STORE: '/dashboard/subjects',
    UPDATE: (id: number | string) => `/dashboard/subjects/${id}`,
    DELETE: (id: number | string) => `/dashboard/subjects/${id}`,
  },

  // ========== SEMESTERS ==========
  SEMESTERS: {
    LIST: '/dashboard/semesters',
    SHOW: (id: number | string) => `/dashboard/semesters/${id}`,
    STORE: '/dashboard/semesters',
    UPDATE: (id: number | string) => `/dashboard/semesters/${id}`,
    DELETE: (id: number | string) => `/dashboard/semesters/${id}`,
  },

  // ========== USERS ==========
  USERS: {
    LIST: '/dashboard/users',
    SEARCH: '/dashboard/users/search',
    SHOW: (id: number | string) => `/dashboard/users/${id}`,
    STORE: '/dashboard/users',
    UPDATE: (id: number | string) => `/dashboard/users/${id}`,
    DELETE: (id: number | string) => `/dashboard/users/${id}`,
    DELETE_BULK: '/dashboard/users/bulk-delete',
    BULK_DELETE: '/dashboard/users/bulk-delete',
    UPDATE_STATUS: '/dashboard/users/update-status',
    UPDATE_ROLES: (id: number | string) => `/dashboard/users/${id}/roles-permissions`,
  },

  // ========== ROLES & PERMISSIONS ==========
  ROLES: {
    LIST: '/dashboard/roles',
    SHOW: (id: number | string) => `/dashboard/roles/${id}`,
    STORE: '/dashboard/roles',
    UPDATE: (id: number | string) => `/dashboard/roles/${id}`,
    DELETE: (id: number | string) => `/dashboard/roles/${id}`,
    PERMISSIONS: '/dashboard/permissions',
  },

  PERMISSIONS: {
    LIST: '/dashboard/permissions',
    STORE: '/dashboard/permissions',
    UPDATE: (id: number | string) => `/dashboard/permissions/${id}`,
    DELETE: (id: number | string) => `/dashboard/permissions/${id}`,
  },

  // ========== ARTICLES ==========
  ARTICLES: {
    SHOW_PUBLIC: (id: number | string) => `/articles/${id}`,
    DOWNLOAD: (id: number | string) => `/articles/file/${id}/download`,
    STATS: '/dashboard/articles/stats',
    LIST: '/dashboard/articles',
    CREATE: '/dashboard/articles/create',
    SHOW: (id: number | string) => `/dashboard/articles/${id}`,
    EDIT: (id: number | string) => `/dashboard/articles/${id}/edit`,
    STORE: '/dashboard/articles',
    UPDATE: (id: number | string) => `/dashboard/articles/${id}`,
    DELETE: (id: number | string) => `/dashboard/articles/${id}`,
    TOGGLE_PUBLISH: (id: number | string) => `/dashboard/articles/${id}/publish`,
    PUBLISH: (id: number | string) => `/dashboard/articles/${id}/publish`,
    UNPUBLISH: (id: number | string) => `/dashboard/articles/${id}/unpublish`,
    BY_KEYWORD: (keyword: string) => `/articles/by-keyword/${keyword}`,
    BY_CLASS: (gradeLevel: number | string) => `/articles/by-class/${gradeLevel}`,
  },

  // ========== POSTS ==========
  POSTS: {
    INDEX: '/posts',
    LIST: '/posts',
    SHOW: (id: number | string) => `/posts/${id}`,
    INCREMENT_VIEW: (id: number | string) => `/posts/${id}/increment-view`,
    TOGGLE_STATUS: (id: number | string) => `/posts/${id}/toggle-status`,
    STORE: '/dashboard/posts',
    UPDATE: (id: number | string) => `/dashboard/posts/${id}`,
    DELETE: (id: number | string) => `/dashboard/posts/${id}`,
  },

  // ========== KEYWORDS ==========
  KEYWORDS: {
    INDEX: '/keywords',
    SHOW: (keyword: string) => `/keywords/${keyword}`,
  },

  // ========== MESSAGES ==========
  MESSAGES: {
    INBOX: '/dashboard/messages/inbox',
    SENT: '/dashboard/messages/sent',
    DRAFTS: '/dashboard/messages/drafts',
    SEND: '/dashboard/messages/send',
    SAVE_DRAFT: '/dashboard/messages/save-draft',
    SHOW: (id: number | string) => `/dashboard/messages/${id}`,
    MARK_READ: (id: number | string) => `/dashboard/messages/${id}/read`,
    TOGGLE_IMPORTANT: (id: number | string) => `/dashboard/messages/${id}/important`,
    DELETE: (id: number | string) => `/dashboard/messages/${id}`,
  },

  // ========== CATEGORIES ==========
  CATEGORIES: {
    INDEX: '/categories',
    LIST: '/categories',
    SHOW: (id: number | string) => `/categories/${id}`,
    STORE: '/dashboard/categories',
    UPDATE: (id: number | string) => `/dashboard/categories/${id}/update`,
    DELETE: (id: number | string) => `/dashboard/categories/${id}`,
    TOGGLE: (id: number | string) => `/dashboard/categories/${id}/toggle`,
  },
  
  // ========== FILES ==========
  FILES: {
    LIST: '/dashboard/files',
    SHOW: (id: number | string) => `/dashboard/files/${id}`,
    INFO: (id: number | string) => `/files/${id}/info`,
    STORE: '/dashboard/files',
    UPDATE: (id: number | string) => `/dashboard/files/${id}`,
    DELETE: (id: number | string) => `/dashboard/files/${id}`,
    DOWNLOAD: (id: number | string) => `/dashboard/files/${id}/download`,
    UPLOAD: '/upload/image',
    UPLOAD_FILE: '/upload/file',
  },

  // ========== NOTIFICATIONS ==========
  // Updated endpoints to match backend routes
  NOTIFICATIONS: {
    LIST: '/dashboard/notifications',
    LATEST: '/dashboard/notifications/latest',
    MARK_READ: (id: number | string) => `/dashboard/notifications/${id}/read`,
    MARK_ALL_READ: '/dashboard/notifications/read-all',
    BULK_ACTION: '/dashboard/notifications/bulk',
    DELETE: (id: number | string) => `/dashboard/notifications/${id}`,
  },

  // ========== SETTINGS ==========
  SETTINGS: {
    GET_ALL: '/dashboard/settings',
    UPDATE: '/dashboard/settings/update',
    TEST_SMTP: '/dashboard/settings/smtp/test',
    SEND_TEST_EMAIL: '/dashboard/settings/smtp/send-test',
    UPDATE_ROBOTS: '/dashboard/settings/robots',
  },

  // ========== SITEMAP ==========
  SITEMAP: {
    STATUS: '/dashboard/sitemap/status',
    GENERATE_ALL: '/dashboard/sitemap/generate',
    DELETE: (type: string, database: string) => `/dashboard/sitemap/delete/${type}/${database}`,
  },

  // ========== COMMENTS ==========
  COMMENTS: {
    LIST_PUBLIC: (database: string) => `/comments/${database}`,
    LIST_DASHBOARD: (database: string) => `/dashboard/comments/${database}`,
    STORE: (database: string) => `/dashboard/comments/${database}`,
    DELETE: (database: string, id: number | string) => `/dashboard/comments/${database}/${id}`,
  },

  // ========== SECURITY ==========
  SECURITY: {
    OVERVIEW: '/dashboard/security/monitor/dashboard',
    DASHBOARD: '/dashboard/security/monitor/dashboard',
    ALERTS: '/dashboard/security/monitor/alerts',
    ALERT_DETAILS: (id: string) => `/dashboard/security/monitor/alerts/${id}`,
    RUN_SCAN: '/dashboard/security/monitor/run-scan',
    EXPORT_REPORT: '/dashboard/security/monitor/export-report',
    LOGS: '/dashboard/security/logs',
    ANALYTICS: '/dashboard/security/analytics',
    RESOLVE: (id: number | string) => `/dashboard/security/logs/${id}/resolve`,
    DELETE_LOG: (id: number | string) => `/dashboard/security/logs/${id}`,
    DELETE_ALL: '/dashboard/security/logs',
    IP_DETAILS: (ip: string) => `/dashboard/security/ip/${encodeURIComponent(ip)}`,
    BLOCKED_IPS: '/dashboard/security/blocked-ips',
    BLOCK_IP: '/dashboard/security/ip/block',
    UNBLOCK_IP: '/dashboard/security/ip/unblock',
    DELETE_BLOCK: (id: number | string) => `/dashboard/security/blocked-ips/${id}`,
    TRUSTED_IPS: '/dashboard/security/trusted-ips',
    TRUST_IP: '/dashboard/security/ip/trust',
    UNTRUST_IP: '/dashboard/security/ip/untrust',
  },

  // ========== REDIS ==========
  REDIS: {
    KEYS: '/dashboard/redis/keys',
    INFO: '/dashboard/redis/info',
    TEST: '/dashboard/redis/test',
    STORE: '/dashboard/redis',
    DELETE: (key: string) => `/dashboard/redis/${encodeURIComponent(key)}`,
    UPDATE_ENV: '/dashboard/redis/env',
  },

  // ========== CALENDAR ==========
  CALENDAR: {
    DATABASES: '/dashboard/calendar/databases',
    EVENTS: '/dashboard/calendar/events',
    STORE: '/dashboard/calendar/events',
    UPDATE: (id: number | string) => `/dashboard/calendar/events/${id}`,
    DELETE: (id: number | string) => `/dashboard/calendar/events/${id}`,
  },
};
