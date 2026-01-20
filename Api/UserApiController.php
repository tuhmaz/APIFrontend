<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\User;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use App\Http\Resources\Api\UserResource;
use App\Http\Resources\BaseResource;
use App\Http\Requests\User\UserStoreRequest;
use App\Http\Requests\User\UserUpdateRequest;
use App\Http\Requests\User\UserUpdateRolesPermissionsRequest;
use App\Http\Requests\User\UserBulkDeleteRequest;

class UserApiController extends Controller
{
    /**
     * عرض جميع المستخدمين مع البحث والفلاتر
     */
    public function index(Request $request)
    {
        /** @var \App\Models\User|null $auth */
        $auth = Auth::user();
        $auth?->loadMissing('roles');

        // استعلام محسّن مع Eager Loading لتجنب N+1 problem
        $query = User::query()
            ->with(['roles:id,name', 'permissions:id,name']);

        if (!$auth || !$auth->roles->contains('name', 'Admin')) {
            $query->where('id', $auth?->id);
        }

        if ($request->filled('role')) {
            $query->whereHas('roles', fn($q) =>
                $q->where('name', $request->role)
            );
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        $query->orderBy('created_at', 'desc');

        // جلب النتائج
        if ($request->boolean('all')) {
            $users = $query->get();
        } else {
            $perPage = (int) $request->input('per_page', 20);
            $users = $query->paginate($perPage);
        }

        return UserResource::collection($users)
            ->additional([
                'success' => true,
            ]);
    }

    /**
     * إنشاء مستخدم جديد
     */
    public function store(UserStoreRequest $request)
    {
        $validated = $request->validated();

        DB::beginTransaction();
        try {
            $user = User::create([
                'name'     => $validated['name'],
                'email'    => $validated['email'],
                'password' => Hash::make($validated['password'])
            ]);

            $user->assignRole($validated['role']);

            DB::commit();

            return (new UserResource($user))
                ->additional([
                    'message' => 'User created successfully',
                ]);
        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error($e);

            return (new BaseResource(['message' => 'Failed to create user']))
                ->response($request)
                ->setStatusCode(500);
        }
    }

    /**
     * عرض مستخدم معيّن
     */
    public function show(User $user)
    {
        /** @var \App\Models\User|null $auth */
        $auth = Auth::user();
        $auth?->loadMissing('roles');

        if ((!$auth || !$auth->roles->contains('name', 'Admin')) && $auth->id !== $user->id) {
            return (new BaseResource(['message' => 'Forbidden']))
                ->response(request())
                ->setStatusCode(403);
        }

        return new UserResource($user->load('roles:id,name', 'permissions:id,name'));
    }

    /**
     * تحديث بيانات مستخدم
     */
    public function update(UserUpdateRequest $request, User $user)
    {
        /** @var \App\Models\User|null $auth */
        $auth = Auth::user();
        $auth?->loadMissing('roles');

        if ((!$auth || !$auth->roles->contains('name', 'Admin')) && $auth->id !== $user->id) {
            return (new BaseResource(['message' => 'Forbidden']))
                ->response($request)
                ->setStatusCode(403);
        }

        $validated = $request->validated();

        $user->fill($validated);

        if ($request->hasFile('profile_photo')) {

            if ($user->profile_photo_path) {
                Storage::disk('public')->delete($user->profile_photo_path);
            }

            $path = $request->file('profile_photo')->store('profiles', 'public');
            $user->profile_photo_path = $path;
        }

        $user->save();

        return (new UserResource($user->load('roles:id,name', 'permissions:id,name')))
            ->additional([
                'message' => 'User updated successfully',
            ]);
    }

    /**
     * تحديث أدوار وصلاحيات المستخدم
     */
    public function updateRolesPermissions(UserUpdateRolesPermissionsRequest $request, User $user)
    {
        $validated = $request->validated();

        $roles = Role::whereIn('name', $validated['roles'] ?? [])->get();
        $permissions = Permission::whereIn('name', $validated['permissions'] ?? [])->get();

        $user->syncRoles($roles);
        $user->syncPermissions($permissions);

        return (new UserResource($user->load('roles', 'permissions')))
            ->additional([
                'message' => 'Roles & permissions updated',
            ]);
    }

    /**
     * حذف مستخدم واحد
     */
    public function destroy(User $user)
    {
        DB::beginTransaction();

        try {
            if ($user->profile_photo_path) {
                Storage::disk('public')->delete($user->profile_photo_path);
            }

            $user->roles()->detach();
            $user->permissions()->detach();

            $user->delete();

            DB::commit();

            return new BaseResource([
                'message' => 'User deleted successfully'
            ]);
        } catch (\Throwable $e) {
            DB::rollBack();

            return (new BaseResource(['message' => 'Failed to delete user']))
                ->response(request())
                ->setStatusCode(500);
        }
    }

    /**
     * حذف مجموعة مستخدمين Bulk Delete
     */
    public function bulkDelete(UserBulkDeleteRequest $request)
    {
        // validation handled by UserBulkDeleteRequest

        $errors = [];
        $deleted = 0;

        DB::beginTransaction();

        try {
            foreach ($request->user_ids as $id) {
                $user = User::find($id);

                if (!$user) continue;

                if ($user->id === Auth::id()) {
                    $errors[] = "Cannot delete your own account";
                    continue;
                }

                if ($user->profile_photo_path) {
                    Storage::disk('public')->delete($user->profile_photo_path);
                }

                $user->roles()->detach();
                $user->permissions()->detach();
                $user->delete();

                $deleted++;
            }

            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            return (new BaseResource(['message' => 'Bulk delete failed']))
                ->response($request)
                ->setStatusCode(500);
        }

        return new BaseResource([
            'deleted' => $deleted,
            'errors' => $errors
        ]);
    }
}
