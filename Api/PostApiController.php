<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Log;
use App\Models\Post;
use App\Models\File;
use App\Models\Category;
use App\Models\Keyword;
use App\Services\SecureFileUploadService;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use App\Http\Resources\Api\PostResource;
use App\Http\Resources\BaseResource;

class PostApiController extends Controller
{
    protected $uploadService;

    public function __construct(SecureFileUploadService $uploadService)
    {
        $this->uploadService = $uploadService;
    }

    /** ------------------------------
     *  Helper: Resolve country DB
     * ------------------------------ */
    private function connection(string $country): string
    {
        return match ($country) {
            '1','jordan','jo'    => 'jo',
            '2','sa','saudi'     => 'sa',
            '3','egypt','eg'     => 'eg',
            '4','palestine','ps' => 'ps',
            default => throw new NotFoundHttpException("Invalid country"),
        };
    }

    /**
     * Accept legacy and current country keys from query/body.
     */
    private function resolveCountry(Request $request, string $fallback = '1'): string
    {
        return (string) $request->input(
            'country',
            $request->input('database', $request->input('country_id', $fallback))
        );
    }

    /** ------------------------------
     *  GET /api/posts
     * ------------------------------ */
    public function index(Request $request)
    {
        $country = $this->resolveCountry($request);
        $db = $this->connection($country);

        $posts = Post::on($db)
            ->with(['category'])
            ->when($request->input('search'), fn($q, $search) =>
                $q->where('title', 'like', "%$search%")
                  ->orWhere('content', 'like', "%$search%"))
            ->orderBy('id', 'desc')
            ->paginate($request->get('per_page', 10));

        return PostResource::collection($posts)
            ->additional([
                'success' => true,
                'country' => $country,
            ]);
    }

    /** ------------------------------
     *  GET /api/posts/{id}
     * ------------------------------ */
    public function show(Request $request, $id)
    {
        $country = $this->resolveCountry($request);
        $db = $this->connection($country);

        $post = Post::on($db)
            ->with(['attachments', 'category'])
            ->findOrFail($id);

        return new PostResource($post);
    }

    /** ------------------------------
     *  POST /api/posts
     * ------------------------------ */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'country'      => 'required|string',
            'title'        => 'required|string|max:255',
            'content'      => 'required|string',
            'category_id'  => 'required|integer',
            'meta_description' => 'nullable|string|max:255',
            'keywords'     => 'nullable|string|max:255',
            'is_active'    => 'boolean',
            'is_featured'  => 'boolean',
            'image'        => 'nullable|file|mimes:jpg,jpeg,png,webp|max:40960',
            'attachments.*'=> 'file|max:40960'
        ]);

        $db = $this->connection($validated['country']);

        DB::connection($db)->beginTransaction();

        try {

            /** --- Upload Featured Image --- */
            $imagePath = 'posts/default_post_image.jpg';
            if ($request->hasFile('image')) {
                $imagePath = $this->uploadService->securelyStoreFile(
                    $request->file('image'),
                    'images/posts',
                    true
                );
            }

            /** --- Create Slug --- */
            $slug = Str::slug($validated['title']) . '-' . time();

            /** --- Create Post --- */
            $post = new Post();
            $post->setConnection($db);
            $post->title = $validated['title'];
            $post->content = $validated['content'];
            $post->slug = $slug;
            $post->category_id = $validated['category_id'];
            $post->meta_description = $validated['meta_description'] 
                ?: Str::limit(strip_tags($validated['content']), 160);
            $post->keywords = $validated['keywords'] ?? '';
            $post->image = $imagePath;
            $post->is_active = $request->boolean('is_active', true);
            $post->is_featured = $request->boolean('is_featured', false);
            $post->country = $validated['country'];
            $post->author_id = Auth::id();
            $post->save();

            /** --- Attach Keywords --- */
            if (!empty($post->keywords)) {
                foreach (array_map('trim', explode(',', $post->keywords)) as $kw) {
                    if ($kw === '') continue;
                    $kwModel = Keyword::on($db)->firstOrCreate(['keyword' => $kw]);
                    $post->keywords()->syncWithoutDetaching([$kwModel->id]);
                }
            }

            /** --- Attach Files --- */
            if ($request->hasFile('attachments')) {
                foreach ($request->file('attachments') as $file) {
                    $fileInfo = $this->uploadService->securelyStoreFile($file, 'files/posts', false);

                    File::on($db)->create([
                        'post_id' => $post->id,
                        'file_path' => $fileInfo,
                        'file_type' => $file->extension(),
                        'file_category' => 'attachment',
                        'file_name' => $file->getClientOriginalName(),
                        'file_size' => $file->getSize(),
                        'mime_type' => $file->getMimeType(),
                    ]);
                }
            }

            DB::connection($db)->commit();

            return (new PostResource($post))
                ->additional([
                    'message' => 'Post created successfully',
                ]);

        } catch (\Exception $e) {
            DB::connection($db)->rollBack();
            Log::error("API Post Create Failed: " . $e->getMessage());
            return (new BaseResource(['message' => 'Failed to create post', 'error' => $e->getMessage()]))
                ->response($request)
                ->setStatusCode(500);
        }
    }

    /** ------------------------------
     *  PUT /api/posts/{id}
     * ------------------------------ */
    public function update(Request $request, $id)
    {
        $validated = $request->validate([
            'country'      => 'required|string',
            'title'        => 'required|string|max:255',
            'content'      => 'required|string',
            'category_id'  => 'required|integer',
            'meta_description' => 'nullable|string|max:255',
            'keywords'     => 'nullable|string|max:255',
            'is_active'    => 'boolean',
            'is_featured'  => 'boolean',
            'image'        => 'nullable|file|mimes:jpg,jpeg,png,webp|max:40960',
            'attachments.*'=> 'file|max:40960'
        ]);

        $db = $this->connection($validated['country']);
        $post = Post::on($db)->findOrFail($id);

        DB::connection($db)->beginTransaction();

        try {

            /** --- Update image if new uploaded --- */
            if ($request->hasFile('image')) {
                Storage::disk('public')->delete($post->image);
                $post->image = $this->uploadService->securelyStoreFile(
                    $request->file('image'),
                    'images/posts',
                    true
                );
            }

            $post->title = $validated['title'];
            $post->content = $validated['content'];
            $post->category_id = $validated['category_id'];
            $post->meta_description = $validated['meta_description'] 
                ?: Str::limit(strip_tags($validated['content']), 160);
            $post->keywords = $validated['keywords'] ?? '';
            $post->is_active = $request->boolean('is_active', true);
            $post->is_featured = $request->boolean('is_featured', false);
            $post->author_id = Auth::id();
            $post->save();

            /** --- Refresh Keywords --- */
            $post->keywords()->detach();
            foreach (array_map('trim', explode(',', $post->keywords)) as $kw) {
                if ($kw !== '') {
                    $kwModel = Keyword::on($db)->firstOrCreate(['keyword' => $kw]);
                    $post->keywords()->syncWithoutDetaching([$kwModel->id]);
                }
            }

            /** --- New Attachments --- */
            if ($request->hasFile('attachments')) {
                foreach ($request->file('attachments') as $file) {
                    $fileInfo = $this->uploadService->securelyStoreFile($file, 'files/posts', false);

                    File::on($db)->create([
                        'post_id' => $post->id,
                        'file_path' => $fileInfo,
                        'file_type' => $file->extension(),
                        'file_category' => 'attachment',
                        'file_name' => $file->getClientOriginalName(),
                        'file_size' => $file->getSize(),
                        'mime_type' => $file->getMimeType(),
                    ]);
                }
            }

            DB::connection($db)->commit();

            return (new PostResource($post))
                ->additional([
                    'message' => 'Post updated successfully',
                ]);

        } catch (\Exception $e) {
            DB::connection($db)->rollBack();
            return (new BaseResource(['message' => 'Failed to update post', 'error' => $e->getMessage()]))
                ->response($request)
                ->setStatusCode(500);
        }
    }

    /** ------------------------------
     *  DELETE /api/posts/{id}
     * ------------------------------ */
    public function destroy(Request $request, $id)
    {
        $country = $this->resolveCountry($request);
        $db = $this->connection($country);

        $post = Post::on($db)->findOrFail($id);

        DB::connection($db)->beginTransaction();

        try {
            Storage::disk('public')->delete($post->image);
            $post->attachments()->delete();
            $post->delete();

            DB::connection($db)->commit();

            return new BaseResource([
                'message' => 'Post deleted successfully'
            ]);

        } catch (\Exception $e) {
            DB::connection($db)->rollBack();
            return (new BaseResource(['message' => 'Failed to delete post', 'error' => $e->getMessage()]))
                ->response($request)
                ->setStatusCode(500);
        }
    }

}
