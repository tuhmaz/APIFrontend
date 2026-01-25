import { FileText, Download, AlertCircle } from 'lucide-react';
import DOMPurify from 'isomorphic-dompurify';

interface File {
  id: number;
  file_name: string;
  file_type: string;
  file_size: number;
  file_path: string;
  file_category?: string;
}

interface Props {
  content: string;
  files: File[];
  className?: string;
  backLink?: string;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default function ArticleContent({ content, files, className, backLink }: Props) {
  // Sanitize content to prevent XSS
  let processedContent = DOMPurify.sanitize(content, {
    ADD_TAGS: ['iframe'],
    ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling', 'target']
  });

  // Enforce rel="noopener noreferrer" for target="_blank" links
  // Since we don't allow 'rel' in ADD_ATTR, DOMPurify strips it, so we can safely add it.
  processedContent = processedContent.replace(/target="_blank"/g, 'target="_blank" rel="noopener noreferrer"');

  return (
    <div className={className}>
      {/* Main Content */}
      <div 
        className="prose prose-lg max-w-none text-center prose-headings:text-center prose-p:text-center prose-headings:font-bold prose-a:text-primary hover:prose-a:text-primary/80 prose-img:rounded-xl prose-img:shadow-lg prose-img:mx-auto mb-12"
        dangerouslySetInnerHTML={{ __html: processedContent }}
      />

      {/* Files Section */}
      {files && files.length > 0 && (
        <div className="bg-gray-50 rounded-xl p-6 border border-gray-100 mb-8">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <FileText className="text-primary" />
            المرفقات
          </h3>
          <div className="grid gap-4">
            {files.map((file, index) => (
              <div 
                key={file.id || `file-${index}`} 
                className="bg-white p-4 rounded-lg border border-gray-200 flex items-center justify-between hover:shadow-md transition-shadow group"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-12 h-12 bg-red-50 text-red-600 rounded-lg flex items-center justify-center shrink-0">
                    <span className="font-bold text-sm uppercase">{file.file_type || 'PDF'}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 
                      className="font-medium text-gray-900 mb-1 group-hover:text-primary transition-colors whitespace-normal break-words bidi-plaintext"
                      dir="auto"
                    >
                      {file.file_name || 'ملف للتحميل'}
                    </h4>
                    <p className="text-sm text-gray-500">
                      {formatFileSize(file.file_size || 0)} • {file.file_category || 'ملف'}
                    </p>
                  </div>
                </div>
                
                <a
                  href={`/download/${file.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center gap-2 shadow-lg shadow-primary/20"
                >
                  <Download size={18} />
                  <span className="hidden sm:inline">تحميل</span>
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Warning/Note (Optional - based on "Professional" requirement) */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex gap-3 text-yellow-800 text-sm">
        <AlertCircle className="shrink-0 w-5 h-5" />
        <p>
          جميع الحقوق محفوظة للموقع. يرجى ذكر المصدر عند النقل. المحتوى التعليمي متاح للاستخدام الشخصي والتعليمي فقط.
        </p>
      </div>
    </div>
  );
}
