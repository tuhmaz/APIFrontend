'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  Search,
  Trash2,
  Calendar,
  RefreshCw,
  FileText,
  Newspaper
} from 'lucide-react';
import { commentsService, COUNTRIES } from '@/lib/api/services';
import { Comment } from '@/lib/api/services/comments';
import { ConfirmModal, AlertModal } from '@/components/ui/Modal';
import { usePermissionGuard } from '@/hooks/usePermissionGuard';
import AccessDenied from '@/components/common/AccessDenied';
import Pagination from '@/components/ui/Pagination';

export default function CommentsPage() {
  const { isAuthorized } = usePermissionGuard('manage comments');
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  // Default to Jordan (jo)
  const [selectedDatabase, setSelectedDatabase] = useState<string>('jo');
  
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 20,
    total: 0,
  });

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{ title: string; message: string; variant: 'success' | 'error' }>({
    title: '',
    message: '',
    variant: 'success',
  });

  // Allowed databases for comments
  const ALLOWED_DATABASES = ['jo', 'sa', 'eg', 'ps'];
  const filteredCountries = COUNTRIES.filter(c => ALLOWED_DATABASES.includes(c.code));

  const fetchComments = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const response = await commentsService.getAllDashboard(selectedDatabase, {
        page,
        per_page: 20,
        q: searchQuery || undefined,
      });
      
      // Handle Laravel Pagination Response
      if (response.data) {
        setComments(response.data);
      } else {
        setComments([]);
      }

      if (response.meta) {
        setPagination({
            current_page: response.meta.current_page,
            last_page: response.meta.last_page,
            per_page: response.meta.per_page,
            total: response.meta.total
        });
      }
    } catch (err: any) {
      console.error('Failed to fetch comments:', err);
      setComments([]);
    } finally {
      setLoading(false);
    }
  }, [selectedDatabase, searchQuery]);

  useEffect(() => {
    fetchComments(1);
  }, [fetchComments]);

  if (isAuthorized === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (isAuthorized === false) {
    return <AccessDenied />;
  }

  const handleDeleteClick = (id: number) => {
    setConfirmDeleteId(id);
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!confirmDeleteId) return;
    try {
      await commentsService.delete(selectedDatabase, confirmDeleteId);
      setAlertConfig({
        title: 'تم الحذف',
        message: 'تم حذف التعليق بنجاح',
        variant: 'success',
      });
      setAlertOpen(true);
      fetchComments(pagination.current_page);
    } catch {
      setAlertConfig({
        title: 'خطأ',
        message: 'فشل حذف التعليق',
        variant: 'error',
      });
      setAlertOpen(true);
    } finally {
      setConfirmOpen(false);
      setConfirmDeleteId(null);
    }
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <MessageSquare className="w-6 h-6 text-blue-600" />
            </div>
            التعليقات
          </h1>
          <p className="text-gray-500 mt-1">إدارة التعليقات والتحكم بها</p>
        </div>

        <div className="flex items-center gap-3">
            <div className="relative min-w-[200px]">
                <select
                    value={selectedDatabase}
                    onChange={(e) => setSelectedDatabase(e.target.value)}
                    className="w-full h-10 pr-3 pl-10 bg-gray-50 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none cursor-pointer"
                >
                    {filteredCountries.map((country) => (
                    <option key={country.id} value={country.code}>
                        {country.name}
                    </option>
                    ))}
                </select>
                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                    <RefreshCw className="w-4 h-4" />
                </div>
            </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="بحث في محتوى التعليقات..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-4 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">
            <RefreshCw className="w-8 h-8 mx-auto animate-spin mb-4 text-blue-500" />
            <p>جاري تحميل التعليقات...</p>
          </div>
        ) : comments.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg">لا توجد تعليقات</p>
            <p className="text-sm text-gray-400 mt-1">لم يتم العثور على أي تعليقات في قاعدة البيانات المحددة</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">التعليق</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">المستخدم</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">المكان</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">التاريخ</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-600">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <AnimatePresence>
                  {comments.map((comment) => (
                    <motion.tr
                      key={comment.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="group hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="max-w-lg">
                          {comment.commentable ? (
                            <Link
                              href={comment.commentable_type.includes('Article')
                                ? `/${selectedDatabase}/lesson/articles/${comment.commentable_id}#comment-${comment.id}`
                                : `/${selectedDatabase}/posts/${comment.commentable_id}#comment-${comment.id}`
                              }
                              target="_blank"
                              className="text-gray-800 text-sm leading-relaxed line-clamp-2 group-hover:line-clamp-none transition-all hover:text-blue-600 block"
                            >
                              {comment.body}
                            </Link>
                          ) : (
                            <p className="text-gray-800 text-sm leading-relaxed line-clamp-2 group-hover:line-clamp-none transition-all">
                              {comment.body}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                            {comment.user?.name?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{comment.user?.name || 'مستخدم غير معروف'}</p>
                            <p className="text-xs text-gray-500">{comment.user?.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 text-xs font-medium px-2 py-1 rounded-full w-fit bg-gray-100 text-gray-600">
                            {comment.commentable_type.includes('Article') ? (
                              <FileText className="w-3 h-3" />
                            ) : (
                              <Newspaper className="w-3 h-3" />
                            )}
                            {comment.commentable_type.includes('Article') ? 'مقال' : 'خبر'}
                          </div>
                          {comment.commentable ? (
                            <Link
                              href={comment.commentable_type.includes('Article')
                                ? `/${selectedDatabase}/articles/${comment.commentable_id}#comment-${comment.id}`
                                : `/${selectedDatabase}/posts/${comment.commentable_id}#comment-${comment.id}`
                              }
                              target="_blank"
                              className="text-sm text-blue-600 truncate max-w-[200px] hover:underline"
                              title={comment.commentable.title}
                            >
                              {comment.commentable.title}
                            </Link>
                          ) : (
                            <p className="text-sm text-gray-400 truncate max-w-[200px]">
                              محذوف
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            {new Date(comment.created_at).toLocaleDateString('ar-EG')}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleDeleteClick(comment.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="حذف التعليق"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
        
        {/* Pagination */}
        {comments.length > 0 && pagination.last_page > 1 && (
            <div className="p-4 border-t border-gray-100 flex items-center justify-between">
                <p className="text-sm text-gray-500">
                    عرض {comments.length} من أصل {pagination.total} تعليق
                </p>
                <Pagination
                  currentPage={pagination.current_page}
                  totalPages={pagination.last_page}
                  onPageChange={fetchComments}
                />
            </div>
        )}
      </div>

      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={confirmDelete}
        title="حذف التعليق"
        message="هل أنت متأكد من رغبتك في حذف هذا التعليق؟ لا يمكن التراجع عن هذا الإجراء."
        confirmText="حذف"
        cancelText="إلغاء"
        variant="danger"
      />

      <AlertModal
        isOpen={alertOpen}
        onClose={() => setAlertOpen(false)}
        title={alertConfig.title}
        message={alertConfig.message}
        variant={alertConfig.variant}
      />
    </div>
  );
}
