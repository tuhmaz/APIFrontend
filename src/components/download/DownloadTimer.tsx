'use client';

import { useState, useEffect } from 'react';
import { Download, CheckCircle, FileText, AlertCircle } from 'lucide-react';

interface Props {
  fileId: number | string;
  countryCode: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  customDownloadUrl?: string;
}

export default function DownloadTimer({ fileId, countryCode, fileName, fileSize, fileType, customDownloadUrl }: Props) {
  const [timeLeft, setTimeLeft] = useState(25);
  const [canDownload, setCanDownload] = useState(false);

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

  const progress = ((25 - timeLeft) / 25) * 100;

  const downloadUrl = customDownloadUrl || `/api/download/${fileId}?countryCode=${countryCode}`;

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 max-w-2xl mx-auto text-center">
      {/* File Icon */}
      <div className="w-20 h-20 bg-primary/5 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
        <FileText size={40} />
      </div>

      <h2 className="text-2xl font-bold text-gray-900 mb-4 break-words whitespace-normal leading-relaxed px-4 bidi-plaintext" dir="auto">{fileName}</h2>
      <div className="flex items-center justify-center gap-4 text-gray-500 mb-8 text-sm">
        <span className="bg-gray-100 px-3 py-1 rounded-full">{fileType || 'FILE'}</span>
        <span>•</span>
        <span>{formatFileSize(fileSize)}</span>
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
