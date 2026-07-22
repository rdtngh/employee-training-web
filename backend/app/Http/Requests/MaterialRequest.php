<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class MaterialRequest extends FormRequest
{
    public const ALLOWED_FILE_EXTENSIONS = [
        'pdf',
        'ppt',
        'pptx',
        'doc',
        'docx',
        'xls',
        'xlsx',
        'txt',
        'rtf',
        'jpg',
        'jpeg',
        'png',
        'webp',
        'mp4',
        'webm',
    ];

    public function authorize(): bool
    {
        return auth()->check();
    }

    public function rules(): array
    {
        $trainingRule = $this->isMethod('post') ? 'required' : 'sometimes';

        return [
            'training_id' => [$trainingRule, 'integer', 'exists:trainings,id'],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'speaker' => ['nullable', 'string', 'max:255'],
            'order_number' => ['nullable', 'integer'],
            'files' => ['nullable', 'array'],
            'files.*' => ['file', 'extensions:'.implode(',', self::ALLOWED_FILE_EXTENSIONS), 'max:51200'],
        ];
    }

    public function messages(): array
    {
        return [
            'files.*.uploaded' => 'File gagal diupload oleh server. Pastikan backend dijalankan dengan upload_max_filesize minimal 50M dan post_max_size minimal 55M.',
            'files.*.extensions' => 'File materi harus berformat PDF, PPT, PPTX, DOC, DOCX, XLS, XLSX, TXT, RTF, JPG, PNG, WEBP, MP4, atau WEBM.',
            'files.*.max' => 'Ukuran setiap file materi maksimal 50MB.',
        ];
    }
}
