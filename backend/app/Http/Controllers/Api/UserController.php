<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UserRequest;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;

class UserController extends Controller
{
    public function index(): JsonResponse
    {
        $users = User::with('role')
            ->orderBy('name')
            ->get()
            ->map(fn (User $user) => [
                'id' => $user->id,
                'user' => $user->name,
                'userId' => $user->employee_number,
                'department' => $user->department,
                'role' => $user->role?->name,
            ]);

        return response()->json([
            'success' => true,
            'data' => $users,
        ]);
    }

    public function store(UserRequest $request): JsonResponse
    {
        $role = Role::where('name', $request->role)->first();

        $user = User::create([
            'role_id' => $role?->id,
            'employee_number' => $request->employee_number,
            'name' => $request->name,
            'department' => $request->department,
            'position' => $request->role,
            'email' => $request->email ?? null,
            'password' => Hash::make($request->employee_number),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Pengguna berhasil ditambahkan. Password awal sama dengan nomor karyawan.',
            'data' => [
                'id' => $user->id,
                'user' => $user->name,
                'userId' => $user->employee_number,
                'department' => $user->department,
                'role' => $role?->name,
            ],
        ], 201);
    }

    public function update(UserRequest $request, User $user): JsonResponse
    {
        if ($user->role?->name === 'Super Admin' && $request->role !== 'Super Admin') {
            return response()->json([
                'success' => false,
                'message' => 'Role Super Admin tidak dapat diubah.',
            ], 403);
        }

        $role = Role::where('name', $request->role)->first();

        $user->update([
            'role_id' => $role?->id,
            'employee_number' => $request->employee_number,
            'name' => $request->name,
            'department' => $request->department,
            'position' => $request->role,
            'email' => $request->email ?? $user->email,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Pengguna berhasil diperbarui.',
            'data' => [
                'id' => $user->id,
                'user' => $user->name,
                'userId' => $user->employee_number,
                'department' => $user->department,
                'role' => $role?->name,
            ],
        ]);
    }

    public function destroy(User $user): JsonResponse
    {
        if ($user->role?->name === 'Super Admin') {
            return response()->json([
                'success' => false,
                'message' => 'Super Admin tidak dapat dihapus.',
            ], 403);
        }

        $user->delete();

        return response()->json([
            'success' => true,
            'message' => 'Pengguna berhasil dihapus.',
        ]);
    }
}
