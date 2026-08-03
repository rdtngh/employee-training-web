<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TestResult;
use App\Models\Training;
use App\Models\UserMaterial;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class TrainingController extends Controller
{
    private const EMERGENCY_UNLOCK_EMPLOYEE_FLOW = false;
    private const CERTIFICATE_TEMPLATE_FIELDS = [
        'certificate_number',
        'employee_name',
        'training_title',
        'completion_date',
    ];

    public function index(): JsonResponse
    {
        $trainings = Training::withCount(['materials', 'tests'])
            ->where('is_active', true)
            ->orderByDesc('start_date')
            ->get()
            ->map(fn (Training $training) => $this->trainingPayload($training))
            ->values();

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
            'data' => $this->trainingPayload($training),
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
            'data' => $this->trainingPayload($training),
        ]);
    }

    public function uploadCertificateTemplate(Request $request, Training $training): JsonResponse
    {
        $validated = $request->validate([
            'template' => [
                'required',
                'file',
                'max:8192',
                'mimes:jpg,jpeg,png,webp',
                'mimetypes:image/jpeg,image/png,image/webp',
            ],
        ], [
            'template.required' => 'File template sertifikat wajib dipilih.',
            'template.max' => 'Ukuran template sertifikat maksimal 8MB.',
            'template.mimes' => 'Template sertifikat harus berupa JPG, PNG, atau WEBP.',
        ]);

        $file = $validated['template'];
        $filename = Str::random(12).'_'.$this->sanitizeFileName($file->getClientOriginalName());
        $path = $file->storeAs('certificate-templates', $filename, 'local');

        $this->deleteCertificateTemplateFile($training);

        $training->update([
            'certificate_template_path' => $path,
            'certificate_template_settings' => $training->certificate_template_settings
                ?: $this->defaultCertificateTemplateSettings(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Template sertifikat berhasil disimpan.',
            'data' => $this->trainingPayload($training->fresh()),
        ]);
    }

    public function deleteCertificateTemplate(Training $training): JsonResponse
    {
        $this->deleteCertificateTemplateFile($training);

        $training->update([
            'certificate_template_path' => null,
            'certificate_template_settings' => null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Template sertifikat berhasil dihapus.',
            'data' => $this->trainingPayload($training->fresh()),
        ]);
    }

    public function certificateTemplateBackground(Training $training)
    {
        $relative = $training->certificate_template_path;

        abort_unless(
            $relative && Storage::disk('local')->exists($relative),
            404,
            'Template sertifikat tidak ditemukan.'
        );

        return Storage::disk('local')->response($relative);
    }

    public function updateCertificateTemplateSettings(Request $request, Training $training): JsonResponse
    {
        $validated = $request->validate([
            'fields' => ['required', 'array'],
            'fields.*.x' => ['required', 'numeric', 'min:0', 'max:841'],
            'fields.*.y' => ['required', 'numeric', 'min:0', 'max:595'],
            'fields.*.width' => ['required', 'numeric', 'min:40', 'max:841'],
            'fields.*.fontSize' => ['required', 'numeric', 'min:8', 'max:96'],
            'fields.*.color' => ['required', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'fields.*.align' => ['required', 'in:left,center,right'],
            'fields.*.fontFamily' => [
                'nullable',
                'in:sans,montserrat,serif,merriweather,lora,cinzel,cormorant,script,dancing,allura,pacifico',
            ],
            'fields.*.fontWeight' => ['nullable', 'in:400,500,600,700'],
        ]);

        $settings = $this->sanitizeCertificateTemplateSettings($validated);

        $training->update([
            'certificate_template_settings' => $settings,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Pengaturan template sertifikat berhasil disimpan.',
            'data' => $this->trainingPayload($training->fresh()),
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

        $this->deleteCertificateTemplateFile($training);

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
                'certificate_template' => $this->certificateTemplatePayload($training),
                'pre_test_completed' => $preTestCompleted,
                'post_test_unlocked' => $this->hasPassedPostTest($request, $training)
                    || self::EMERGENCY_UNLOCK_EMPLOYEE_FLOW
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
            ? TestResult::where('user_id', $request->user()->id)
                ->where('test_id', $preTestId)
                ->whereNull('reset_at')
                ->exists()
            : false;
    }

    private function hasPassedPostTest(Request $request, Training $training): bool
    {
        return TestResult::query()
            ->where('user_id', $request->user()->id)
            ->where('status', 'Lulus')
            ->whereNull('reset_at')
            ->whereHas('test', function ($query) use ($training) {
                $query->where('training_id', $training->id)
                    ->where('type', 'posttest');
            })
            ->exists();
    }

    private function materialStorageRelativePath(?string $path): ?string
    {
        if (! $path) {
            return null;
        }

        $urlPath = parse_url($path, PHP_URL_PATH) ?: $path;

        return preg_replace('#^/storage/#', '', $urlPath);
    }

    private function trainingPayload(Training $training): array
    {
        return [
            ...$training->toArray(),
            'certificate_template' => $this->certificateTemplatePayload($training),
        ];
    }

    private function certificateTemplatePayload(?Training $training): ?array
    {
        if (! $training?->certificate_template_path) {
            return null;
        }

        return [
            'background_url' => url("/api/trainings/{$training->id}/certificate-template/background"),
            'settings' => $training->certificate_template_settings
                ?: $this->defaultCertificateTemplateSettings(),
        ];
    }

    private function deleteCertificateTemplateFile(Training $training): void
    {
        if ($training->certificate_template_path) {
            Storage::disk('local')->delete($training->certificate_template_path);
        }
    }

    private function sanitizeFileName(string $fileName): string
    {
        return preg_replace('/[^A-Za-z0-9._-]/', '_', $fileName);
    }

    private function defaultCertificateTemplateSettings(): array
    {
        return [
            'fields' => [
                'certificate_number' => [
                    'x' => 140,
                    'y' => 154,
                    'width' => 561,
                    'fontSize' => 12,
                    'color' => '#000000',
                    'align' => 'center',
                    'fontFamily' => 'sans',
                    'fontWeight' => '400',
                ],
                'employee_name' => [
                    'x' => 90,
                    'y' => 220,
                    'width' => 661,
                    'fontSize' => 62,
                    'color' => '#b99645',
                    'align' => 'center',
                    'fontFamily' => 'script',
                    'fontWeight' => '400',
                ],
                'training_title' => [
                    'x' => 175,
                    'y' => 340,
                    'width' => 491,
                    'fontSize' => 17,
                    'color' => '#000000',
                    'align' => 'center',
                    'fontFamily' => 'sans',
                    'fontWeight' => '700',
                ],
                'completion_date' => [
                    'x' => 175,
                    'y' => 408,
                    'width' => 491,
                    'fontSize' => 14,
                    'color' => '#000000',
                    'align' => 'center',
                    'fontFamily' => 'sans',
                    'fontWeight' => '400',
                ],
            ],
        ];
    }

    private function sanitizeCertificateTemplateSettings(array $settings): array
    {
        $defaults = $this->defaultCertificateTemplateSettings();
        $sanitized = ['fields' => []];

        foreach (self::CERTIFICATE_TEMPLATE_FIELDS as $field) {
            $input = $settings['fields'][$field] ?? [];
            $fallback = $defaults['fields'][$field];

            $sanitized['fields'][$field] = [
                'x' => round((float) ($input['x'] ?? $fallback['x']), 2),
                'y' => round((float) ($input['y'] ?? $fallback['y']), 2),
                'width' => round((float) ($input['width'] ?? $fallback['width']), 2),
                'fontSize' => round((float) ($input['fontSize'] ?? $fallback['fontSize']), 2),
                'color' => $input['color'] ?? $fallback['color'],
                'align' => $input['align'] ?? $fallback['align'],
                'fontFamily' => $input['fontFamily'] ?? $fallback['fontFamily'],
                'fontWeight' => (string) ($input['fontWeight'] ?? $fallback['fontWeight']),
            ];
        }

        return $sanitized;
    }
}
