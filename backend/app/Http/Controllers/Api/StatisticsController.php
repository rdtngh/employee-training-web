<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Certificate;
use App\Models\TestResult;
use App\Models\Training;
use App\Models\UserAnswer;
use App\Models\UserMaterial;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class StatisticsController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $training = $this->resolveTraining($request);

        if (! $training) {
            return response()->json([
                'success' => true,
                'data' => $this->emptyStatistics(),
            ]);
        }

        $testIds = $training->tests()->pluck('id');

        $results = TestResult::query()
            ->whereIn('test_id', $testIds)
            ->whereHas('user.role', fn ($query) => $query->where('name', 'Karyawan'))
            ->orderByDesc('updated_at')
            ->get()
            ->unique('user_id')
            ->values();

        $participantCount = $results->count();
        $passedCount = $results->where('status', 'Lulus')->count();
        $failedCount = $results->where('status', 'Tidak Lulus')->count();

        return response()->json([
            'success' => true,
            'data' => [
                'title' => 'Statistik',
                'training' => [
                    'id' => $training->id,
                    'title' => $training->title,
                ],
                'average_score' => $this->formatNumber($results->avg('score')),
                'participant_count' => $participantCount,
                'passed_count' => $passedCount,
                'failed_count' => $failedCount,
                'highest_score' => $results->max('score') ?? 0,
                'lowest_score' => $results->min('score') ?? 0,
                'pass_percentage' => $participantCount > 0
                    ? $this->formatNumber(($passedCount / $participantCount) * 100)
                    : 0,
            ],
        ]);
    }

    public function reset(Request $request): JsonResponse
    {
        $training = $this->resolveTraining($request);

        if (! $training) {
            return response()->json([
                'success' => false,
                'message' => 'Training tidak ditemukan.',
            ], 404);
        }

        $testIds = $training->tests()->pluck('id');
        $questionIds = $training->tests()
            ->with('questions:id,test_id')
            ->get()
            ->flatMap(fn ($test) => $test->questions->pluck('id'));
        $materialIds = $training->materials()->pluck('id');

        $participantUserIds = TestResult::query()
            ->whereIn('test_id', $testIds)
            ->whereHas('user.role', fn ($query) => $query->where('name', 'Karyawan'))
            ->pluck('user_id')
            ->merge(
                UserMaterial::query()
                    ->whereIn('material_id', $materialIds)
                    ->whereHas('user.role', fn ($query) => $query->where('name', 'Karyawan'))
                    ->pluck('user_id')
            )
            ->unique()
            ->values();

        $deleted = DB::transaction(function () use ($testIds, $questionIds, $materialIds, $participantUserIds) {
            $resultIds = TestResult::query()
                ->whereIn('test_id', $testIds)
                ->whereIn('user_id', $participantUserIds)
                ->pluck('id');

            $certificates = Certificate::query()
                ->whereIn('test_result_id', $resultIds)
                ->delete();

            $answers = UserAnswer::query()
                ->whereIn('question_id', $questionIds)
                ->whereIn('user_id', $participantUserIds)
                ->delete();

            $materials = UserMaterial::query()
                ->whereIn('material_id', $materialIds)
                ->whereIn('user_id', $participantUserIds)
                ->delete();

            $results = TestResult::query()
                ->whereIn('id', $resultIds)
                ->delete();

            return compact('certificates', 'answers', 'materials', 'results');
        });

        return response()->json([
            'success' => true,
            'message' => 'Statistik dan progres peserta berhasil direset.',
            'data' => [
                'training' => [
                    'id' => $training->id,
                    'title' => $training->title,
                ],
                'participant_count' => $participantUserIds->count(),
                'deleted' => $deleted,
            ],
        ]);
    }

    private function resolveTraining(Request $request): ?Training
    {
        if ($request->filled('training_id')) {
            return Training::find($request->integer('training_id'));
        }

        return Training::query()
            ->where('is_active', true)
            ->orderByDesc('start_date')
            ->orderBy('id')
            ->first();
    }

    private function emptyStatistics(): array
    {
        return [
            'title' => 'Statistik',
            'training' => null,
            'average_score' => 0,
            'participant_count' => 0,
            'passed_count' => 0,
            'failed_count' => 0,
            'highest_score' => 0,
            'lowest_score' => 0,
            'pass_percentage' => 0,
        ];
    }

    private function formatNumber(null|int|float|string $value): int|float
    {
        $number = round((float) ($value ?? 0), 1);

        return fmod($number, 1.0) === 0.0 ? (int) $number : $number;
    }
}
