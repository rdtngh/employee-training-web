<?php

namespace App\Http\Requests;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $userIdRule = ['required', 'string', 'max:20', 'regex:/^[A-Za-z0-9._-]+$/'];
        $nameRule = ['required', 'string', 'max:255'];
        $departmentRule = ['required', 'string', 'max:255'];
        $roleRule = ['required', 'string', Rule::in(['Super Admin', 'Admin', ...User::PARTICIPANT_ROLES])];
        $emailRule = ['nullable', 'email', 'max:255'];

        if ($this->method() === 'POST') {
            $userIdRule[] = 'unique:users,employee_number';
        } else {
            $userIdRule[] = Rule::unique('users', 'employee_number')->ignore($this->route('user')->id);
        }

        return [
            'employee_number' => $userIdRule,
            'name' => $nameRule,
            'department' => $departmentRule,
            'role' => $roleRule,
            'email' => $emailRule,
        ];
    }

    public function messages(): array
    {
        return [
            'employee_number.required' => 'Username wajib diisi.',
            'employee_number.regex' => 'Username hanya boleh berisi huruf, angka, titik, garis bawah, atau tanda hubung.',
            'employee_number.max' => 'Username maksimal 20 karakter.',
            'employee_number.unique' => 'Username sudah terdaftar.',
            'name.required' => 'Nama wajib diisi.',
            'department.required' => 'Departemen wajib dipilih.',
            'role.required' => 'Role wajib dipilih.',
            'role.in' => 'Role tidak valid.',
            'email.email' => 'Format email tidak valid.',
        ];
    }
}
