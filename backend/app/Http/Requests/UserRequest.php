<?php

namespace App\Http\Requests;

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
        $userIdRule = ['required', 'string', 'max:20', 'regex:/^[0-9]+$/'];
        $nameRule = ['required', 'string', 'max:255'];
        $departmentRule = ['required', 'string', 'max:255'];
        $roleRule = ['required', 'string', Rule::in(['Super Admin', 'Admin', 'Karyawan'])];
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
            'employee_number.required' => 'ID karyawan wajib diisi.',
            'employee_number.regex' => 'ID karyawan hanya boleh berisi angka.',
            'employee_number.max' => 'ID karyawan maksimal 20 digit.',
            'employee_number.unique' => 'ID karyawan sudah terdaftar.',
            'name.required' => 'Nama wajib diisi.',
            'department.required' => 'Departemen wajib dipilih.',
            'role.required' => 'Role wajib dipilih.',
            'role.in' => 'Role tidak valid.',
            'email.email' => 'Format email tidak valid.',
        ];
    }
}
