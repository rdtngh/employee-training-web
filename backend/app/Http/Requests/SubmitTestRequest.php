<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SubmitTestRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'answers' => ['required', 'array', 'min:1'],
            'answers.*.question_id' => ['required', 'integer', 'exists:questions,id'],
            'answers.*.selected_answer' => ['required', 'string', 'in:A,B,C,D'],
            'started_at' => ['nullable', 'date'],
        ];
    }

    public function messages(): array
    {
        return [
            'answers.required' => 'Jawaban tidak boleh kosong.',
            'answers.array' => 'Format jawaban tidak valid.',
            'answers.*.question_id.required' => 'ID soal wajib diisi.',
            'answers.*.question_id.exists' => 'Soal tidak ditemukan.',
            'answers.*.selected_answer.required' => 'Pilih jawaban untuk setiap soal.',
            'answers.*.selected_answer.in' => 'Jawaban harus A, B, C, atau D.',
            'started_at.date' => 'Waktu mulai tes tidak valid.',
        ];
    }
}
