<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\SubmitTestRequest;
use App\Models\Certificate;
use App\Models\PostTestAccess;
use App\Models\Question;
use App\Models\Test;
use App\Models\TestResult;
use App\Models\Training;
use App\Models\TrainingParticipant;
use App\Models\UserAnswer;
use App\Models\UserMaterial;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class TestController extends Controller
{
    private const EMERGENCY_UNLOCK_EMPLOYEE_FLOW = false;

    public function show(Test $test): JsonResponse
    {
        if ($response = $this->testAccessError($test)) {
            return $response;
        }

        $test->load('training');

        $visibleResult = $this->visibleResultForCurrentUser($test);

        return response()->json([
            'success' => true,
            'data' => $this->testPayload($test, $visibleResult),
        ]);
    }

    public function showByType(Training $training, string $type): JsonResponse
    {
        abort_unless(in_array($type, ['pretest', 'posttest'], true), 404);

        if (! $training->is_active) {
            return $this->lockedResponse('Pelatihan belum tersedia.');
        }

        $test = Test::firstOrCreate(
            [
                'training_id' => $training->id,
                'type' => $type,
            ],
            [
                'duration' => 30,
                'passing_score' => 70,
            ]
        );

        $test->load('training');

        if ($response = $this->testAccessError($test)) {
            return $response;
        }

        $visibleResult = $this->visibleResultForCurrentUser($test);

        return response()->json([
            'success' => true,
            'data' => $this->testPayload($test, $visibleResult),
        ]);
    }

    public function questions(Test $test): JsonResponse
    {
        if ($response = $this->testAccessError($test)) {
            return $response;
        }

        if ($this->visibleResultForCurrentUser($test)) {
            return response()->json([
                'success' => true,
                'data' => [],
            ]);
        }

        $questions = $this->questionsForTest($test)
            ->select('id', 'test_id', 'question', 'option_a', 'option_b', 'option_c', 'option_d', 'order_number')
            ->orderBy('order_number')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $this->shuffleQuestionsForUser($questions, $test)
                ->map(fn (Question $question) => $this->shuffleQuestionOptionsForUser($question, $test))
                ->values(),
        ]);
    }

    public function start(Test $test): JsonResponse
    {
        if ($response = $this->testAccessError($test)) {
            return $response;
        }

        TrainingParticipant::capture(request()->user(), $test->training_id);

        return response()->json([
            'success' => true,
            'data' => [
                'started_at' => now()->toISOString(),
            ],
        ]);
    }

    public function submit(SubmitTestRequest $request, Test $test): JsonResponse
    {
        if ($response = $this->testAccessError($test)) {
            return $response;
        }

        TrainingParticipant::capture($request->user(), $test->training_id);

        if ($test->type === 'pretest' && $visibleResult = $this->visibleResultForCurrentUser($test)) {
            return response()->json([
                'success' => true,
                'message' => 'Pre-Test sudah dikerjakan untuk pelatihan ini.',
                'data' => $this->resultPayload($visibleResult),
            ]);
        }

        $passedResult = $this->passedResultForCurrentUser($test);

        if ($passedResult) {
            return response()->json([
                'success' => true,
                'message' => 'Tes sudah lulus dan tidak dapat dikerjakan ulang.',
                'data' => $this->resultPayload($passedResult),
            ]);
        }

        $user = $request->user();
        $answers = collect($request->answers)->keyBy('question_id');
        $questions = $this->questionsForTest($test)->select('id', 'correct_answer')->get();

        $correct = 0;
        $wrong = 0;

        foreach ($questions as $question) {
            $selected = $answers->get($question->id);
            $selectedAnswer = $selected
                ? $this->originalAnswerForDisplayedAnswer($question, $test, $selected['selected_answer'])
                : null;

            if ($selectedAnswer && $selectedAnswer === $question->correct_answer) {
                $correct++;
            } else {
                $wrong++;
            }

            if ($selected) {
                UserAnswer::updateOrCreate(
                    [
                        'user_id' => $user->id,
                        'question_id' => $question->id,
                    ],
                    [
                        'selected_answer' => $selectedAnswer ?? $selected['selected_answer'],
                    ]
                );
            }
        }

        $score = $questions->count() > 0 ? round(($correct / $questions->count()) * 100) : 0;
        $status = $score >= $test->passing_score ? 'Lulus' : 'Tidak Lulus';
        [$startedAt, $finishedAt] = $this->submissionTimes($request);

        $testResult = DB::transaction(function () use ($user, $test, $score, $correct, $wrong, $status, $startedAt, $finishedAt) {
            $result = TestResult::create([
                'user_id' => $user->id,
                'test_id' => $test->id,
                'score' => $score,
                'correct_answers' => $correct,
                'wrong_answers' => $wrong,
                'status' => $status,
                'started_at' => $startedAt,
                'finished_at' => $finishedAt,
                'excluded_from_top_scores_at' => null,
                'reset_at' => null,
            ]);

            if ($test->type === 'posttest' && $status === 'Lulus') {
                Certificate::firstOrCreate(
                    [
                        'user_id' => $user->id,
                        'test_result_id' => $result->id,
                    ],
                    [
                        'certificate_number' => strtoupper(Str::random(12)),
                        'file_path' => '',
                        'issued_at' => now(),
                    ]
                );
            }

            return $result;
        });

        return response()->json([
            'success' => true,
            'message' => 'Hasil tes berhasil disimpan.',
            'data' => $this->resultPayload($testResult->loadMissing('test')),
        ]);
    }

    private function testPayload(Test $test, ?TestResult $passedResult): array
    {
        $payload = $test->toArray();

        if ($passedResult) {
            $payload['result'] = $this->resultPayload($passedResult);
        }

        return $payload;
    }

    private function resultPayload(TestResult $result): array
    {
        return [
            'score' => $result->score,
            'correct_answers' => $result->correct_answers,
            'wrong_answers' => $result->wrong_answers,
            'correct' => $result->correct_answers,
            'wrong' => $result->wrong_answers,
            'percentage' => $result->score,
            'status' => $result->status,
            'passed' => $result->status === 'Lulus',
            'can_retry' => $result->test?->type === 'posttest' && $result->status !== 'Lulus',
            'certificate_available' => $result->test?->type === 'posttest' && $result->status === 'Lulus',
            'test_result_id' => $result->id,
            'started_at' => optional($result->started_at)->toISOString(),
            'finished_at' => optional($result->finished_at)->toISOString(),
            'duration_seconds' => $this->durationSeconds($result),
            'duration_label' => $this->formatDuration($this->durationSeconds($result)),
        ];
    }

    private function passedResultForCurrentUser(Test $test): ?TestResult
    {
        return TestResult::with('test')
            ->where('user_id', request()->user()->id)
            ->where('test_id', $test->id)
            ->where('status', 'Lulus')
            ->whereNull('reset_at')
            ->first();
    }

    private function visibleResultForCurrentUser(Test $test): ?TestResult
    {
        if ($test->type === 'pretest') {
            return TestResult::with('test')
                ->where('user_id', request()->user()->id)
                ->where('test_id', $test->id)
                ->whereNull('reset_at')
                ->latest('finished_at')
                ->first();
        }

        return $this->passedResultForCurrentUser($test);
    }

    private function testAccessError(Test $test): ?JsonResponse
    {
        $training = $test->training ?: Training::find($test->training_id);

        if ($training && ! $training->is_active) {
            return $this->lockedResponse('Pelatihan belum tersedia.');
        }

        if ($test->type === 'pretest') {
            return null;
        }

        if ($test->type !== 'posttest') {
            return $this->lockedResponse('Tes tidak dapat diakses.');
        }

        if ($this->passedResultForCurrentUser($test)) {
            return null;
        }

        if (self::EMERGENCY_UNLOCK_EMPLOYEE_FLOW) {
            return null;
        }

        if (! $this->hasCompletedPreTest($test) || ! $this->hasCompletedMaterials($test)) {
            return $this->lockedResponse('Pre-Test dan materi harus diselesaikan sebelum membuka Post-Test.');
        }

        if (! $this->hasVerifiedPostTestAccess($test)) {
            return $this->lockedResponse('Masukkan kode akses Post-Test untuk membuka tes.');
        }

        return null;
    }

    private function questionsForTest(Test $test)
    {
        if ($test->type !== 'posttest') {
            return $test->questions();
        }

        $preTestId = Test::where('training_id', $test->training_id)
            ->where('type', 'pretest')
            ->value('id');

        return Question::query()->where('test_id', $preTestId ?? $test->id);
    }

    private function hasCompletedPreTest(Test $test): bool
    {
        $preTestId = Test::where('training_id', $test->training_id)
            ->where('type', 'pretest')
            ->value('id');

        return $preTestId
            ? TestResult::where('user_id', request()->user()->id)
                ->where('test_id', $preTestId)
                ->whereNull('reset_at')
                ->exists()
            : false;
    }

    private function hasCompletedMaterials(Test $test): bool
    {
        $materialIds = $test->training
            ? $test->training->materials()->pluck('id')
            : collect();

        if ($materialIds->isEmpty()) {
            return false;
        }

        $completedCount = UserMaterial::where('user_id', request()->user()->id)
            ->whereIn('material_id', $materialIds)
            ->where('is_completed', true)
            ->count();

        return $completedCount >= $materialIds->count();
    }

    private function hasVerifiedPostTestAccess(Test $test): bool
    {
        $training = $test->training ?: Training::find($test->training_id);

        if (! ($training?->post_test_access_code_hash || $training?->post_test_access_code_encrypted)) {
            return false;
        }

        return PostTestAccess::query()
            ->where('user_id', request()->user()->id)
            ->where('training_id', $training->id)
            ->when($training->post_test_access_code_updated_at, function ($query, $updatedAt) {
                $query->where('verified_at', '>=', $updatedAt);
            })
            ->exists();
    }

    private function lockedResponse(string $message): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => $message,
        ], 403);
    }

    private function submissionTimes(SubmitTestRequest $request): array
    {
        $finishedAt = now();
        $startedAt = $request->date('started_at');
        $elapsedSeconds = $request->has('elapsed_seconds')
            ? max(1, $request->integer('elapsed_seconds'))
            : null;

        if (! $startedAt && $elapsedSeconds !== null) {
            return [
                $finishedAt->copy()->subSeconds($elapsedSeconds),
                $finishedAt,
            ];
        }

        $startedAt ??= $finishedAt;

        if ($startedAt->greaterThanOrEqualTo($finishedAt) && $elapsedSeconds !== null) {
            $startedAt = $finishedAt->copy()->subSeconds($elapsedSeconds);
        } elseif ($startedAt->greaterThan($finishedAt)) {
            $startedAt = $finishedAt;
        }

        return [$startedAt, $finishedAt];
    }

    private function durationSeconds(TestResult $result): ?int
    {
        if (! $result->started_at || ! $result->finished_at) {
            return null;
        }

        $seconds = $result->finished_at->getTimestamp() - $result->started_at->getTimestamp();

        return $seconds > 0 ? $seconds : null;
    }

    private function formatDuration(?int $seconds): string
    {
        if ($seconds === null) {
            return '-';
        }

        $minutes = intdiv($seconds, 60);
        $remainingSeconds = $seconds % 60;

        if ($minutes <= 0) {
            return $remainingSeconds.' detik';
        }

        return $minutes.' menit '.$remainingSeconds.' detik';
    }

    private function shuffleQuestionsForUser(Collection $questions, Test $test): Collection
    {
        $userId = request()->user()->id;

        return $questions
            ->sortBy(fn ($question) => crc32("{$test->id}:{$userId}:{$question->id}"))
            ->values();
    }

    private function shuffleQuestionOptionsForUser(Question $question, Test $test): Question
    {
        $displayToOriginal = $this->displayToOriginalAnswerMap($question, $test);
        $optionValues = [
            'A' => $question->option_a,
            'B' => $question->option_b,
            'C' => $question->option_c,
            'D' => $question->option_d,
        ];

        foreach ($displayToOriginal as $displayAnswer => $originalAnswer) {
            $question->setAttribute(
                'option_'.strtolower($displayAnswer),
                $optionValues[$originalAnswer] ?? null
            );
        }

        return $question;
    }

    private function originalAnswerForDisplayedAnswer(Question $question, Test $test, string $displayedAnswer): string
    {
        $displayToOriginal = $this->displayToOriginalAnswerMap($question, $test);

        return $displayToOriginal[strtoupper($displayedAnswer)] ?? strtoupper($displayedAnswer);
    }

    private function displayToOriginalAnswerMap(Question $question, Test $test): array
    {
        $userId = request()->user()->id;
        $answers = collect(['A', 'B', 'C', 'D'])
            ->sortBy(fn ($answer) => crc32("{$test->id}:{$userId}:{$question->id}:option:{$answer}"))
            ->values();

        return array_combine(['A', 'B', 'C', 'D'], $answers->all()) ?: [
            'A' => 'A',
            'B' => 'B',
            'C' => 'C',
            'D' => 'D',
        ];
    }
}
