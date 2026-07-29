<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Question;
use App\Models\Test;
use App\Models\Training;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class QuestionController extends Controller
{
    private const TEST_TYPES = ['pretest', 'posttest'];
    private const ANSWERS = ['A', 'B', 'C', 'D'];

    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'training_id' => ['nullable', 'required_with:type', 'integer', 'exists:trainings,id'],
            'type' => ['nullable', 'required_with:training_id', Rule::in(self::TEST_TYPES)],
        ]);

        $query = Question::query()
            ->with('test:id,training_id,type')
            ->select('id', 'test_id', 'question', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_answer', 'order_number')
            ->orderBy('order_number')
            ->orderBy('id');

        if (! empty($validated['training_id']) || ! empty($validated['type'])) {
            $query->whereHas('test', function ($testQuery) use ($validated) {
                if (! empty($validated['training_id'])) {
                    $testQuery->where('training_id', $validated['training_id']);
                }

                if (! empty($validated['type'])) {
                    $testQuery->where('type', $validated['type']);
                }
            });
        }

        $questions = $query->get();

        return response()->json([
            'success' => true,
            'data' => $questions,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $this->validateQuestion($request);
        $test = $this->resolveTest($request);

        $validated['test_id'] = $test->id;
        $validated['order_number'] = ((int) $test->questions()->max('order_number')) + 1;

        $question = Question::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Soal berhasil ditambahkan.',
            'data' => $question,
        ], 201);
    }

    public function previewImport(Request $request): JsonResponse
    {
        $this->validateImportRequest($request);

        $questions = $this->parseDocxQuestions($request->file('file')->getRealPath());
        $errors = $this->validateParsedQuestions($questions);

        return response()->json([
            'success' => count($errors) === 0,
            'message' => count($errors) === 0
                ? 'File Word berhasil dibaca.'
                : 'File Word memiliki format soal yang belum valid.',
            'data' => [
                'questions' => $questions,
                'errors' => $errors,
            ],
        ], count($errors) === 0 ? 200 : 422);
    }

    public function import(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'training_id' => ['required', 'integer', 'exists:trainings,id'],
            'type' => ['required', Rule::in(self::TEST_TYPES)],
            'questions' => ['required', 'array', 'min:1'],
            'questions.*.question' => ['required', 'string'],
            'questions.*.option_a' => ['required', 'string', 'max:255'],
            'questions.*.option_b' => ['required', 'string', 'max:255'],
            'questions.*.option_c' => ['required', 'string', 'max:255'],
            'questions.*.option_d' => ['required', 'string', 'max:255'],
            'questions.*.correct_answer' => ['required', Rule::in(self::ANSWERS)],
        ]);

        $errors = $this->validateParsedQuestions($validated['questions']);

        if (count($errors) > 0) {
            return response()->json([
                'success' => false,
                'message' => 'Import dibatalkan karena ada soal yang belum valid.',
                'data' => [
                    'errors' => $errors,
                ],
            ], 422);
        }

        $test = $this->testForTraining((int) $validated['training_id'], $validated['type']);

        $created = DB::transaction(function () use ($test, $validated) {
            $nextOrder = ((int) $test->questions()->max('order_number')) + 1;

            return collect($validated['questions'])->map(function (array $question) use ($test, &$nextOrder) {
                return Question::create([
                    'test_id' => $test->id,
                    'question' => trim($question['question']),
                    'option_a' => trim($question['option_a']),
                    'option_b' => trim($question['option_b']),
                    'option_c' => trim($question['option_c']),
                    'option_d' => trim($question['option_d']),
                    'correct_answer' => strtoupper($question['correct_answer']),
                    'order_number' => $nextOrder++,
                ]);
            })->values();
        });

        return response()->json([
            'success' => true,
            'message' => 'Soal berhasil diimport.',
            'data' => $created,
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

    private function resolveTest(Request $request): Test
    {
        $validated = $request->validate([
            'training_id' => ['nullable', 'required_with:type', 'integer', 'exists:trainings,id'],
            'type' => ['nullable', 'required_with:training_id', Rule::in(self::TEST_TYPES)],
        ]);

        if (! empty($validated['training_id']) && ! empty($validated['type'])) {
            return $this->testForTraining((int) $validated['training_id'], $validated['type']);
        }

        return $this->defaultTest();
    }

    private function testForTraining(int $trainingId, string $type): Test
    {
        return Test::firstOrCreate(
            [
                'training_id' => $trainingId,
                'type' => $type,
            ],
            [
                'duration' => 30,
                'passing_score' => 70,
            ]
        );
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
                'type' => 'pretest',
            ],
            [
                'duration' => 30,
                'passing_score' => 70,
            ]
        );
    }

    private function validateImportRequest(Request $request): void
    {
        $request->validate([
            'training_id' => ['required', 'integer', 'exists:trainings,id'],
            'type' => ['required', Rule::in(self::TEST_TYPES)],
            'file' => [
                'required',
                'file',
                'max:10240',
                'extensions:docx',
                'mimetypes:application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/zip',
            ],
        ]);
    }

    private function parseDocxQuestions(string $path): array
    {
        $zip = new \ZipArchive();

        if ($zip->open($path) !== true) {
            return [];
        }

        $documentXml = $zip->getFromName('word/document.xml');
        $numberingXml = $zip->getFromName('word/numbering.xml') ?: '';
        $zip->close();

        if (! $documentXml) {
            return [];
        }

        $numbering = $this->buildNumberingDefinitions($numberingXml);
        $paragraphs = $this->extractParagraphText($documentXml, $numbering);
        $questions = [];
        $current = null;

        foreach ($paragraphs as $line) {
            $line = trim(preg_replace('/\s+/u', ' ', $line) ?? '');

            if ($line === '') {
                continue;
            }

            if (preg_match('/^\d+[\.\)]\s*(.+)$/u', $line, $match)) {
                if ($current !== null) {
                    $questions[] = $current;
                }

                $current = $this->emptyParsedQuestion(trim($match[1]));

                continue;
            }

            if (preg_match('/^([A-Z])[\.\)]\s*(.+)$/iu', $line, $match)) {
                if ($current === null) {
                    $current = $this->emptyParsedQuestion('');
                    $current['_format_errors'][] = 'Option ditemukan sebelum pertanyaan.';
                }

                $option = strtoupper($match[1]);

                if (! in_array($option, self::ANSWERS, true)) {
                    $current['_format_errors'][] = 'Option '.$option.' tidak didukung. Gunakan A sampai D.';
                    continue;
                }

                $current['option_'.strtolower($option)] = trim($match[2]);
                continue;
            }

            if (preg_match('/^(jawaban|answer)\s*:\s*(.+)$/iu', $line, $match)) {
                if ($current === null) {
                    $current = $this->emptyParsedQuestion('');
                    $current['_format_errors'][] = 'Jawaban ditemukan sebelum pertanyaan.';
                }

                $answer = strtoupper(trim($match[2]));

                if (! in_array($answer, self::ANSWERS, true)) {
                    $current['_format_errors'][] = 'Jawaban '.$answer.' tidak valid. Gunakan A, B, C, atau D.';
                    continue;
                }

                $current['correct_answer'] = $answer;
                continue;
            }

            if ($current === null) {
                $current = $this->emptyParsedQuestion($line);
                continue;
            }

            if (trim($current['correct_answer'] ?? '') !== '') {
                $questions[] = $current;
                $current = $this->emptyParsedQuestion($line);
                continue;
            }

            $hasOptionOrAnswer = collect(['option_a', 'option_b', 'option_c', 'option_d', 'correct_answer'])
                ->contains(fn ($key) => trim($current[$key] ?? '') !== '');

            if ($hasOptionOrAnswer) {
                $current['_format_errors'][] = 'Baris tidak dikenali: '.$line;
                continue;
            }

            if ($current['question'] !== '') {
                $current['question'] .= ' '.$line;
            }
        }

        if ($current !== null) {
            $questions[] = $current;
        }

        return array_values($questions);
    }

    private function emptyParsedQuestion(string $question): array
    {
        return [
            'question' => $question,
            'option_a' => '',
            'option_b' => '',
            'option_c' => '',
            'option_d' => '',
            'correct_answer' => '',
        ];
    }

    private function extractParagraphText(string $documentXml, array $numbering = []): array
    {
        $dom = new \DOMDocument();
        $previous = libxml_use_internal_errors(true);
        $loaded = $dom->loadXML($documentXml, LIBXML_NONET);
        libxml_clear_errors();
        libxml_use_internal_errors($previous);

        if (! $loaded) {
            return [];
        }

        $xpath = new \DOMXPath($dom);
        $xpath->registerNamespace('w', 'http://schemas.openxmlformats.org/wordprocessingml/2006/main');

        $paragraphs = [];
        $numberCounters = [];

        foreach ($xpath->query('//w:p') as $paragraph) {
            $text = $this->paragraphTextWithBreaks($paragraph);
            $label = $this->paragraphNumberingLabel($xpath, $paragraph, $numbering, $numberCounters);

            $lines = preg_split('/\R/u', $text) ?: [];

            foreach ($lines as $index => $line) {
                $line = trim($line);

                if ($line === '') {
                    continue;
                }

                $paragraphs[] = trim(($index === 0 ? $label : '').' '.$line);
            }
        }

        return $paragraphs;
    }

    private function paragraphTextWithBreaks(\DOMNode $paragraph): string
    {
        $text = '';

        foreach ($paragraph->childNodes as $child) {
            $text .= $this->nodeTextWithBreaks($child);
        }

        return $text;
    }

    private function nodeTextWithBreaks(\DOMNode $node): string
    {
        if ($node instanceof \DOMElement) {
            $localName = $node->localName;
            $namespace = $node->namespaceURI;

            if ($namespace === 'http://schemas.openxmlformats.org/wordprocessingml/2006/main') {
                if ($localName === 't') {
                    return $node->nodeValue;
                }

                if ($localName === 'br' || $localName === 'cr') {
                    return "\n";
                }

                if ($localName === 'tab') {
                    return ' ';
                }
            }
        }

        $text = '';

        foreach ($node->childNodes as $child) {
            $text .= $this->nodeTextWithBreaks($child);
        }

        return $text;
    }

    private function buildNumberingDefinitions(string $numberingXml): array
    {
        if ($numberingXml === '') {
            return [];
        }

        $dom = new \DOMDocument();
        $previous = libxml_use_internal_errors(true);
        $loaded = $dom->loadXML($numberingXml, LIBXML_NONET);
        libxml_clear_errors();
        libxml_use_internal_errors($previous);

        if (! $loaded) {
            return [];
        }

        $xpath = new \DOMXPath($dom);
        $xpath->registerNamespace('w', 'http://schemas.openxmlformats.org/wordprocessingml/2006/main');

        $abstracts = [];
        foreach ($xpath->query('//w:abstractNum') as $abstractNum) {
            $abstractId = $this->wordAttribute($abstractNum, 'abstractNumId');
            if ($abstractId === null) {
                continue;
            }

            foreach ($xpath->query('./w:lvl', $abstractNum) as $level) {
                $levelId = $this->wordAttribute($level, 'ilvl') ?? '0';
                $abstracts[$abstractId][$levelId] = [
                    'format' => $this->wordAttribute($xpath->query('./w:numFmt', $level)->item(0), 'val') ?? 'decimal',
                    'text' => $this->wordAttribute($xpath->query('./w:lvlText', $level)->item(0), 'val') ?? '%1.',
                    'start' => (int) ($this->wordAttribute($xpath->query('./w:start', $level)->item(0), 'val') ?? 1),
                ];
            }
        }

        $nums = [];
        foreach ($xpath->query('//w:num') as $num) {
            $numId = $this->wordAttribute($num, 'numId');
            $abstractId = $this->wordAttribute($xpath->query('./w:abstractNumId', $num)->item(0), 'val');

            if ($numId !== null && $abstractId !== null) {
                $nums[$numId] = $abstractId;
            }
        }

        return [
            'abstracts' => $abstracts,
            'nums' => $nums,
        ];
    }

    private function paragraphNumberingLabel(
        \DOMXPath $xpath,
        \DOMNode $paragraph,
        array $numbering,
        array &$numberCounters
    ): string {
        $numId = $this->wordAttribute($xpath->query('./w:pPr/w:numPr/w:numId', $paragraph)->item(0), 'val');
        $levelId = $this->wordAttribute($xpath->query('./w:pPr/w:numPr/w:ilvl', $paragraph)->item(0), 'val') ?? '0';

        if ($numId === null) {
            return '';
        }

        $abstractId = $numbering['nums'][$numId] ?? null;
        $level = $abstractId !== null ? ($numbering['abstracts'][$abstractId][$levelId] ?? null) : null;

        if ($level === null || in_array($level['format'], ['bullet', 'none'], true)) {
            return '';
        }

        $counterKey = $numId.':'.$levelId;
        $numberCounters[$counterKey] = ($numberCounters[$counterKey] ?? ($level['start'] - 1)) + 1;

        foreach (array_keys($numberCounters) as $key) {
            [$keyNumId, $keyLevelId] = explode(':', $key);
            if ($keyNumId === $numId && (int) $keyLevelId > (int) $levelId) {
                unset($numberCounters[$key]);
            }
        }

        $value = $this->formatNumberingValue($numberCounters[$counterKey], $level['format']);

        return str_replace('%'.((int) $levelId + 1), $value, $level['text']);
    }

    private function formatNumberingValue(int $number, string $format): string
    {
        return match ($format) {
            'upperLetter' => $this->numberToLetters($number),
            'lowerLetter' => strtolower($this->numberToLetters($number)),
            default => (string) $number,
        };
    }

    private function numberToLetters(int $number): string
    {
        $letters = '';

        while ($number > 0) {
            $number--;
            $letters = chr(65 + ($number % 26)).$letters;
            $number = intdiv($number, 26);
        }

        return $letters;
    }

    private function wordAttribute(?\DOMNode $node, string $name): ?string
    {
        if (! $node instanceof \DOMElement) {
            return null;
        }

        return $node->getAttributeNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main', $name)
            ?: $node->getAttribute('w:'.$name)
            ?: $node->getAttribute($name)
            ?: null;
    }

    private function validateParsedQuestions(array $questions): array
    {
        if (count($questions) === 0) {
            return ['File Word tidak berisi soal dengan format yang dapat dibaca.'];
        }

        $errors = [];

        foreach ($questions as $index => $question) {
            $number = $index + 1;

            if (trim($question['question'] ?? '') === '') {
                $errors[] = "Soal nomor {$number}: pertanyaan wajib diisi.";
            }

            foreach (['a', 'b', 'c', 'd'] as $option) {
                if (trim($question["option_{$option}"] ?? '') === '') {
                    $errors[] = 'Soal nomor '.$number.': option '.strtoupper($option).' wajib diisi.';
                }
            }

            $answer = strtoupper($question['correct_answer'] ?? '');
            if (! in_array($answer, self::ANSWERS, true)) {
                $errors[] = "Soal nomor {$number}: jawaban benar harus A, B, C, atau D.";
            }

            foreach ($question['_format_errors'] ?? [] as $formatError) {
                $errors[] = "Soal nomor {$number}: {$formatError}";
            }
        }

        return $errors;
    }
}
