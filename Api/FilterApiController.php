<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SchoolClass;
use App\Models\Subject;
use App\Models\Semester;
use App\Models\File;
use App\Models\Article;
use Illuminate\Http\Request;
use App\Http\Resources\BaseResource;

class FilterApiController extends Controller
{
    private function getConnection(Request $request): string
    {
        return $request->query('database', session('database', 'jo'));
    }

    /**
     * GET /api/filter
     * إرجاع نتائج المقالات والملفات بناءً على الفلاتر
     */
    public function index(Request $request)
    {
        $database = $this->getConnection($request);

        // الصفوف لجميع خيارات الفلترة
        $classes = SchoolClass::on($database)->get();

        // إعداد استعلام المقالات
        $articleQuery = Article::on($database);

        if ($request->class_id) {
            $articleQuery->whereHas('semester', function ($q) use ($request) {
                $q->where('grade_level', $request->class_id);
            });
        }

        if ($request->subject_id) {
            $articleQuery->where('subject_id', $request->subject_id);
        }

        if ($request->semester_id) {
            $articleQuery->where('semester_id', $request->semester_id);
        }

        if ($request->file_category) {
            $articleQuery->whereHas('files', function ($q) use ($request) {
                $q->where('file_category', $request->file_category);
            });
        }

        $perPageArticles = max(6, min((int)$request->get('per_page_articles', 12), 48));

        $articles = $articleQuery
            ->with(['subject', 'semester', 'schoolClass'])
            ->latest('id')
            ->paginate($perPageArticles);

        // إعداد استعلام الملفات
        $fileQuery = File::on($database)
            ->when($request->file_category, fn($q) => $q->where('file_category', $request->file_category))
            ->whereHas('article', function ($q) use ($request) {
                if ($request->class_id) {
                    $q->whereHas('semester', fn($s) => $s->where('grade_level', $request->class_id));
                }
                if ($request->subject_id) {
                    $q->where('subject_id', $request->subject_id);
                }
                if ($request->semester_id) {
                    $q->where('semester_id', $request->semester_id);
                }
            });

        $perPageFiles = max(6, min((int)$request->get('per_page_files', 12), 48));

        $files = $fileQuery
            ->with(['article.subject', 'article.semester'])
            ->latest('id')
            ->paginate($perPageFiles);

        return new BaseResource([
            'database' => $database,
            'filters' => [
                'class_id' => $request->class_id,
                'subject_id' => $request->subject_id,
                'semester_id' => $request->semester_id,
                'file_category' => $request->file_category,
            ],
            'classes' => $classes,
            'articles' => $articles,
            'files' => $files
        ]);
    }

    /**
     * GET /api/filter/subjects/{classId}
     */
    public function getSubjectsByClass(Request $request, $classId)
    {
        $database = $this->getConnection($request);

        $schoolClass = SchoolClass::on($database)->find($classId);

        if (!$schoolClass) {
            return (new BaseResource(['message' => 'Class not found']))
                ->response($request)
                ->setStatusCode(404);
        }

        $subjects = Subject::on($database)
            ->where('grade_level', $schoolClass->grade_level)
            ->get();

        return new BaseResource([
            'subjects' => $subjects
        ]);
    }

    /**
     * GET /api/filter/semesters/{subjectId}
     */
    public function getSemestersBySubject(Request $request, $subjectId)
    {
        $database = $this->getConnection($request);

        $subject = Subject::on($database)->find($subjectId);

        if (!$subject) {
            return (new BaseResource(['message' => 'Subject not found']))
                ->response($request)
                ->setStatusCode(404);
        }

        $semesters = Semester::on($database)
            ->where('grade_level', $subject->grade_level)
            ->get();

        return new BaseResource([
            'semesters' => $semesters
        ]);
    }

    /**
     * GET /api/filter/file-types/{semesterId}
     */
    public function getFileTypesBySemester(Request $request, $semesterId)
    {
        $database = $this->getConnection($request);

        $fileTypes = File::on($database)
            ->whereHas('article.semester', function ($q) use ($semesterId) {
                $q->where('id', $semesterId);
            })
            ->distinct()
            ->pluck('file_type');

        return new BaseResource([
            'file_types' => $fileTypes
        ]);
    }
}
