<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\MaterialRequest;
use App\Models\Material;
use App\Models\MaterialFile;
use App\Models\TestResult;
use App\Models\UserMaterial;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class MaterialController extends Controller
{
    private const CHUNK_MAX_KB = 1536;

    public function show(Material $material): JsonResponse
    {
        if ($this->requiresPreTest($material)) {
            return response()->json([
                'success' => false,
                'message' => 'Pre-Test harus dikerjakan sebelum membuka materi.',
            ], 403);
        }

        $material->load(['training', 'files']);

        return response()->json([
            'success' => true,
            'data' => $material,
        ]);
    }

    public function files(Material $material): JsonResponse
    {
        if ($this->requiresPreTest($material)) {
            return response()->json([
                'success' => false,
                'message' => 'Pre-Test harus dikerjakan sebelum membuka materi.',
            ], 403);
        }

        return response()->json([
            'success' => true,
            'data' => $material->files()->get(),
        ]);
    }

    public function downloadFile(Material $material, MaterialFile $file)
    {
        if ($file->material_id !== $material->id) {
            abort(404);
        }

        if ($this->requiresPreTest($material)) {
            return response()->json([
                'success' => false,
                'message' => 'Pre-Test harus dikerjakan sebelum membuka materi.',
            ], 403);
        }

        $relative = $this->materialStorageRelativePath($file->file_path);

        if (! $relative || ! Storage::disk('local')->exists($relative)) {
            return response()->json([
                'success' => false,
                'message' => 'File materi tidak ditemukan.',
            ], 404);
        }

        return Storage::disk('local')->response($relative, $file->file_name);
    }

    public function markAccessed(Request $request, Material $material): JsonResponse
    {
        if ($this->requiresPreTest($material)) {
            return response()->json([
                'success' => false,
                'message' => 'Pre-Test harus dikerjakan sebelum membuka materi.',
            ], 403);
        }

        UserMaterial::updateOrCreate(
            [
                'user_id' => $request->user()->id,
                'material_id' => $material->id,
            ],
            [
                'is_completed' => true,
                'completed_at' => now(),
            ]
        );

        return response()->json([
            'success' => true,
            'message' => 'Akses materi berhasil dicatat.',
            'data' => [
                'material_id' => $material->id,
                'completed' => true,
            ],
        ]);
    }

    public function store(MaterialRequest $request): JsonResponse
    {
        $orderNumber = $request->order_number ?? ((Material::where('training_id', $request->training_id)->max('order_number') ?? 0) + 1);

        $material = Material::create([
            'training_id' => $request->training_id,
            'title' => $request->title,
            'description' => $request->description ?? null,
            'speaker' => $request->speaker ?? '',
            'order_number' => $orderNumber,
        ]);

        $this->storeFiles($request, $material);

        return response()->json([
            'success' => true,
            'message' => 'Materi berhasil ditambahkan.',
            'data' => $material->load('files'),
        ], 201);
    }

    public function bulkStore(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'training_id' => ['required', 'integer', 'exists:trainings,id'],
            'titles' => ['required', 'array', 'min:1'],
            'titles.*' => ['required', 'string', 'max:255'],
            'files' => ['required', 'array', 'min:1'],
            'files.*' => ['file', 'extensions:'.implode(',', MaterialRequest::ALLOWED_FILE_EXTENSIONS), 'max:51200'],
        ], [
            'files.*.uploaded' => 'File gagal diupload oleh server. Pastikan backend dijalankan dengan upload_max_filesize minimal 50M dan post_max_size minimal 55M.',
            'files.*.extensions' => 'File materi harus berformat PDF, PPT, PPTX, DOC, DOCX, XLS, XLSX, TXT, RTF, JPG, PNG, WEBP, MP4, atau WEBM.',
            'files.*.max' => 'Ukuran setiap file materi maksimal 50MB.',
        ]);

        $files = $request->file('files') ?? [];

        if (count($validated['titles']) !== count($files)) {
            return response()->json([
                'success' => false,
                'message' => 'Jumlah judul materi harus sama dengan jumlah file.',
            ], 422);
        }

        $materials = DB::transaction(function () use ($validated, $files) {
            $orderNumber = (Material::where('training_id', $validated['training_id'])->max('order_number') ?? 0) + 1;
            $createdMaterials = [];

            foreach ($files as $index => $file) {
                $material = Material::create([
                    'training_id' => $validated['training_id'],
                    'title' => $validated['titles'][$index],
                    'description' => null,
                    'speaker' => '',
                    'order_number' => $orderNumber + $index,
                ]);

                $this->storeUploadedFile($file, $material);
                $createdMaterials[] = $material->load('files');
            }

            return $createdMaterials;
        });

        return response()->json([
            'success' => true,
            'message' => 'Materi berhasil ditambahkan.',
            'data' => $materials,
        ], 201);
    }

    public function storeChunked(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'training_id' => ['required', 'integer', 'exists:trainings,id'],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'upload_id' => ['required', 'string', 'max:100'],
            'chunk_index' => ['required', 'integer', 'min:0'],
            'total_chunks' => ['required', 'integer', 'min:1', 'max:200'],
            'original_name' => ['required', 'string', 'max:255'],
            'file_type' => ['nullable', 'string', 'max:255'],
            'chunk' => ['required', 'file', 'max:'.self::CHUNK_MAX_KB],
        ], [
            'chunk.uploaded' => 'Potongan file gagal diupload oleh server.',
            'chunk.max' => 'Potongan file terlalu besar.',
        ]);

        if (! $this->isAllowedMaterialFileName($validated['original_name'])) {
            return response()->json([
                'success' => false,
                'message' => 'File materi harus berformat PDF, PPT, PPTX, DOC, DOCX, XLS, XLSX, TXT, RTF, JPG, PNG, WEBP, MP4, atau WEBM.',
            ], 422);
        }

        $uploadId = preg_replace('/[^A-Za-z0-9_-]/', '', $validated['upload_id']);
        $chunkIndex = (int) $validated['chunk_index'];
        $totalChunks = (int) $validated['total_chunks'];

        if ($chunkIndex >= $totalChunks) {
            return response()->json([
                'success' => false,
                'message' => 'Urutan potongan file tidak valid.',
            ], 422);
        }

        $tempDir = "materials_tmp/{$uploadId}";
        $request->file('chunk')->storeAs($tempDir, "{$chunkIndex}.part", 'local');

        if ($chunkIndex < $totalChunks - 1) {
            return response()->json([
                'success' => true,
                'message' => 'Potongan file berhasil diupload.',
                'data' => [
                    'complete' => false,
                    'chunk_index' => $chunkIndex,
                ],
            ]);
        }

        for ($index = 0; $index < $totalChunks; $index++) {
            if (! Storage::disk('local')->exists("{$tempDir}/{$index}.part")) {
                return response()->json([
                    'success' => false,
                    'message' => 'Upload file belum lengkap. Coba upload ulang.',
                ], 422);
            }
        }

        $material = DB::transaction(function () use ($validated, $tempDir, $totalChunks) {
            $orderNumber = (Material::where('training_id', $validated['training_id'])->max('order_number') ?? 0) + 1;
            $material = Material::create([
                'training_id' => $validated['training_id'],
                'title' => $validated['title'],
                'description' => $validated['description'] ?? null,
                'speaker' => '',
                'order_number' => $orderNumber,
            ]);

            $filename = Str::random(12) . '_' . $this->sanitizeFileName($validated['original_name']);
            $path = "materials/{$filename}";
            Storage::disk('local')->makeDirectory('materials');
            $target = Storage::disk('local')->path($path);
            $targetHandle = fopen($target, 'wb');

            for ($index = 0; $index < $totalChunks; $index++) {
                $chunkPath = Storage::disk('local')->path("{$tempDir}/{$index}.part");
                $chunkHandle = fopen($chunkPath, 'rb');
                stream_copy_to_stream($chunkHandle, $targetHandle);
                fclose($chunkHandle);
            }

            fclose($targetHandle);
            Storage::disk('local')->deleteDirectory($tempDir);

            MaterialFile::create([
                'material_id' => $material->id,
                'file_name' => $validated['original_name'],
                'file_path' => $path,
                'file_type' => $validated['file_type'] ?? 'application/octet-stream',
            ]);

            return $material->load('files');
        });

        return response()->json([
            'success' => true,
            'message' => 'Materi berhasil ditambahkan.',
            'data' => $material,
        ], 201);
    }


    public function update(MaterialRequest $request, Material $material): JsonResponse
    {
        $material->update([
            'title' => $request->title,
            'description' => $request->description ?? $material->description,
            'speaker' => $request->speaker ?? $material->speaker,
            'order_number' => $request->order_number ?? $material->order_number,
        ]);

        $this->storeFiles($request, $material);

        return response()->json([
            'success' => true,
            'message' => 'Materi berhasil diperbarui.',
            'data' => $material->load('files'),
        ]);
    }

    public function destroy(Material $material): JsonResponse
    {
        // delete files from storage
        foreach ($material->files as $file) {
            $relative = $this->materialStorageRelativePath($file->file_path);
            try {
                if ($relative) {
                    Storage::disk('local')->delete($relative);
                    Storage::disk('public')->delete($relative);
                }
            } catch (\Exception $e) {
                // ignore
            }
            $file->delete();
        }

        $material->delete();

        return response()->json([
            'success' => true,
            'message' => 'Materi berhasil dihapus.',
        ]);
    }

    private function storeFiles(Request $request, Material $material): void
    {
        $files = $request->file('files') ?? $request->file('files[]');

        if (empty($files)) {
            return;
        }

        $files = is_array($files) ? $files : [$files];

        foreach ($files as $file) {
            if (!$file || !$file->isValid()) {
                continue;
            }

            $this->storeUploadedFile($file, $material);
        }
    }

    private function storeUploadedFile($file, Material $material): void
    {
        $filename = Str::random(12) . '_' . $this->sanitizeFileName($file->getClientOriginalName());
        $path = $file->storeAs('materials', $filename, 'local');

        MaterialFile::create([
            'material_id' => $material->id,
            'file_name' => $file->getClientOriginalName(),
            'file_path' => $path,
            'file_type' => $file->getClientMimeType(),
        ]);
    }

    private function sanitizeFileName(string $fileName): string
    {
        return preg_replace('/[^A-Za-z0-9._-]/', '_', $fileName);
    }

    private function isAllowedMaterialFileName(string $fileName): bool
    {
        $extension = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));

        return in_array($extension, MaterialRequest::ALLOWED_FILE_EXTENSIONS, true);
    }

    private function materialStorageRelativePath(?string $path): ?string
    {
        if (! $path) {
            return null;
        }

        $urlPath = parse_url($path, PHP_URL_PATH) ?: $path;

        return preg_replace('#^/storage/#', '', $urlPath);
    }

    private function requiresPreTest(Material $material): bool
    {
        $user = request()->user();

        if (strtolower($user?->role?->name ?? '') !== 'karyawan') {
            return false;
        }

        $preTestId = $material->training
            ? $material->training->tests()->where('type', 'pretest')->value('id')
            : null;

        return $preTestId
            ? ! TestResult::where('user_id', $user->id)->where('test_id', $preTestId)->exists()
            : true;
    }
}
