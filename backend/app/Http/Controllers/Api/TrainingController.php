<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PostTestAccess;
use App\Models\TestResult;
use App\Models\Training;
use App\Models\TrainingParticipant;
use App\Models\User;
use App\Models\UserMaterial;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use setasign\Fpdi\Fpdi;
use Throwable;

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
        $query = Training::withCount(['materials', 'tests']);

        if (! $this->canManageTrainings()) {
            $query->where('is_active', true);
        }

        $trainings = $query
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
        if ($response = $this->inactiveTrainingResponse($training)) {
            return $response;
        }

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
        if ($response = $this->inactiveTrainingResponse($training)) {
            return $response;
        }

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
        if ($response = $this->inactiveTrainingResponse($training)) {
            return $response;
        }

        return response()->json([
            'success' => true,
            'data' => $this->buildMaterialProgress($request, $training),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'post_test_access_code' => ['nullable', 'string', 'max:100'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $this->rejectReservedOrientationTitle($validated['title']);

        $accessCode = trim((string) ($validated['post_test_access_code'] ?? ''));

        $training = Training::create([
            'title' => $validated['title'],
            'is_active' => $request->boolean('is_active', true),
            'post_test_access_code_hash' => $accessCode !== '' ? Hash::make($accessCode) : null,
            'post_test_access_code_encrypted' => $accessCode !== '' ? Crypt::encryptString($accessCode) : null,
            'post_test_access_code_updated_at' => $accessCode !== '' ? now() : null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Pelatihan berhasil ditambahkan.',
            'data' => $this->trainingPayload($training),
        ], 201);
    }

    public function update(Request $request, Training $training): JsonResponse
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'post_test_access_code' => ['nullable', 'string', 'max:100'],
            'clear_post_test_access_code' => ['nullable', 'boolean'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        if (! $training->is_general_orientation) {
            $this->rejectReservedOrientationTitle($validated['title']);
        }

        $updates = [
            'title' => $training->is_general_orientation ? 'Orientasi Umum' : $validated['title'],
            'is_active' => $training->is_general_orientation
                ? true
                : $request->boolean('is_active', (bool) $training->is_active),
        ];

        $resetPostTestAccesses = false;

        if ($request->boolean('clear_post_test_access_code')) {
            $updates['post_test_access_code_hash'] = null;
            $updates['post_test_access_code_encrypted'] = null;
            $updates['post_test_access_code_updated_at'] = null;
            $resetPostTestAccesses = true;
        } elseif ($request->has('post_test_access_code')) {
            $accessCode = trim((string) $validated['post_test_access_code']);

            if ($accessCode !== '') {
                $currentAccessCode = $this->decryptedPostTestAccessCode($training);
                $codeChanged = $currentAccessCode !== $accessCode;

                if ($codeChanged || ! $training->post_test_access_code_hash) {
                    $updates['post_test_access_code_hash'] = Hash::make($accessCode);
                    $updates['post_test_access_code_encrypted'] = Crypt::encryptString($accessCode);
                    $updates['post_test_access_code_updated_at'] = now();
                    $resetPostTestAccesses = $codeChanged;
                }
            }
        }

        $training->update($updates);

        if ($resetPostTestAccesses) {
            PostTestAccess::where('training_id', $training->id)->delete();
        }

        return response()->json([
            'success' => true,
            'message' => 'Pelatihan berhasil diperbarui.',
            'data' => $this->trainingPayload($training),
        ]);
    }

    public function verifyPostTestAccessCode(Request $request, Training $training): JsonResponse
    {
        if ($response = $this->inactiveTrainingResponse($training)) {
            return $response;
        }

        if (! $this->hasPostTestAccessCode($training)) {
            return response()->json([
                'success' => false,
                'message' => 'Kode akses belum tersedia.',
            ], 422);
        }

        $validated = $request->validate([
            'access_code' => ['required', 'string', 'max:100'],
        ], [
            'access_code.required' => 'Kode akses Post-Test wajib diisi.',
        ]);

        $accessCode = trim($validated['access_code']);

        if (! $this->accessCodeMatches($training, $accessCode)) {
            return response()->json([
                'success' => false,
                'message' => 'Kode akses Post-Test tidak sesuai.',
            ], 422);
        }

        $this->repairMissingPostTestAccessCodeHash($training, $accessCode);

        TrainingParticipant::capture($request->user(), $training->id);

        PostTestAccess::updateOrCreate(
            [
                'user_id' => $request->user()->id,
                'training_id' => $training->id,
            ],
            [
                'verified_at' => now(),
            ]
        );

        return response()->json([
            'success' => true,
            'message' => 'Kode akses Post-Test berhasil diverifikasi.',
            'data' => [
                'verified' => true,
            ],
        ]);
    }

    public function uploadCertificateTemplate(Request $request, Training $training): JsonResponse
    {
        $isOrientation = $this->isGeneralOrientation($training);
        $validated = $request->validate([
            'template' => [
                'required',
                'file',
                'max:8192',
                $isOrientation ? 'mimes:pdf' : 'mimes:jpg,jpeg,png,webp',
                $isOrientation
                    ? 'mimetypes:application/pdf,application/x-pdf'
                    : 'mimetypes:image/jpeg,image/png,image/webp',
            ],
        ], [
            'template.required' => 'File template sertifikat wajib dipilih.',
            'template.max' => 'Ukuran template sertifikat maksimal 8MB.',
            'template.mimes' => $isOrientation
                ? 'Template Orientasi Umum harus berupa PDF dua halaman.'
                : 'Template sertifikat harus berupa JPG, PNG, atau WEBP.',
        ]);

        $file = $validated['template'];

        if ($isOrientation) {
            try {
                $pdf = new Fpdi;
                $pageCount = $pdf->setSourceFile($file->getRealPath());
            } catch (Throwable $exception) {
                throw ValidationException::withMessages([
                    'template' => 'Template PDF tidak dapat dibaca. Pilih PDF yang valid.',
                ]);
            }

            if ($pageCount !== 2) {
                throw ValidationException::withMessages([
                    'template' => 'Template Orientasi Umum harus tepat dua halaman.',
                ]);
            }
        }

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
        abort_if($training->is_general_orientation, 422, 'Pelatihan Orientasi Umum bersifat tetap dan tidak dapat dihapus.');

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

        TrainingParticipant::capture($request->user(), $training->id);

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
        $postTestWorkflowUnlocked = $this->hasPassedPostTest($request, $training)
            || self::EMERGENCY_UNLOCK_EMPLOYEE_FLOW
            || ($preTestCompleted && $materials->isNotEmpty() && count($completedMaterialIds) >= $materials->count());
        $postTestAccessRequired = $this->postTestAccessRequired($training);

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
                'post_test_unlocked' => $postTestWorkflowUnlocked,
                'post_test_access_required' => $postTestAccessRequired,
                'post_test_access_verified' => ! $postTestAccessRequired
                    || $this->hasVerifiedPostTestAccess($request, $training),
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
            'has_post_test_access_code' => $this->hasPostTestAccessCode($training),
            ...($this->canManageTrainings()
                ? ['post_test_access_code' => $this->decryptedPostTestAccessCode($training)]
                : []),
            'certificate_template' => $this->certificateTemplatePayload($training),
        ];
    }

    private function postTestAccessRequired(Training $training): bool
    {
        return true;
    }

    private function hasPostTestAccessCode(Training $training): bool
    {
        return (bool) ($training->post_test_access_code_hash || $training->post_test_access_code_encrypted);
    }

    private function hasVerifiedPostTestAccess(Request $request, Training $training): bool
    {
        if (! $this->hasPostTestAccessCode($training)) {
            return false;
        }

        return PostTestAccess::query()
            ->where('user_id', $request->user()->id)
            ->where('training_id', $training->id)
            ->when($training->post_test_access_code_updated_at, function ($query, $updatedAt) {
                $query->where('verified_at', '>=', $updatedAt);
            })
            ->exists();
    }

    private function canManageTrainings(): bool
    {
        $role = request()->user()?->role?->name;

        return in_array($role, ['Super Admin', 'Admin'], true);
    }

    private function inactiveTrainingResponse(Training $training): ?JsonResponse
    {
        $role = request()->user()?->role?->name;

        if (in_array($role, User::PARTICIPANT_ROLES, true) && ! $training->is_active) {
            return response()->json([
                'success' => false,
                'message' => 'Pelatihan belum tersedia.',
            ], 403);
        }

        return null;
    }

    private function decryptedPostTestAccessCode(Training $training): ?string
    {
        if (! $training->post_test_access_code_encrypted) {
            return null;
        }

        try {
            return Crypt::decryptString($training->post_test_access_code_encrypted);
        } catch (Throwable) {
            return null;
        }
    }

    private function accessCodeMatches(Training $training, string $accessCode): bool
    {
        if ($training->post_test_access_code_hash && Hash::check($accessCode, $training->post_test_access_code_hash)) {
            return true;
        }

        $encryptedAccessCode = $this->decryptedPostTestAccessCode($training);

        return $encryptedAccessCode !== null && hash_equals($encryptedAccessCode, $accessCode);
    }

    private function repairMissingPostTestAccessCodeHash(Training $training, string $accessCode): void
    {
        if ($training->post_test_access_code_hash) {
            return;
        }

        $training->forceFill([
            'post_test_access_code_hash' => Hash::make($accessCode),
            'post_test_access_code_updated_at' => now(),
        ])->save();
    }

    private function certificateTemplatePayload(?Training $training): ?array
    {
        if (! $training?->certificate_template_path) {
            return null;
        }

        return [
            'background_url' => url("/api/trainings/{$training->id}/certificate-template/background"),
            'format' => strtolower(pathinfo($training->certificate_template_path, PATHINFO_EXTENSION)),
            'settings' => $training->certificate_template_settings
                ?: $this->defaultCertificateTemplateSettings(),
        ];
    }

    private function isGeneralOrientation(Training $training): bool
    {
        return (bool) $training->is_general_orientation;
    }

    private function rejectReservedOrientationTitle(string $title): void
    {
        $normalized = trim(preg_replace('/\s+/', ' ', Str::lower($title)));

        if ($normalized === 'orientasi umum') {
            throw ValidationException::withMessages([
                'title' => 'Orientasi Umum sudah tersedia sebagai pelatihan tetap.',
            ]);
        }
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
