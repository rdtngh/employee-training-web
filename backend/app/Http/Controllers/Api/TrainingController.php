<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TestResult;
use App\Models\Training;
use App\Models\UserMaterial;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class TrainingController extends Controller
{
    private const EMERGENCY_UNLOCK_EMPLOYEE_FLOW = true;

    public function index(): JsonResponse
    {
        $trainings = Training::withCount(['materials', 'tests'])
            ->where('is_active', true)
            ->orderByDesc('start_date')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $trainings,
        ]);
    }

    public function show(Training $training): JsonResponse
    {
        $training->load([
            'materials.files',
            'tests',
        ]);

        return response()->json([
            'success' => true,
            'data' => $training,
        ]);
    }

    public function materials(Training $training): JsonResponse
    {
        $materials = $training->materials()
            ->with('files')
            ->orderBy('order_number')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $materials,
        ]);
    }

    public function materialProgress(Request $request, Training $training): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $this->buildMaterialProgress($request, $training),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
        ]);

        $training = Training::create([
            'title' => $validated['title'],
            'is_active' => true,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Pelatihan berhasil ditambahkan.',
            'data' => $training,
        ], 201);
    }

    public function update(Request $request, Training $training): JsonResponse
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
        ]);

        $training->update([
            'title' => $validated['title'],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Pelatihan berhasil diperbarui.',
            'data' => $training,
        ]);
    }

    public function destroy(Training $training): JsonResponse
    {
        $training->load('materials.files');

        foreach ($training->materials as $material) {
            foreach ($material->files as $file) {
                $relative = $this->materialStorageRelativePath($file->file_path);

                if ($relative) {
                    Storage::disk('local')->delete($relative);
                    Storage::disk('public')->delete($relative);
                }
            }
        }

        $training->delete();

        return response()->json([
            'success' => true,
            'message' => 'Pelatihan berhasil dihapus.',
        ]);
    }

    public function markMaterialsAccessed(Request $request, Training $training): JsonResponse
    {
        if (! self::EMERGENCY_UNLOCK_EMPLOYEE_FLOW && ! $this->hasCompletedPreTest($request, $training)) {
            return response()->json([
                'success' => false,
                'message' => 'Pre-Test harus dikerjakan sebelum membuka materi.',
            ], 403);
        }

        $materials = $training->materials()->select('id')->get();

        foreach ($materials as $material) {
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
        }

        return response()->json([
            'success' => true,
            'message' => 'Akses materi berhasil dicatat.',
            'data' => $this->buildMaterialProgress($request, $training),
        ]);
    }

    private function buildMaterialProgress(Request $request, Training $training): array
    {
        $user = $request->user();
        $materials = $training->materials()
            ->with('files')
            ->orderBy('order_number')
            ->get();

        $completedMaterialIds = UserMaterial::query()
            ->where('user_id', $user->id)
            ->whereIn('material_id', $materials->pluck('id'))
            ->where('is_completed', true)
            ->pluck('material_id')
            ->all();

        $preTestCompleted = self::EMERGENCY_UNLOCK_EMPLOYEE_FLOW || $this->hasCompletedPreTest($request, $training);

        $completedLookup = array_flip($completedMaterialIds);
        $materialsWithProgress = $materials->map(function ($material) use ($completedLookup, $preTestCompleted) {
            $material->setAttribute(
                'completed',
                self::EMERGENCY_UNLOCK_EMPLOYEE_FLOW || ($preTestCompleted && array_key_exists($material->id, $completedLookup))
            );

            if (! $preTestCompleted) {
                $material->setRelation('files', collect());
            }

            return $material;
        });

        return [
            'training' => [
                'id' => $training->id,
                'title' => $training->title,
                'pre_test_completed' => $preTestCompleted,
                'post_test_unlocked' => self::EMERGENCY_UNLOCK_EMPLOYEE_FLOW
                    || ($preTestCompleted && $materials->isNotEmpty() && count($completedMaterialIds) >= $materials->count()),
            ],
            'materials' => $materialsWithProgress,
        ];
    }

    private function hasCompletedPreTest(Request $request, Training $training): bool
    {
        $preTestId = $training->tests()
            ->where('type', 'pretest')
            ->value('id');

        return $preTestId
            ? TestResult::where('user_id', $request->user()->id)->where('test_id', $preTestId)->exists()
            : false;
    }

    private function materialStorageRelativePath(?string $path): ?string
    {
        if (! $path) {
            return null;
        }

        $urlPath = parse_url($path, PHP_URL_PATH) ?: $path;

        return preg_replace('#^/storage/#', '', $urlPath);
    }
}
