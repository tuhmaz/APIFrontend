'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ShieldX,
  Search,
  User,
  Plus,
  Calendar,
  Unlock,
  Lock,
  AlertOctagon
} from 'lucide-react';
import Card, { CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import { securityService } from '@/lib/api/services';
import Input from '@/components/ui/Input';
import { usePermissionGuard } from '@/hooks/usePermissionGuard';
import AccessDenied from '@/components/common/AccessDenied';

export default function BlockedIpsPage() {
  const { isAuthorized } = usePermissionGuard('manage security');
  const [ips, setIps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'expired' | 'all'>('active');
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    total: 0,
    per_page: 15
  });

  // Modals
  const [unblockModal, setUnblockModal] = useState<{ open: boolean; ip: any | null }>({
    open: false,
    ip: null,
  });
  const [blockModal, setBlockModal] = useState(false);
  
  // Form Data
  const [blockForm, setBlockForm] = useState({
    ip: '',
    reason: '',
    days: '' // empty = permanent
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchBlockedIps = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const data = await securityService.getBlockedIps({
        page,
        search: searchQuery,
        status: statusFilter === 'all' ? undefined : statusFilter
      });
      
      // Handle pagination structure
      if (data.data && Array.isArray(data.data)) {
        setIps(data.data);
        setPagination({
          current_page: data.current_page,
          last_page: data.last_page,
          total: data.total,
          per_page: data.per_page
        });
      } else if (Array.isArray(data)) {
        setIps(data);
      }
    } catch (err) {
      console.error('Failed to fetch blocked IPs:', err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchBlockedIps(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, statusFilter, fetchBlockedIps]);

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

  const handlePageChange = (page: number) => {
    fetchBlockedIps(page);
  };

  const handleUnblock = async () => {
    if (!unblockModal.ip) return;
    
    try {
      setFormLoading(true);
      await securityService.deleteBlock(unblockModal.ip.id);
      setUnblockModal({ open: false, ip: null });
      fetchBlockedIps(pagination.current_page);
    } catch (err) {
      console.error('Failed to unblock IP:', err);
    } finally {
      setFormLoading(false);
    }
  };

  const handleBlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    
    try {
      setFormLoading(true);
      await securityService.blockIp({
        ip: blockForm.ip,
        reason: blockForm.reason,
        days: blockForm.days ? parseInt(blockForm.days) : undefined
      });
      setBlockModal(false);
      setBlockForm({ ip: '', reason: '', days: '' });
      fetchBlockedIps(1);
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'فشل حظر العنوان');
    } finally {
      setFormLoading(false);
    }
  };

  const columns = [
    {
      title: 'IP العنوان',
      key: 'ip',
      render: (_: any, item: any) => (
        <div className="flex items-center gap-2 font-mono" dir="ltr">
          <ShieldX className="w-4 h-4 text-red-500" />
          <span className="font-semibold">{item.ip}</span>
        </div>
      ),
    },
    {
      title: 'سبب الحظر',
      key: 'reason',
      render: (_: any, item: any) => (
        <div className="max-w-xs truncate text-gray-700">
            {item.reason || 'غير محدد'}
        </div>
      ),
    },
    {
      title: 'بواسطة',
      key: 'banned_by',
      render: (_: any, item: any) => (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <User className="w-3 h-3" />
          <span>{item.blocked_by?.name || item.banned_by || 'النظام'}</span>
        </div>
      ),
    },
    {
      title: 'الحالة / الانتهاء',
      key: 'banned_until',
      render: (_: any, item: any) => {
        const isExpired = item.banned_until && new Date(item.banned_until) <= new Date();
        return (
          <div className="flex flex-col gap-1">
            <Badge variant={isExpired ? 'default' : 'error'}>
              {isExpired ? 'منتهي' : 'نشط'}
            </Badge>
            {item.banned_until ? (
              <span className="text-xs text-gray-500" dir="ltr">
                {new Date(item.banned_until).toLocaleDateString('en-GB')}
              </span>
            ) : (
              <span className="text-xs text-gray-500">مؤبد</span>
            )}
          </div>
        );
      },
    },
    {
      title: 'تاريخ الحظر',
      key: 'created_at',
      render: (_: any, item: any) => (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Calendar className="w-4 h-4" />
          <span dir="ltr">{new Date(item.created_at).toLocaleString('en-GB').split(',')[0]}</span>
        </div>
      ),
    },
    {
      title: 'إجراءات',
      key: 'actions',
      render: (_: any, item: any) => (
        <Button
          variant="ghost"
          size="sm"
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={() => setUnblockModal({ open: true, ip: item })}
          title="فك الحظر"
        >
          <Unlock className="w-4 h-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldX className="w-8 h-8 text-red-600" />
            عناوين IP المحظورة
          </h1>
          <p className="text-gray-500 mt-1">إدارة قائمة الحظر وحماية النظام من التهديدات</p>
        </div>
        <Button onClick={() => setBlockModal(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          حظر IP جديد
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>قائمة الحظر</CardTitle>
            <div className="flex gap-4">
              <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
                <button
                  onClick={() => setStatusFilter('active')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    statusFilter === 'active' ? 'bg-white shadow text-primary-600' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  نشط
                </button>
                <button
                  onClick={() => setStatusFilter('expired')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    statusFilter === 'expired' ? 'bg-white shadow text-primary-600' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  منتهي
                </button>
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    statusFilter === 'all' ? 'bg-white shadow text-primary-600' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  الكل
                </button>
              </div>
              <div className="relative w-64">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="بحث عن IP أو السبب..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-4 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            data={ips}
            columns={columns}
            loading={loading}
            emptyMessage="لا توجد عناوين IP محظورة حالياً"
            pagination={{
              current_page: pagination.current_page,
              last_page: pagination.last_page,
              per_page: pagination.per_page,
              total: pagination.total,
            }}
            onPageChange={handlePageChange}
          />
        </CardContent>
      </Card>

      {/* Block IP Modal */}
      <Modal
        isOpen={blockModal}
        onClose={() => setBlockModal(false)}
        title="حظر عنوان IP جديد"
      >
        <form onSubmit={handleBlockSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">عنوان IP</label>
            <Input
              value={blockForm.ip}
              onChange={(e) => setBlockForm({ ...blockForm, ip: e.target.value })}
              placeholder="Example: 192.168.1.1"
              required
              dir="ltr"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">سبب الحظر</label>
            <Input
              value={blockForm.reason}
              onChange={(e) => setBlockForm({ ...blockForm, reason: e.target.value })}
              placeholder="مثال: محاولات دخول متكررة"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">مدة الحظر (بالأيام)</label>
            <Input
              type="number"
              value={blockForm.days}
              onChange={(e) => setBlockForm({ ...blockForm, days: e.target.value })}
              placeholder="اتركه فارغاً للحظر الدائم"
              min="1"
            />
            <p className="text-xs text-gray-500 mt-1">اتركه فارغاً للحظر المؤبد</p>
          </div>

          {formError && (
            <div className="text-red-500 text-sm bg-red-50 p-2 rounded">
              {formError}
            </div>
          )}

          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" type="button" onClick={() => setBlockModal(false)}>
              إلغاء
            </Button>
            <Button variant="danger" type="submit" isLoading={formLoading}>
              <Lock className="w-4 h-4 ml-2" />
              حظر العنوان
            </Button>
          </div>
        </form>
      </Modal>

      {/* Unblock Confirmation Modal */}
      <Modal
        isOpen={unblockModal.open}
        onClose={() => setUnblockModal({ open: false, ip: null })}
        title="تأكيد فك الحظر"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-amber-600 bg-amber-50 p-3 rounded-lg">
            <AlertOctagon className="w-6 h-6 flex-shrink-0" />
            <p className="text-sm">
              هل أنت متأكد من رغبتك في فك الحظر عن العنوان <span className="font-mono font-bold" dir="ltr">{unblockModal.ip?.ip}</span>؟
              سيتمكن هذا العنوان من الوصول للنظام مرة أخرى.
            </p>
          </div>
          
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => setUnblockModal({ open: false, ip: null })}>
              إلغاء
            </Button>
            <Button variant="primary" onClick={handleUnblock} isLoading={formLoading}>
              <Unlock className="w-4 h-4 ml-2" />
              تأكيد فك الحظر
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
