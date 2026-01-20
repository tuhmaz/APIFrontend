<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Article;
use App\Models\Subject;
use App\Models\Semester;
use App\Models\SchoolClass;
use App\Models\File;
use App\Models\User;
use App\Models\Keyword;
use App\Notifications\ArticleNotification;
use App\Services\SecureFileUploadService;
use App\Services\OneSignalService;
use App\Http\Resources\ArticleResource;
use App\Http\Resources\ArticleCollection;
use App\Http\Resources\BaseResource;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class ArticleApiController extends Controller
{
    /**
     * @var SecureFileUploadService
     */
    protected $secureFileUploadService;

    /**
     * @var OneSignalService
     */
    protected $oneSignalService;

    public function __construct(
        SecureFileUploadService $secureFileUploadService,
        OneSignalService $oneSignalService
    ) {
        $this->secureFileUploadService = $secureFileUploadService;
        $this->oneSignalService = $oneSignalService;

        // API عادة ستستخدم auth:sanctum في routes/api.php
        // هنا نضمن أن المستخدم مصدّق
        $this->middleware('auth:sanctum');
    }

    /**
     * خريطة الدول المتاحة
     */
    private function getAvailableCountries(): array
    {
        return [
            ['id' => 1, 'name' => 'الأردن',   'code' => 'jo'],
            ['id' => 2, 'name' => 'السعودية', 'code' => 'sa'],
            ['id' => 3, 'name' => 'مصر',      'code' => 'eg'],
            ['id' => 4, 'name' => 'فلسطين',   'code' => 'ps'],
        ];
    }

    /**
     * تحديد اتصال قاعدة البيانات حسب الدولة
     */
    private function getConnection($countryId = null): string
    {
        if (!$countryId) {
            return 'jo';
        }

        if (is_string($countryId)) {
            $code = strtolower($countryId);
            return in_array($code, ['jo','sa','eg','ps']) ? $code : 'jo';
        }

        $countryId = (int) $countryId;

        return match ($countryId) {
            2 => 'sa',
            3 => 'eg',
            4 => 'ps',
            default => 'jo',
        };
    }

    /**
     * GET /api/articles
     * قائمة المقالات مع paginate
     */
    public function index(Request $request)
    {
        $country    = $request->input('country', 1);
        $connection = $this->getConnection($country);

        $perPage = (int) $request->input('per_page', 25);

        $query = Article::on($connection)
            ->with(['schoolClass', 'subject', 'semester', 'keywords', 'files'])
            ->orderByDesc('created_at');

        // يمكن إضافة فلاتر اختيارية مثلاً بالعنوان أو المادة لاحقاً
        if ($search = $request->input('q')) {
            $query->where('title', 'like', '%' . $search . '%');
        }

        if ($subjectId = $request->input('subject_id')) {
            $query->where('subject_id', $subjectId);
        }

        if ($semesterId = $request->input('semester_id')) {
            $query->where('semester_id', $semesterId);
        }

        if (!is_null($request->input('status'))) {
            $status = filter_var($request->input('status'), FILTER_VALIDATE_BOOLEAN);
            $query->where('status', $status);
        }

        $articles = $query->paginate($perPage);

        return (new ArticleCollection($articles->items()))
            ->additional([
                'pagination' => [
                    'current_page' => $articles->currentPage(),
                    'per_page'     => $articles->perPage(),
                    'total'        => $articles->total(),
                    'last_page'    => $articles->lastPage(),
                ],
                'country' => $country,
            ]);
    }

    /**
     * GET /api/articles/create
     * بيانات المساعدة لإنشاء مقال (قوائم الصفوف، المواد، الفصول)
     */
    public function create(Request $request)
    {
        $country    = $request->input('country', 1);
        $connection = $this->getConnection($country);

        $classes   = SchoolClass::on($connection)->get();
        $subjects  = Subject::on($connection)->get();
        $semesters = Semester::on($connection)->get();

        return new BaseResource([
            'country'   => $country,
            'classes'   => $classes,
            'subjects'  => $subjects,
            'semesters' => $semesters,
        ]);
    }

    /**
     * POST /api/articles
     * إنشاء مقال جديد
     */
    public function store(Request $request)
    {
        $country    = $request->input('country', '1');
        $connection = $this->getConnection($country);

        $validated = $request->validate([
            'country'      => 'required|string',
            'class_id'     => 'required|exists:school_classes,id',
            'subject_id'   => 'required|exists:subjects,id',
            'semester_id'  => 'required|exists:semesters,id',
            'title'        => [
                'required',
                'string',
                'max:60',
                function ($attribute, $value, $fail) use ($connection) {
                    $existingArticle = Article::on($connection)->where('title', $value)->first();
                    if ($existingArticle) {
                        $fail('عنوان المقال موجود بالفعل. يرجى اختيار عنوان فريد.');
                    }
                }
            ],
            'content'          => 'required',
            'keywords'         => 'nullable|string',
            'file_category'    => 'required|string',
            'file'             => 'nullable|file|mimes:pdf,doc,docx,xls,xlsx,ppt,pptx,txt,zip,rar,jpg,jpeg,png,gif,webp|max:51200',
            'image'            => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:10240|dimensions:min_width=100,min_height=100',
            'meta_description' => 'nullable|string|max:120',
            'file_name'        => 'nullable|string|max:255',
            'status'           => 'nullable|boolean',
        ]);

        $article = null;

        DB::connection($connection)->transaction(function () use ($request, $validated, $country, $connection, &$article) {

            $metaDescription = $request->meta_description;

            if ($request->boolean('use_title_for_meta') && !$metaDescription) {
                $metaDescription = Str::limit($request->title, 120);
            }

            if ($request->boolean('use_keywords_for_meta') && !$metaDescription && $request->keywords) {
                $metaDescription = Str::limit($request->keywords, 120);
            }

            if (!$metaDescription) {
                $metaDescription = Str::limit(strip_tags($request->content), 120);
            }

            // صورة المقال
            $imagePath = 'default.webp';
            if ($request->hasFile('image')) {
                $imagePath = $this->securelyStoreArticleImage($request->file('image'));
            }

            $article = Article::on($connection)->create([
                'grade_level'      => $request->class_id,
                'subject_id'       => $request->subject_id,
                'semester_id'      => $request->semester_id,
                'title'            => $request->title,
                'content'          => $request->content,
                'meta_description' => $metaDescription,
                'author_id'        => Auth::id(),
                'status'           => $request->has('status') ? (bool) $request->status : false,
                'image'            => $imagePath,
            ]);

            // الكلمات المفتاحية
            if ($request->keywords) {
                $keywords = array_map('trim', explode(',', $request->keywords));

                foreach ($keywords as $keyword) {
                    if ($keyword === '') {
                        continue;
                    }
                    $keywordModel = Keyword::on($connection)->firstOrCreate(['keyword' => $keyword]);
                    $article->keywords()->attach($keywordModel->id);
                }
            }

            // الملف المرفق
            if ($request->hasFile('file')) {
                try {
                    $schoolClass   = SchoolClass::on($connection)->find($request->class_id);
                    $folderName    = $schoolClass ? $schoolClass->grade_name : 'General';
                    $folderCategory = Str::slug($request->file_category);

                    $countrySlug   = Str::slug($country);
                    $folderNameSlug = Str::slug($folderName);

                    $folderPath = "files/$countrySlug/$folderNameSlug/$folderCategory";

                    $customFilename = $request->input('file_name');

                    $fileInfo = $this->securelyStoreAttachment(
                        $request->file('file'),
                        $folderPath,
                        $customFilename
                    );

                    File::on($connection)->create([
                        'article_id'    => $article->id,
                        'file_path'     => $fileInfo['path'],
                        'file_type'     => $fileInfo['extension'],
                        'file_category' => $request->file_category,
                        'file_name'     => $fileInfo['filename'],
                        'file_size'     => $fileInfo['size'],
                        'mime_type'     => $fileInfo['mime_type']
                    ]);
                } catch (\Exception $e) {
                    Log::error('فشل في تخزين الملف المرفق: ' . $e->getMessage());
                }
            }

            // إشعار OneSignal + Notifications
            $this->sendNotification($article);

            // إرسال التنبيهات لكل الأعضاء (كما في الأصل)
            User::select('id', 'name', 'email')
                ->chunk(200, function ($users) use ($article) {
                    foreach ($users as $user) {
                        $user->notify(new ArticleNotification($article));
                    }
                });
        });

        if (!$article) {
            return (new BaseResource(['message' => 'Failed to create article']))
                ->response($request)
                ->setStatusCode(500);
        }

        return (new ArticleResource($article->load(['schoolClass', 'subject', 'semester', 'keywords', 'files'])))
            ->response($request)
            ->setStatusCode(201);
    }

    /**
     * GET /api/articles/{id}
     * عرض مقال واحد + توليد روابط داخلية + زيادة visit_count
     */
    public function show(Request $request, $id)
    {
        $country    = $request->input('country', '1');
        $connection = $this->getConnection($country);

        $article = Article::on($connection)
            ->with(['files', 'subject', 'semester', 'schoolClass', 'keywords'])
            ->findOrFail($id);

        $article->increment('visit_count');

        // محتوى مع روابط الكلمات المفتاحية
        $contentWithKeywords = $this->replaceKeywordsWithLinks($article->content, $article->keywords);
        $internalLinked      = $this->createInternalLinks($article->content, $article->keywords);

        return (new ArticleResource($article))
            ->additional([
                'country' => $country,
                'content_with_keywords' => $contentWithKeywords,
                'content_internal' => $internalLinked,
            ]);
    }

    /**
     * GET /api/articles/{id}/edit
     * بيانات تعديل المقال (المقال + القوائم)
     */
    public function edit(Request $request, $id)
    {
        $country    = $request->input('country', '1');
        $connection = $this->getConnection($country);

        $article = Article::on($connection)->with('files', 'keywords')->findOrFail($id);

        $classes   = SchoolClass::on($connection)->get();
        $subjects  = Subject::on($connection)->where('grade_level', $article->grade_level)->get();
        $semesters = Semester::on($connection)->where('grade_level', $article->grade_level)->get();

        return (new ArticleResource($article))
            ->additional([
                'country' => $country,
                'classes' => $classes,
                'subjects' => $subjects,
                'semesters' => $semesters,
            ]);
    }

    /**
     * PUT /api/articles/{id}
     * تحديث مقال
     */
    public function update(Request $request, $id)
    {
        $country    = $request->input('country', '1');
        $connection = $this->getConnection($country);

        $validated = $request->validate([
            'class_id'      => 'required|exists:school_classes,id',
            'subject_id'    => 'required|exists:subjects,id',
            'semester_id'   => 'required|exists:semesters,id',
            'title'         => [
                'required',
                'string',
                'max:60',
                function ($attribute, $value, $fail) use ($connection, $id) {
                    $existingArticle = Article::on($connection)
                        ->where('title', $value)
                        ->where('id', '!=', $id)
                        ->first();
                    if ($existingArticle) {
                        $fail('عنوان المقال موجود بالفعل. يرجى اختيار عنوان فريد.');
                    }
                }
            ],
            'content'          => 'required',
            'keywords'         => 'nullable|string',
            'file_category'    => 'required|string',
            'file'             => 'nullable|file|mimes:pdf,doc,docx,xls,xlsx,ppt,pptx,txt,zip,rar,jpg,jpeg,png,gif,webp|max:51200',
            'new_file'         => 'nullable|file|mimes:pdf,doc,docx,xls,xlsx,ppt,pptx,txt,zip,rar,jpg,jpeg,png,gif,webp|max:51200',
            'image'            => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:10240|dimensions:min_width=100,min_height=100',
            'meta_description' => 'nullable|string|max:120',
            'file_name'        => 'nullable|string|max:255',
            'status'           => 'nullable|boolean',
        ]);

        $article = Article::on($connection)->with('files', 'keywords')->findOrFail($id);

        $metaDescription = $request->meta_description;
        if (!$metaDescription) {
            if ($request->keywords) {
                $metaDescription = Str::limit($request->keywords, 120);
            } else {
                $metaDescription = Str::limit(strip_tags($request->content), 120);
            }
        }

        $article->grade_level      = $request->class_id;
        $article->subject_id       = $request->subject_id;
        $article->semester_id      = $request->semester_id;
        $article->title            = $request->title;
        $article->content          = $request->content;
        $article->meta_description = $metaDescription;
        $article->status           = $request->has('status') ? (bool) $request->status : false;

        // تحديث صورة المقال
        if ($request->hasFile('image')) {
            try {
                if ($article->image && $article->image !== 'default.webp') {
                    Storage::disk('public')->delete('images/articles/' . $article->image);
                }

                $article->image = $this->securelyStoreArticleImage($request->file('image'));
            } catch (\Exception $e) {
                Log::error('فشل في تحديث صورة المقال: ' . $e->getMessage());
            }
        }

        $article->save();

        // تحديث الكلمات المفتاحية
        if ($request->keywords) {
            $keywords = array_map('trim', explode(',', $request->keywords));

            $article->keywords()->detach();

            foreach ($keywords as $keyword) {
                if ($keyword === '') {
                    continue;
                }
                $keywordModel = Keyword::on($connection)->firstOrCreate(['keyword' => $keyword]);
                $article->keywords()->attach($keywordModel->id);
            }
        }

        // تحديث الملف المرفق (new_file) إن وجد
        if ($request->hasFile('new_file')) {
            try {
                $currentFile = $article->files->first();
                if ($currentFile) {
                    if (Storage::disk('public')->exists($currentFile->file_path)) {
                        Storage::disk('public')->delete($currentFile->file_path);
                    }
                    $currentFile->delete();
                }

                $schoolClass    = SchoolClass::on($connection)->find($request->class_id);
                $folderName     = $schoolClass ? $schoolClass->grade_name : 'General';
                $folderNameSlug = Str::slug($folderName);
                $folderCategory = Str::slug($request->file_category);
                $countrySlug    = Str::slug($country);
                $folderPath     = "files/$countrySlug/$folderNameSlug/$folderCategory";

                $customFilename = $request->input('file_name');

                $fileInfo = $this->securelyStoreAttachment(
                    $request->file('new_file'),
                    $folderPath,
                    $customFilename
                );

                File::on($connection)->create([
                    'article_id'    => $article->id,
                    'file_path'     => $fileInfo['path'],
                    'file_type'     => $fileInfo['extension'],
                    'file_category' => $request->file_category,
                    'file_name'     => $fileInfo['filename'],
                    'file_size'     => $fileInfo['size'],
                    'mime_type'     => $fileInfo['mime_type']
                ]);
            } catch (\Exception $e) {
                Log::error('فشل في تحديث الملف المرفق: ' . $e->getMessage());
            }
        }

        return new ArticleResource($article->load(['schoolClass', 'subject', 'semester', 'keywords', 'files']));
    }

    /**
     * DELETE /api/articles/{id}
     * حذف المقال والملفات والصورة
     */
    public function destroy(Request $request, $id)
    {
        $country    = $request->input('country', '1');
        $connection = $this->getConnection($country);

        $article = Article::on($connection)->with('files')->findOrFail($id);

        // حذف صورة المقال
        $imageName = $article->image;
        if ($imageName && $imageName !== 'default.webp') {
            if (Storage::disk('public')->exists('images/articles/' . $imageName)) {
                Storage::disk('public')->delete('images/articles/' . $imageName);
            }
        }

        // حذف الملفات
        foreach ($article->files as $file) {
            if (Storage::disk('public')->exists($file->file_path)) {
                Storage::disk('public')->delete($file->file_path);
            }
            $file->delete();
        }

        $article->delete();

        return new BaseResource([
            'message' => 'تم حذف المقال والصور والملفات المرتبطة به بنجاح.',
        ]);
    }

    /**
     * GET /api/articles/by-class/{grade_level}
     * إحضار المقالات حسب الصف
     */
    public function indexByClass(Request $request, $grade_level)
    {
        $country    = $request->input('country', '1');
        $connection = $this->getConnection($country);

        $articles = Article::on($connection)
            ->whereHas('subject', function ($query) use ($grade_level) {
                $query->where('grade_level', $grade_level);
            })
            ->with(['subject', 'semester', 'schoolClass', 'keywords', 'files'])
            ->get();

        return (new ArticleCollection($articles))
            ->additional([
                'country' => $country,
            ]);
    }

    /**
     * GET /api/articles/by-keyword/{keyword}
     * إحضار المقالات حسب كلمة مفتاحية
     */
    public function indexByKeyword(Request $request, $keyword)
    {
        $country    = $request->input('country', '1');
        $connection = $this->getConnection($country);

        $keywordModel = Keyword::on($connection)->where('keyword', $keyword)->firstOrFail();
        $articles     = $keywordModel->articles()->with(['subject', 'semester', 'schoolClass', 'keywords', 'files'])->get();

        return (new ArticleCollection($articles))
            ->additional([
                'country' => $country,
                'keyword' => $keywordModel,
            ]);
    }

    /**
     * POST /api/articles/{id}/publish
     */
    public function publish(Request $request, $id)
    {
        try {
            $country    = $request->input('country', 1);
            $connection = $this->getConnection($country);

            $article = Article::on($connection)->findOrFail($id);
            $article->status = true;
            $article->save();

            return (new ArticleResource($article))
                ->additional([
                    'message' => __('Article published successfully'),
                ]);
        } catch (\Exception $e) {
            Log::error('Error publishing article: ' . $e->getMessage());

            return (new BaseResource(['message' => __('Failed to publish article')]))
                ->response($request)
                ->setStatusCode(500);
        }
    }

    /**
     * POST /api/articles/{id}/unpublish
     */
    public function unpublish(Request $request, $id)
    {
        try {
            $country    = $request->input('country', 1);
            $connection = $this->getConnection($country);

            $article = Article::on($connection)->findOrFail($id);
            $article->status = false;
            $article->save();

            return (new ArticleResource($article))
                ->additional([
                    'message' => __('Article unpublished successfully'),
                ]);
        } catch (\Exception $e) {
            Log::error('Error unpublishing article: ' . $e->getMessage());

            return (new BaseResource(['message' => __('Failed to unpublish article')]))
                ->response($request)
                ->setStatusCode(500);
        }
    }

    /**
     * إرسال إشعار بعد إنشاء المقال
     */
    protected function sendNotification(Article $article): void
    {
        if (!config('onesignal.enabled')) {
            Log::info('OneSignal is disabled via config. Skipping ArticleApiController::sendNotification');
            return;
        }

        try {
            $className = SchoolClass::on($article->getConnectionName())->find($article->grade_level)?->grade_name ?? '';
            $title     = "تم نشر مقال جديد: {$article->title}";
            if ($className) {
                $title .= " (الصف: {$className})";
            }

            $this->oneSignalService->sendNotification($title, $article->title);
        } catch (\Exception $e) {
            Log::warning('Failed to send notification: ' . $e->getMessage());
        }
    }

    /**
     * استبدال الكلمات المفتاحية بروابط
     */
    private function replaceKeywordsWithLinks($content, $keywords)
    {
        foreach ($keywords as $keyword) {
            $database    = session('database', 'jo');
            $keywordText = $keyword->keyword;
            $keywordLink = route('keywords.indexByKeyword', [
                'database' => $database,
                'keywords' => $keywordText,
            ]);

            $content = preg_replace(
                '/\b' . preg_quote($keywordText, '/') . '\b/u',
                '<a href="' . $keywordLink . '">' . $keywordText . '</a>',
                $content
            );
        }

        return $content;
    }

    /**
     * إنشاء روابط داخلية داخل المحتوى للكلمات المفتاحية
     */
    private function createInternalLinks($content, $keywords)
    {
        $keywordsArray = $keywords->pluck('keyword')->toArray();

        foreach ($keywordsArray as $keyword) {
            $database = session('database', 'jo');
            $keyword  = trim($keyword);
            if ($keyword === '') {
                continue;
            }
            $url = route('keywords.indexByKeyword', [
                'database' => $database,
                'keywords' => $keyword,
            ]);

            $content = str_replace($keyword, '<a href="' . $url . '">' . $keyword . '</a>', $content);
        }

        return $content;
    }

    /**
     * تخزين مرفق بشكل آمن
     */
    private function securelyStoreAttachment($file, string $folderPath, ?string $filename = null): array
    {
        try {
            $originalFilename = $file->getClientOriginalName();
            $finalFilename    = $filename ?: $originalFilename;

            $path = $this->secureFileUploadService->securelyStoreFile(
                $file,
                $folderPath,
                false,
                $finalFilename
            );

            return [
                'path'      => $path,
                'filename'  => $finalFilename,
                'size'      => $file->getSize(),
                'mime_type' => $file->getMimeType(),
                'extension' => $file->getClientOriginalExtension(),
            ];
        } catch (\Exception $e) {
            Log::error('فشل في تخزين الملف المرفق: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * تخزين صورة المقال بشكل آمن وتحويلها WebP
     */
    private function securelyStoreArticleImage($file): string
    {
        try {
            return $this->secureFileUploadService->securelyStoreFile(
                $file,
                'images/articles',
                true
            );
        } catch (\Exception $e) {
            Log::error('فشل في تخزين صورة المقال: ' . $e->getMessage());
            return 'default.webp';
        }
    }
}
