<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PostTestAccess;
use App\Models\TestResult;
use App\Models\Training;
use App\Models\TrainingParticipant;
use App\Models\User;
use App\Models\UserAnswer;
use App\Models\UserMaterial;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TrainingHistoryController extends Controller
{
    public function employeeIndex(Request $request): JsonResponse
    {
        $histories = $this->completedResultsQuery()
            ->where('user_id', $request->user()->id)
            ->get()
            ->unique(fn (TestResult $result) => $result->test->training_id)
            ->map(fn (TestResult $result) => $this->payload($result))
            ->values();

        return response()->json([
            'success' => true,
            'data' => [
                'title' => 'Riwayat Pelatihan',
                'message' => $histories->isEmpty()
                    ? 'Belum ada pelatihan yang selesai.'
                    : 'Daftar pelatihan yang telah Anda selesaikan.',
                'histories' => $histories,
            ],
        ]);
    }

    public function adminIndex(): JsonResponse
    {
        $histories = $this->completedResultsQuery()
            ->whereHas('user.role', fn ($query) => $query->whereIn('name', User::PARTICIPANT_ROLES))
            ->get()
            ->unique(fn (TestResult $result) => $result->user_id.'-'.$result->test->training_id)
            ->map(fn (TestResult $result) => $this->payload($result, true))
            ->values();

        return response()->json([
            'success' => true,
            'data' => [
                'title' => 'Riwayat Pelatihan',
                'message' => $histories->isEmpty()
                    ? 'Belum ada riwayat pelatihan karyawan.'
                    : 'Daftar riwayat pelatihan karyawan yang telah selesai.',
                'histories' => $histories,
            ],
        ]);
    }

    public function destroy(Training $training, User $user): JsonResponse
    {
        abort_unless(in_array($user->role?->name, User::PARTICIPANT_ROLES, true), 422, 'Riwayat hanya dapat dihapus untuk peserta.');

        $deleted = DB::transaction(function () use ($training, $user) {
            $testIds = $training->tests()->pluck('id');
            $questionIds = DB::table('questions')->whereIn('test_id', $testIds)->pluck('id');
            $materialIds = $training->materials()->pluck('id');

            UserAnswer::query()->where('user_id', $user->id)->whereIn('question_id', $questionIds)->delete();
            UserMaterial::query()->where('user_id', $user->id)->whereIn('material_id', $materialIds)->delete();
            PostTestAccess::query()->where('user_id', $user->id)->where('training_id', $training->id)->delete();
            TrainingParticipant::query()->where('user_id', $user->id)->where('training_id', $training->id)->delete();

            return TestResult::query()
                ->where('user_id', $user->id)
                ->whereIn('test_id', $testIds)
                ->delete();
        });

        if ($deleted === 0) {
            return response()->json([
                'success' => false,
                'message' => 'Riwayat pelatihan tidak ditemukan.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => "Riwayat pelatihan {$user->name} berhasil dihapus.",
        ]);
    }

    private function completedResultsQuery()
    {
        return TestResult::query()
            ->with([
                'user:id,employee_number,name,department,position,email,role_id',
                'user.trainingParticipations:id,user_id,training_id,department',
                'test:id,training_id,type',
                'test.training:id,title,start_date,end_date,certificate_template_path,certificate_template_settings',
                'certificate:id,user_id,test_result_id,certificate_number,issued_at',
            ])
            ->whereNull('reset_at')
            ->whereNotNull('finished_at')
            ->whereHas('test', fn ($query) => $query->where('type', 'posttest'))
            ->latest('finished_at');
    }

    private function payload(TestResult $result, bool $includeEmployee = false): array
    {
        $training = $result->test->training;
        $certificate = $result->certificate;
        $payload = [
            'id' => $result->id,
            'training' => [
                'id' => $training->id,
                'title' => $training->title,
                'start_date' => optional($training->start_date)->toDateString(),
                'end_date' => optional($training->end_date)->toDateString(),
            ],
            'result' => [
                'score' => $result->score,
                'status' => $result->status,
                'finished_at' => optional($result->finished_at)->toISOString(),
            ],
            'certificate' => $certificate ? [
                'id' => $certificate->id,
                'certificate_number' => $certificate->certificate_number,
                'issued_at' => optional($certificate->issued_at)->toDateString(),
                'preview_url' => "/employee/certificate/{$training->id}",
            ] : null,
        ];

        if ($includeEmployee) {
            $department = $result->user->trainingParticipations
                ->firstWhere('training_id', $training->id)?->department
                ?? $result->user->department;

            $payload['employee'] = [
                'id' => $result->user->id,
                'employee_number' => $result->user->employee_number,
                'name' => $result->user->name,
                'department' => $department,
                'position' => $result->user->position,
                'email' => $result->user->email,
            ];
        }

        return $payload;
    }
}
