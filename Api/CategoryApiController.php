<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Throwable;
use App\Http\Resources\Api\CategoryResource;
use App\Http\Resources\BaseResource;

class CategoryApiController extends Controller
{
    private array $countries = [
        '1' => 'الأردن',
        '2' => 'السعودية',
        '3' => 'مصر',
        '4' => 'فلسطين'
    ];

    /**
     * تحديد الاتصال حسب الدولة
     */
    private function getConnection(string $country): string
    {
        return match ($country) {
            '1', 'jordan'    => 'jo',
            '2', 'saudi'     => 'sa',
            '3', 'egypt'     => 'eg',
            '4', 'palestine' => 'ps',
            default => throw new NotFoundHttpException(__('Invalid country selected')),
        };
    }

    /**
     * ===========================
     * GET ALL CATEGORIES
     * ===========================
     */
    public function index(Request $request)
    {
        try {
            $country = $request->input('country', '1');
            $connection = $this->getConnection($country);

            $categories = Category::on($connection)
                ->withCount('news')
                ->orderBy('created_at', 'desc')
                ->get();

            return CategoryResource::collection($categories)
                ->additional([
                    'success' => true,
                    'country' => $country,
                ]);

        } catch (Throwable $e) {
            Log::error('Categories API Error: ' . $e->getMessage());
            return (new BaseResource(['message' => 'Failed to load categories']))
                ->response($request)
                ->setStatusCode(500);
        }
    }

    /**
     * ===========================
     * CREATE CATEGORY
     * ===========================
     */
    public function store(Request $request)
    {
        try {
            $validated = $request->validate([
                'country' => 'required|string',
                'name' => 'required|string|max:255',
                'is_active' => 'sometimes|boolean',
                'parent_id' => 'nullable|integer',
                'icon_image' => 'nullable|image|max:2048'
            ]);

            $connection = $this->getConnection($validated['country']);

            DB::connection($connection)->beginTransaction();

            $category = new Category();
            $category->setConnection($connection);
            $category->name = $validated['name'];
            $category->slug = Str::slug($validated['name']);
            $category->is_active = $request->boolean('is_active', true);
            $category->country = $validated['country'];

            // Parent category
            if (!empty($validated['parent_id'])) {
                $exists = Category::on($connection)->where('id', $validated['parent_id'])->exists();
                if (!$exists) {
                    throw new \InvalidArgumentException(__('Parent category does not exist'));
                }
                $category->parent_id = $validated['parent_id'];
            }

            // Icon upload
            if ($request->hasFile('icon_image')) {
                $path = $request->file('icon_image')->store('category_icons', 'public');
                $category->icon = $path;
            }

            $category->save();
            DB::connection($connection)->commit();

            return (new CategoryResource($category))
                ->additional([
                    'message' => 'Category created successfully',
                ]);

        } catch (Throwable $e) {
            if (isset($connection)) {
                DB::connection($connection)->rollBack();
            }

            Log::error('Category Create API Error: ' . $e->getMessage());

            return (new BaseResource(['message' => 'Error creating category: ' . $e->getMessage()]))
                ->response($request)
                ->setStatusCode(500);
        }
    }

    /**
     * ===========================
     * GET SINGLE CATEGORY
     * ===========================
     */
    public function show(Request $request, $id)
    {
        try {
            $country = $request->input('country', '1');
            $connection = $this->getConnection($country);

            $category = Category::on($connection)->findOrFail($id);

            return new CategoryResource($category);

        } catch (Throwable $e) {
            return (new BaseResource(['message' => 'Category not found']))
                ->response($request)
                ->setStatusCode(404);
        }
    }

    /**
     * ===========================
     * UPDATE CATEGORY
     * ===========================
     */
    public function update(Request $request, $id)
    {
        try {
            $validated = $request->validate([
                'country' => 'required|string',
                'name' => 'required|string|max:255',
                'is_active' => 'sometimes|boolean',
                'parent_id' => 'nullable|integer',
                'icon_image' => 'nullable|image|max:2048'
            ]);

            $connection = $this->getConnection($validated['country']);
            $category = Category::on($connection)->findOrFail($id);

            DB::connection($connection)->beginTransaction();

            $category->name = $validated['name'];
            $category->slug = Str::slug($validated['name']);
            $category->is_active = $request->boolean('is_active', true);
            $category->country = $validated['country'];

            // Parent
            if (!empty($validated['parent_id'])) {
                if ($validated['parent_id'] == $category->id) {
                    throw new \InvalidArgumentException(__('Category cannot be its own parent'));
                }
                $exists = Category::on($connection)->where('id', $validated['parent_id'])->exists();
                if (!$exists) {
                    throw new \InvalidArgumentException(__('Parent category does not exist'));
                }
                $category->parent_id = $validated['parent_id'];
            } else {
                $category->parent_id = null;
            }

            // Icon update
            if ($request->hasFile('icon_image')) {
                if (!empty($category->icon)) {
                    Storage::disk('public')->delete($category->icon);
                }
                $path = $request->file('icon_image')->store('category_icons', 'public');
                $category->icon = $path;
            }

            $category->save();
            DB::connection($connection)->commit();

            return (new CategoryResource($category))
                ->additional([
                    'message' => 'Category updated successfully',
                ]);

        } catch (Throwable $e) {
            if (isset($connection)) {
                DB::connection($connection)->rollBack();
            }

            Log::error('Category Update API Error: ' . $e->getMessage());

            return (new BaseResource(['message' => 'Error updating category: ' . $e->getMessage()]))
                ->response($request)
                ->setStatusCode(500);
        }
    }

    /**
     * ===========================
     * DELETE CATEGORY
     * ===========================
     */
    public function destroy(Request $request, $id)
    {
        try {
            $country = $request->input('country', '1');
            $connection = $this->getConnection($country);

            $category = Category::on($connection)->findOrFail($id);

            if ($category->news()->count() > 0) {
                return (new BaseResource(['message' => 'Cannot delete category with associated news']))
                    ->response($request)
                    ->setStatusCode(400);
            }

            DB::connection($connection)->beginTransaction();

            if (!empty($category->icon)) {
                Storage::disk('public')->delete($category->icon);
            }

            $category->delete();

            DB::connection($connection)->commit();

            return new BaseResource([
                'message' => 'Category deleted successfully'
            ]);

        } catch (Throwable $e) {
            Log::error('Category Delete API Error: ' . $e->getMessage());
            return (new BaseResource(['message' => 'Error deleting category']))
                ->response($request)
                ->setStatusCode(500);
        }
    }

    /**
     * ===========================
     * TOGGLE ACTIVE STATUS
     * ===========================
     */
    public function toggleStatus(Request $request, $id)
    {
        try {
            $country = $request->input('country', '1');
            $connection = $this->getConnection($country);

            $category = Category::on($connection)->findOrFail($id);

            $category->is_active = !$category->is_active;
            $category->save();

            return (new CategoryResource($category))
                ->additional([
                    'message' => 'Status updated',
                    'is_active' => $category->is_active,
                ]);

        } catch (Throwable $e) {
            Log::error('Category Status Toggle API Error: ' . $e->getMessage());
            return (new BaseResource(['message' => 'Error updating status']))
                ->response($request)
                ->setStatusCode(500);
        }
    }
}
