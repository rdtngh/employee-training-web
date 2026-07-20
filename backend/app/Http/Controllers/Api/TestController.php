<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\SubmitTestRequest;
use App\Models\Certificate;
use App\Models\Question;
use App\Models\Test;
use App\Models\TestResult;
use App\Models\Training;
use App\Models\UserAnswer;
use App\Models\UserMaterial;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class TestController extends Controller
{
    public function show(Test $test): JsonResponse
    {
        if (! $this->canAccessTest($test)) {
            return $this->lockedResponse();
        }

        $test->load('training');

        $passedResult = $this->passedResultForCurrentUser($test);

        return response()->json([
            'success' => true,
            'data' => $this->testPayload($test, $passedResult),
        ]);
    }

    public function showByType(Training $training, string $type): JsonResponse
    {
        abort_unless(in_array($type, ['pretest', 'posttest'], true), 404);

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

        if (! $this->canAccessTest($test)) {
            return $this->lockedResponse();
        }

        $passedResult = $this->passedResultForCurrentUser($test);

        return response()->json([
            'success' => true,
            'data' => $this->testPayload($test, $passedResult),
        ]);
    }

    public function questions(Test $test): JsonResponse
    {
        if (! $this->canAccessTest($test)) {
            return $this->lockedResponse();
        }

        if ($this->passedResultForCurrentUser($test)) {
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
            'data' => $this->shuffleQuestionsForUser($questions, $test),
        ]);
    }

    public function submit(SubmitTestRequest $request, Test $test): JsonResponse
    {
        if (! $this->canAccessTest($test)) {
            return $this->lockedResponse();
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

            if ($selected && $selected['selected_answer'] === $question->correct_answer) {
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
                        'selected_answer' => $selected['selected_answer'],
                    ]
                );
            }
        }

        $score = $questions->count() > 0 ? round(($correct / $questions->count()) * 100) : 0;
        $status = $score >= $test->passing_score ? 'Lulus' : 'Tidak Lulus';

        $testResult = DB::transaction(function () use ($user, $test, $score, $correct, $wrong, $status) {
            $result = TestResult::updateOrCreate(
                [
                    'user_id' => $user->id,
                    'test_id' => $test->id,
                ],
                [
                    'score' => $score,
                    'correct_answers' => $correct,
                    'wrong_answers' => $wrong,
                    'status' => $status,
                    'started_at' => now(),
                    'finished_at' => now(),
                ]
            );

            if ($status === 'Lulus') {
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
            'data' => $this->resultPayload($testResult),
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
            'test_result_id' => $result->id,
        ];
    }

    private function passedResultForCurrentUser(Test $test): ?TestResult
    {
        return TestResult::where('user_id', request()->user()->id)
            ->where('test_id', $test->id)
            ->where('status', 'Lulus')
            ->first();
    }

    private function canAccessTest(Test $test): bool
    {
        if ($test->type === 'pretest') {
            return true;
        }

        if ($test->type !== 'posttest') {
            return false;
        }

        return $this->hasCompletedPreTest($test) && $this->hasCompletedMaterials($test);
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
            ? TestResult::where('user_id', request()->user()->id)->where('test_id', $preTestId)->exists()
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

    private function lockedResponse(): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => 'Pre-Test dan materi harus diselesaikan sebelum membuka Post-Test.',
        ], 403);
    }

    private function shuffleQuestionsForUser(Collection $questions, Test $test): Collection
    {
        $userId = request()->user()->id;

        return $questions
            ->sortBy(fn ($question) => crc32("{$test->id}:{$userId}:{$question->id}"))
            ->values();
    }
}
