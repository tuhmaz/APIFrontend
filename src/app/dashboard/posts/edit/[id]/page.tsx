'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import $ from 'jquery';
import 'summernote/dist/summernote-lite.css';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Image from '@/components/common/AppImage';
import { toast } from 'react-hot-toast';
import { Save, FileText, Tag, Image as ImageIcon, Upload } from 'lucide-react';
import Card, { CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { postsService, categoriesService, COUNTRIES } from '@/lib/api/services';
import type { FileItem } from '@/types';
import { getStorageUrl, extractError } from '@/lib/utils';
import { usePermissionGuard } from '@/hooks/usePermissionGuard';
import AccessDenied from '@/components/common/AccessDenied';

export default function EditPostPage() {
  const { isAuthorized } = usePermissionGuard('manage posts');
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const countryParam = searchParams.get('country');

  const editorRef = useRef<HTMLDivElement | null>(null);
  const [summernoteReady, setSummernoteReady] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCountry, setSelectedCountry] = useState<'1' | '2' | '3' | '4'>((countryParam as '1' | '2' | '3' | '4') || '1');
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<FileItem[]>([]);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | undefined>(undefined);
  const [isTitleDuplicate, setIsTitleDuplicate] = useState(false);
  const [isCheckingTitle, setIsCheckingTitle] = useState(false);
  const [initialTitle, setInitialTitle] = useState('');

  const [formData, setFormData] = useState<{
    title: string;
    content: string;
    category_id: number | string;
    meta_description?: string;
    keywords?: string;
    is_active?: boolean;
    is_featured?: boolean;
    image?: File;
    attachments?: File[];
  }>({
    title: '',
    content: '',
    category_id: 0,
    meta_description: '',
    keywords: '',
    is_active: true,
    is_featured: false,
    image: undefined,
    attachments: [],
  });

  const categoryOptions = useMemo(
    () => categories.map((c) => ({ value: c.id, label: c.name })),
    [categories]
  );

  useEffect(() => {
    if (!isAuthorized) return;
    const t = setTimeout(async () => {
      const title = formData.title.trim();
      if (!title) {
        setIsTitleDuplicate(false);
        return;
      }
      if (title === initialTitle) {
        setIsTitleDuplicate(false);
        return;
      }
      setIsCheckingTitle(true);
      try {
        const unique = await postsService.isTitleUnique(title, selectedCountry);
        setIsTitleDuplicate(!unique);
      } catch {
        setIsTitleDuplicate(false);
      } finally {
        setIsCheckingTitle(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [formData.title, selectedCountry, initialTitle, isAuthorized]);

  useEffect(() => {
    (window as any).$ = $;
    (window as any).jQuery = $;
    const fontLink = document.createElement('link');
    fontLink.rel = 'stylesheet';
    fontLink.href =
      'https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&family=Tajawal:wght@400;700&family=Almarai:wght@400;700&display=swap';
    document.head.appendChild(fontLink);
    (async () => {
      await import('summernote/dist/summernote-lite');
      await import('summernote/dist/lang/summernote-ar-AR');
      setSummernoteReady(true);
    })();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      try {
        setIsLoading(true);
        const post = await postsService.getById(id, selectedCountry);
        setSelectedCountry(String((post as any).country || selectedCountry) as any);
        const res: unknown = await categoriesService.getAll({
          country: String((post as any).country || selectedCountry),
          per_page: 100,
        });
        const data = (res as any)?.data?.data ?? (Array.isArray(res) ? res : (res as any)?.data ?? []);
        const list = (Array.isArray(data) ? data : []).map((c: any) => ({ id: Number(c.id), name: String(c.name) }));
        setCategories(list);
        setExistingAttachments(Array.isArray((post as any).attachments) ? (post as any).attachments : []);
        const imageSrc = getStorageUrl((post as any).image_url || (post as any).image);
        setCurrentImageUrl(imageSrc);
        setInitialTitle(post.title || '');
        setFormData({
          title: post.title || '',
          content: post.content || '',
          category_id: post.category_id || list[0]?.id || 0,
          meta_description: post.meta_description || '',
          keywords: Array.isArray(post.keywords) ? post.keywords.join(',') : (post.keywords || ''),
          is_active: !!post.is_active,
          is_featured: !!post.is_featured,
        });
      } catch (e) {
        console.error(e);
        setIsLoading(false);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [id, selectedCountry]);

  useEffect(() => {
    if (!summernoteReady || !editorRef.current || isLoading) return;
    const jq = (window as any).jQuery || (window as any).$;
    if (!jq) return;
    const el = jq(editorRef.current);
    if (!el.data('summernote')) {
      el.summernote({
        height: 420,
        minHeight: 240,
        maxHeight: null,
        placeholder: 'اكتب المحتوى هنا...',
        lang: 'ar-AR',
        fontSizes: ['10', '12', '14', '16', '18', '24', '36'],
        buttons: {
          fileUpload: function () {
            const ui = (jq as any).summernote.ui;
            return ui.button({
              contents: '<span class="note-icon-link"></span>',
              tooltip: 'رفع ملف',
              click: async function () {
                const input = document.createElement('input');
                input.type = 'file';
                input.onchange = async () => {
                  const f = input.files && input.files[0];
                  if (!f) return;
                  const fd = new FormData();
                  fd.append('file', f);
                  try {
                    const resp = await fetch('/api/upload/file', { method: 'POST', body: fd });
                    const json = await resp.json();
                    const url = (json as any).url ?? (json as any).data?.url;
                    const name = (json as any).name ?? (json as any).data?.name ?? f.name;
                    if (url) {
                      const a = document.createElement('a');
                      a.href = url;
                      a.textContent = name;
                      a.target = '_blank';
                      el.summernote('insertNode', a);
                    }
                  } catch (err) {
                    console.error(err);
                  }
                };
                input.click();
              },
            });
          },
        },
        toolbar: [
          ['style', ['style']],
          ['font', ['bold', 'italic', 'underline', 'clear']],
          ['fontname', ['fontname']],
          ['fontsize', ['fontsize']],
          ['color', ['color']],
          ['para', ['ul', 'ol', 'paragraph']],
          ['table', ['table']],
          ['insert', ['link', 'picture', 'video', 'fileUpload']],
          ['view', ['fullscreen', 'codeview', 'help']],
        ],
        popover: {
          image: [
            ['resize', ['resizeFull', 'resizeHalf', 'resizeQuarter', 'resizeNone']],
            ['float', ['floatLeft', 'floatRight', 'floatNone']],
            ['remove', ['removeMedia']],
          ],
          link: [
            ['link', ['linkDialogShow', 'unlink']],
          ],
          table: [
            ['add', ['addRowDown', 'addRowUp', 'addColLeft', 'addColRight']],
            ['delete', ['deleteRow', 'deleteCol', 'deleteTable']],
          ],
        },
        styleTags: ['p', 'blockquote', 'pre', 'h1', 'h2', 'h3', 'h4'],
        fontNames: ['Cairo', 'Tajawal', 'Almarai', 'Arial', 'Helvetica', 'Times New Roman', 'Courier New'],
        fontNamesIgnoreCheck: ['Cairo', 'Tajawal', 'Almarai'],
        disableDragAndDrop: true,
        dialogsInBody: true,
        callbacks: {
          onInit: () => {
            if (formData.content) {
              el.summernote('code', formData.content);
            }
          },
          onChange: (contents: string) => {
            setFormData((prev) => ({ ...prev, content: contents }));
          },
          onImageUpload: async (files: File[]) => {
            if (!files || !files.length) return;
            const file = files[0];
            const fd = new FormData();
            fd.append('file', file);
            fd.append('width', '1920');
            fd.append('quality', '85');
            fd.append('convert_to_webp', 'true');
            try {
              const resp = await fetch('/api/upload/image', {
                method: 'POST',
                body: fd,
                credentials: 'include'
              });
              const json = await resp.json();
              if (!resp.ok) {
                throw new Error(json.message || 'فشل رفع الصورة');
              }
              const url = json?.data?.url ?? json?.url;
              console.log('[Upload] Response:', json, 'URL:', url);
              if (url) {
                // Create image element and insert it
                const $img = $('<img>').attr({
                  src: url,
                  alt: file.name
                }).css({
                  'max-width': '100%',
                  'height': 'auto'
                });
                el.summernote('insertNode', $img[0]);
                console.log('[Upload] Image inserted successfully');
              } else {
                console.error('No URL returned from upload', json);
              }
            } catch (err) {
              console.error('Upload image error', err);
            }
          },
        },
      });

      const noteEditor = el.next('.note-editor');
      noteEditor.find('.note-toolbar').attr('dir', 'rtl').css('direction', 'rtl');
      noteEditor.find('.note-btn-group').css('direction', 'ltr');
      const editable = noteEditor.find('.note-editable');
      editable.attr('dir', 'rtl');
      editable.css('font-family', 'Cairo, Tajawal, Almarai, sans-serif');
      editable.css('text-align', 'right');
      editable.css('direction', 'rtl');
      noteEditor.find('.dropdown-menu').css('text-align', 'right');
    }
    
    // Capture ref value for cleanup
    const currentRef = editorRef.current;
    
    return () => {
      try {
        if (currentRef) {
          (window as any).jQuery(currentRef).summernote('destroy');
        }
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summernoteReady, isLoading]); // Exclude formData.content to avoid re-init loop
  


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

  const canSubmit =
    (formData.title || '').trim() !== '' &&
    (formData.title || '').length <= 60 &&
    (formData.content || '').trim() !== '' &&
    !!formData.category_id &&
    !isTitleDuplicate;

  const handleSubmit = async () => {
    if (!canSubmit || isTitleDuplicate) return;
    try {
      setIsSubmitting(true);
      await postsService.update(id, {
        country: selectedCountry,
        title: formData.title,
        content: formData.content,
        category_id: Number(formData.category_id),
        meta_description: formData.meta_description || undefined,
        keywords: formData.keywords || undefined,
        is_active: !!formData.is_active,
        is_featured: !!formData.is_featured,
        image: formData.image,
        attachments: formData.attachments,
      });
      toast.success('تم تعديل المنشور بنجاح');
      router.push('/dashboard/posts');
    } catch (e) {
      console.error(e);
      const errorInfo = extractError(e);
      toast.error(errorInfo.message || 'حدث خطأ أثناء تعديل المنشور');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Select
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value as '1' | '2' | '3' | '4')}
            options={COUNTRIES.map((c) => ({ value: c.id, label: c.name }))}
            className="w-48"
          />
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => router.push('/dashboard/posts')}>
            إلغاء
          </Button>
          <Button
            onClick={handleSubmit}
            isLoading={isSubmitting || isLoading}
            disabled={!canSubmit || isSubmitting || isLoading}
            rightIcon={<Save className="w-4 h-4" />}
            className="px-6"
          >
            حفظ التعديلات
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <style>{`
            .note-editor .dropdown-menu,
            .note-editor .note-dropdown-menu {
              z-index: 3000;
            }
            .note-editor .note-editable {
              direction: rtl;
              text-align: right;
              font-family: Cairo, Tajawal, Almarai, sans-serif;
            }
            .note-editor.note-frame {
              border: 1px solid hsl(var(--border));
              border-radius: 0.75rem;
              overflow: hidden;
            }
            .note-toolbar {
              background-color: hsl(var(--secondary) / 0.5) !important;
              border-bottom: 1px solid hsl(var(--border)) !important;
            }
            .note-statusbar {
              background-color: hsl(var(--secondary) / 0.3) !important;
              border-top: 1px solid hsl(var(--border)) !important;
            }
          `}</style>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                <CardTitle>تعديل المنشور</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <Input
                label="عنوان المنشور"
                value={formData.title}
                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="أدخل عنوان المنشور"
                error={
                  isTitleDuplicate 
                    ? 'هذا العنوان مستخدم مسبقاً' 
                    : isCheckingTitle 
                      ? 'جاري التحقق...' 
                      : (formData.title || '').length > 60 
                        ? `العنوان طويل جداً (${(formData.title || '').length}/60)` 
                        : undefined
                }
              />
              <div className="space-y-2">
                <span className="block text-sm font-medium mb-2">المحتوى</span>
                <div ref={editorRef} id="summernote" className="w-full bg-card" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-primary" />
                <CardTitle>تحسين محركات البحث</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <Select
                label="الفئة"
                value={formData.category_id}
                onChange={(e) => setFormData((prev) => ({ ...prev, category_id: Number((e.target as any).value) }))}
                options={categoryOptions}
              />
              <Input
                label="الوصف التعريفي"
                value={formData.meta_description || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, meta_description: e.target.value }))}
                placeholder="وصف قصير يظهر لمحركات البحث (اختياري)"
              />
              <Input
                label="الكلمات المفتاحية"
                value={formData.keywords || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, keywords: e.target.value }))}
                placeholder="اكتب كلمات مفصولة بفاصلة ، مثل: تعليم، دراسة"
              />
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={!!formData.is_active}
                    onChange={(e) => setFormData((prev) => ({ ...prev, is_active: e.target.checked }))}
                    className="sr-only peer"
                    id="post-active"
                  />
                  <label htmlFor="post-active" className="relative inline-flex items-center cursor-pointer">
                    <div className="w-11 h-6 bg-muted rounded-full transition-colors peer-checked:bg-primary relative">
                      <span className="absolute top-[2px] right-[2px] h-5 w-5 rounded-full bg-white border border-border transition-all peer-checked:right-[22px]"></span>
                    </div>
                  </label>
                  <span className={`text-sm ${formData.is_active ? 'text-success' : 'text-muted-foreground'}`}>
                    {formData.is_active ? 'نشط' : 'معطل'}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={!!formData.is_featured}
                    onChange={(e) => setFormData((prev) => ({ ...prev, is_featured: e.target.checked }))}
                    className="sr-only peer"
                    id="post-featured"
                  />
                  <label htmlFor="post-featured" className="relative inline-flex items-center cursor-pointer">
                    <div className="w-11 h-6 bg-muted rounded-full transition-colors peer-checked:bg-primary relative">
                      <span className="absolute top-[2px] right-[2px] h-5 w-5 rounded-full bg-white border border-border transition-all peer-checked:right-[22px]"></span>
                    </div>
                  </label>
                  <span className={`text-sm ${formData.is_featured ? 'text-info' : 'text-muted-foreground'}`}>
                    {formData.is_featured ? 'مميز' : 'غير مميز'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-primary" />
                <CardTitle>الصورة الرئيسية</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {currentImageUrl ? (
                <div className="rounded-lg border border-border overflow-hidden">
                  <Image 
                    src={currentImageUrl} 
                    alt="الصورة الحالية" 
                    width={800}
                    height={400}
                    className="w-full h-auto"
                    style={{ width: '100%', height: 'auto' }}
                  />
                </div>
              ) : null}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setFormData((prev) => ({ ...prev, image: e.target.files?.[0] }))}
                className="w-full rounded-lg border border-border bg-card px-4 py-2.5 text-sm"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-primary" />
                <CardTitle>مرفقات</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <input
                type="file"
                multiple
                onChange={(e) => setFormData((prev) => ({ ...prev, attachments: Array.from(e.target.files || []) }))}
                className="w-full rounded-lg border border-border bg-card px-4 py-2.5 text-sm"
              />
              {existingAttachments && existingAttachments.length > 0 ? (
                <div className="space-y-2">
                  <span className="text-sm font-medium">المرفقات الحالية</span>
                  <ul className="space-y-1">
                    {existingAttachments.map((att) => (
                      <li key={att.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                        <span className="truncate">{att.file_name}</span>
                        {att.file_url || att.file_path ? (
                          <a
                            href={att.file_url || att.file_path}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            عرض
                          </a>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
