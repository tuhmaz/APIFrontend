import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

export function formatCurrency(amount: number, currency = 'SAR'): string {
  return new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency,
  }).format(amount);
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  const precision = size >= 100 ? 0 : size >= 10 ? 1 : 2;
  return `${size.toFixed(precision)} ${units[unitIndex]}`;
}

export function getStorageUrl(path: string | undefined | null): string | undefined {
  if (!path) return undefined;
  if (path.startsWith('http://') || path.startsWith('https://')) {
    // Fix for Next.js Image Optimization blocking 127.0.0.1
    // Convert local absolute URLs to relative paths to use rewrites
    if (process.env.NODE_ENV === 'development') {
      if (path.includes('127.0.0.1:8000') || path.includes('localhost:8000')) {
        try {
          const url = new URL(path);
          return url.pathname;
        } catch {
          // Fallback if URL parsing fails
          return path.replace('127.0.0.1', 'localhost');
        }
      }
      return path.replace('127.0.0.1', 'localhost');
    }
    return path;
  }
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  if (normalizedPath.startsWith('/_next/') || normalizedPath.startsWith('/assets/') || normalizedPath.startsWith('/api/')) {
    return normalizedPath;
  }

  const storagePath = normalizedPath.startsWith('/storage/')
    ? normalizedPath
    : `/storage${normalizedPath}`;

  return `/api/storage${storagePath}`;
}

export function safeJsonLd(json: any): string {
  return JSON.stringify(json).replace(/</g, '\\u003c');
}
