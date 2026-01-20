<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Comment;
use App\Models\Post;
use App\Models\Article;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Auth;
use Illuminate\Http\Request;
use Throwable;
use App\Http\Resources\BaseResource;

class CommentApiController extends Controller
{
    /**
     * CREATE COMMENT (API)
     */
    public function store(Request $request, $database)
    {
        try {
            $request->validate([
                'body' => 'required|string',
                'commentable_id' => 'required|integer',
                'commentable_type' => 'required|string|in:App\Models\Post,App\Models\Article',
            ]);

            DB::connection($database)->beginTransaction();

            // Fetch post/article from correct DB
            $content = app($request->commentable_type)
                ::on($database)
                ->find($request->commentable_id);

            if (!$content) {
                return (new BaseResource(['message' => 'Content not found']))
                    ->response($request)
                    ->setStatusCode(404);
            }

            // Create comment
            $comment = new Comment();
            $comment->setConnection($database);
            $comment->fill([
                'body' => $request->body,
                'user_id' => Auth::id(),
                'commentable_id' => $request->commentable_id,
                'commentable_type' => $request->commentable_type,
                'database' => $database,
            ]);

            $comment->save();

            // Clear cache (Article only)
            if ($request->commentable_type === Article::class) {
                $articleCacheKey = sprintf('article_full_%s_%d', $database, $content->id);
                $articleRenderedKey = sprintf(
                    'article_rendered_%s_%d_%d',
                    $database,
                    $content->id,
                    $content->updated_at?->getTimestamp() ?? 0
                );
                Cache::forget($articleCacheKey);
                Cache::forget($articleRenderedKey);
            }

            // Build a comment URL for Activity Log only
            $commentUrl = url("/$database/content/{$request->commentable_id}") . "#comment-" . $comment->id;

            // Log activity
            try {
                activity()
                    ->performedOn($content)
                    ->causedBy(Auth::user())
                    ->withProperties([
                        'type' => 'comment',
                        'url' => $commentUrl,
                        'comment_id' => $comment->id,
                        'database' => $database,
                        'commentable_type' => $request->commentable_type,
                        'commentable_id' => $request->commentable_id,
                    ])
                    ->log('commented');
            } catch (Throwable $e) {
                Log::warning('Failed activity log for comment', ['error' => $e->getMessage()]);
            }

            DB::connection($database)->commit();

            return new BaseResource([
                'message' => 'Comment added successfully',
                'comment' => $comment
            ]);

        } catch (Throwable $e) {
            DB::connection($database)->rollBack();
            Log::error('Comment Create Error: ' . $e->getMessage());

            return (new BaseResource(['message' => 'Failed to create comment']))
                ->response($request)
                ->setStatusCode(500);
        }
    }

    /**
     * DELETE COMMENT (API)
     */
    public function destroy(Request $request, $database, $id)
    {
        try {
            DB::connection($database)->beginTransaction();

            $comment = Comment::on($database)
                ->where('database', $database)
                ->findOrFail($id);

            // Permission: owner or admin
            $user = Auth::user();
            $canDelete = $user &&
                ($user->id === $comment->user_id ||
                 $user->loadMissing('roles')->roles->contains('name', 'Admin'));

            if (!$canDelete) {
                return (new BaseResource(['message' => 'Unauthorized to delete this comment']))
                    ->response($request)
                    ->setStatusCode(403);
            }

            // Delete reactions first
            if ($comment->reactions()->count() > 0) {
                $comment->reactions()->delete();
            }

            $commentableType = $comment->commentable_type;
            $commentableId = $comment->commentable_id;

            $deleted = $comment->delete();

            if (!$deleted) {
                throw new \Exception('Failed to delete comment');
            }

            // Clear Article cache if applicable
            if ($commentableType === Article::class) {
                $article = Article::on($database)->find($commentableId);

                $cacheKey1 = sprintf('article_full_%s_%d', $database, $commentableId);
                Cache::forget($cacheKey1);

                if ($article) {
                    $cacheKey2 = sprintf(
                        'article_rendered_%s_%d_%d',
                        $database,
                        $article->id,
                        $article->updated_at?->getTimestamp() ?? 0
                    );
                    Cache::forget($cacheKey2);
                }
            }

            DB::connection($database)->commit();

            return new BaseResource([
                'message' => 'Comment deleted successfully'
            ]);

        } catch (Throwable $e) {
            DB::connection($database)->rollBack();
            Log::error('Comment Delete Error: ' . $e->getMessage());

            return (new BaseResource(['message' => 'Failed to delete comment']))
                ->response($request)
                ->setStatusCode(500);
        }
    }
}
