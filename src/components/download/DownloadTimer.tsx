'use client';

import { useState, useEffect, useRef } from 'react';
import { Download, CheckCircle, FileText, AlertCircle, Eye } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/config';

interface Props {
  fileId: number | string;
  countryCode: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  customDownloadUrl?: string;
  viewsCount?: number;
  downloadCount?: number;
}

export default function DownloadTimer({
  fileId,
  countryCode,
  fileName,
  fileSize,
  fileType,
  customDownloadUrl,
  viewsCount = 0,
  downloadCount = 0,
}: Props) {
  const [timeLeft, setTimeLeft] = useState(25);
  const [canDownload, setCanDownload] = useState(false);
  const [views, setViews] = useState<number>(viewsCount);
  const [downloads, setDownloads] = useState<number>(downloadCount);
  const hasTrackedRef = useRef(false);

  useEffect(() => {
    setViews(viewsCount || 0);
    setDownloads(downloadCount || 0);
  }, [viewsCount, downloadCount]);

  useEffect(() => {
    const timer = setInterval(() => {
      // Pause timer if page is not visible
      if (document.hidden) {
        return;
      }

      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setCanDownload(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (hasTrackedRef.current) return;
    hasTrackedRef.current = true;

    const trackView = async () => {
      try {
        const response = await apiClient.post<any>(
          API_ENDPOINTS.FILES.INCREMENT_VIEW(fileId),
          { database: countryCode }
        );
        const payload = (response as any)?.data?.data || (response as any)?.data || response;
        if (typeof payload?.views_count === 'number') {
          setViews(payload.views_count);
        }
        if (typeof payload?.download_count === 'number') {
          setDownloads(payload.download_count);
        }
      } catch {
        // Silent fail - view counting is not critical
      }
    };

    trackView();
  }, [fileId, countryCode]);

  const progress = ((25 - timeLeft) / 25) * 100;

  const downloadUrl = customDownloadUrl || `/api/download/${fileId}?countryCode=${countryCode}`;

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 max-w-2xl mx-auto text-center">
      {/* File Icon */}
      <div className="w-20 h-20 bg-primary/5 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
        <FileText size={40} />
      </div>

      <h2 className="text-2xl font-bold text-gray-900 mb-4 break-words whitespace-normal leading-relaxed px-4 bidi-plaintext" dir="auto">{fileName}</h2>
      <div className="flex items-center justify-center gap-4 text-gray-500 mb-4 text-sm">
        <span className="bg-gray-100 px-3 py-1 rounded-full">{fileType || 'FILE'}</span>
        <span>•</span>
        <span>{formatFileSize(fileSize)}</span>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-gray-600 mb-8">
        <span className="bg-gray-100 px-3 py-1 rounded-full">المشاهدات: {views.toLocaleString('ar-EG')}</span>
        <span className="bg-gray-100 px-3 py-1 rounded-full flex items-center gap-1">
          <Eye size={12} className="text-gray-400" />
          التنزيلات: {downloads.toLocaleString('ar-EG')}
        </span>
      </div>

      {!canDownload ? (
        <div className="mb-8">
          <div className="mb-4">
            <span className="text-3xl font-bold text-primary">{timeLeft}</span>
            <span className="text-gray-500 mr-2">ثانية</span>
          </div>
          <p className="text-gray-600 mb-6">جاري تجهيز رابط التحميل، يرجى البقاء في الصفحة حتى اكتمال العد...</p>
          
          {/* Progress Bar */}
          <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-1000 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="mb-6 flex items-center justify-center gap-2 text-green-600 font-medium">
            <CheckCircle size={20} />
            <span>رابط التحميل جاهز!</span>
          </div>
          
          <a 
            href={downloadUrl}
            className="inline-flex items-center justify-center gap-3 bg-primary text-white text-lg font-bold px-8 py-4 rounded-xl hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 w-full sm:w-auto transform hover:-translate-y-1"
          >
            <Download size={24} />
            تحميل الملف الآن
          </a>
          
          <p className="mt-4 text-sm text-gray-500">
            شكراً لاستخدامكم منصة التعليم. لا تنسى مشاركة الرابط مع أصدقائك!
          </p>
        </div>
      )}

      {/* Safety Note */}
      <div className="mt-8 pt-6 border-t border-gray-100 flex items-start gap-3 text-right">
        <AlertCircle className="text-gray-400 shrink-0 mt-0.5" size={18} />
        <p className="text-xs text-gray-400 leading-relaxed">
          يتم فحص جميع الملفات آلياً للتأكد من خلوها من الفيروسات. في حال واجهت أي مشكلة في التحميل، يرجى الإبلاغ عنها فوراً.
        </p>
      </div>
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
