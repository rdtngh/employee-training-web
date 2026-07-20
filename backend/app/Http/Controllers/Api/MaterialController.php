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
            'files.*' => ['file', 'max:51200'],
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
        $filename = Str::random(12) . '_' . preg_replace('/[^A-Za-z0-9._-]/', '_', $file->getClientOriginalName());
        $path = $file->storeAs('materials', $filename, 'local');

        MaterialFile::create([
            'material_id' => $material->id,
            'file_name' => $file->getClientOriginalName(),
            'file_path' => $path,
            'file_type' => $file->getClientMimeType(),
        ]);
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
