<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Question;
use App\Models\Test;
use App\Models\Training;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class QuestionController extends Controller
{
    public function index(): JsonResponse
    {
        $questions = Question::query()
            ->select('id', 'test_id', 'question', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_answer', 'order_number')
            ->orderBy('order_number')
            ->orderBy('id')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $questions,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $this->validateQuestion($request);
        $test = $this->defaultTest();

        $validated['test_id'] = $test->id;
        $validated['order_number'] = ((int) $test->questions()->max('order_number')) + 1;

        $question = Question::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Soal berhasil ditambahkan.',
            'data' => $question,
        ], 201);
    }

    public function update(Request $request, Question $question): JsonResponse
    {
        $question->update($this->validateQuestion($request));

        return response()->json([
            'success' => true,
            'message' => 'Soal berhasil diperbarui.',
            'data' => $question->fresh(),
        ]);
    }

    public function destroy(Question $question): JsonResponse
    {
        $question->delete();

        return response()->json([
            'success' => true,
            'message' => 'Soal berhasil dihapus.',
        ]);
    }

    private function validateQuestion(Request $request): array
    {
        return $request->validate([
            'question' => ['required', 'string'],
            'option_a' => ['required', 'string', 'max:255'],
            'option_b' => ['required', 'string', 'max:255'],
            'option_c' => ['required', 'string', 'max:255'],
            'option_d' => ['required', 'string', 'max:255'],
            'correct_answer' => ['required', Rule::in(['A', 'B', 'C', 'D'])],
        ]);
    }

    private function defaultTest(): Test
    {
        $training = Training::query()->first();

        if (! $training) {
            $training = Training::create([
                'title' => 'Pelatihan Karyawan',
                'description' => 'Pelatihan default untuk materi karyawan.',
                'start_date' => null,
                'end_date' => null,
                'is_active' => true,
            ]);
        }

        return Test::firstOrCreate(
            [
                'training_id' => $training->id,
                'type' => 'posttest',
            ],
            [
                'duration' => 30,
                'passing_score' => 70,
            ]
        );
    }
}
