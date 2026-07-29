<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\LoginRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class LoginController extends Controller
{
    private function userPayload($user): array
    {
        $user->loadMissing('role');

        return [
            'id' => $user->id,
            'employee_number' => $user->employee_number,
            'name' => $user->name,
            'department' => $user->department,
            'position' => $user->position,
            'role' => $user->role->name,
        ];
    }

    /**
     * Login
     */
    public function login(LoginRequest $request)
    {
        if (! Auth::attempt($request->only('employee_number', 'password'))) {
            return response()->json([
                'success' => false,
                'message' => 'Nomor karyawan atau password salah.',
            ], 401);
        }

        $request->session()->regenerate();
        $user = Auth::user();

        return response()->json([
            'success' => true,
            'message' => 'Login berhasil.',
            'user' => $this->userPayload($user),
        ]);
    }

    /**
     * Logout
     */
    public function logout(Request $request)
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json([
            'success' => true,
            'message' => 'Logout berhasil.',
        ]);
    }

    /**
     * Current User
     */
    public function me(Request $request)
    {
        return response()->json([
            'success' => true,
            'user' => $this->userPayload($request->user()),
        ]);
    }
}
