<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Question;
use App\Models\Test;
use App\Models\Training;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
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
            ->select('id', 'test_id', 'question', 'image_path', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_answer', 'order_number')
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
        $questions = $this->prepareQuestionImportPreviewImages($questions);
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
            'questions.*.image_data' => ['nullable', 'string', 'max:15000000'],
            'questions.*.image_token' => ['nullable', 'string', 'regex:#^question-import-previews/[a-f0-9-]+\.(?:png|jpg|gif|webp)$#'],
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
                    'image_path' => $this->storeImportedQuestionImage(
                        $question['image_data'] ?? null,
                        $question['image_token'] ?? null
                    ),
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
        if ($question->image_path) {
            Storage::disk('public')->delete($question->image_path);
        }

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
        $zip = new \ZipArchive;

        if ($zip->open($path) !== true) {
            return [];
        }

        $documentXml = $zip->getFromName('word/document.xml');
        $numberingXml = $zip->getFromName('word/numbering.xml') ?: '';
        $imageRelationships = $this->extractDocxImageRelationships($zip);
        $zip->close();

        if (! $documentXml) {
            return [];
        }

        $numbering = $this->buildNumberingDefinitions($numberingXml);
        $paragraphs = $this->extractParagraphText($documentXml, $numbering, $imageRelationships);
        $questions = [];
        $current = null;

        $pendingOption = null;

        foreach ($paragraphs as $paragraph) {
            $line = $paragraph['text'];
            $imageData = $paragraph['image_data'] ?? null;
            $line = trim(preg_replace('/\s+/u', ' ', $line) ?? '');

            if ($line === '' && $imageData) {
                if ($current === null) {
                    $current = $this->emptyParsedQuestion('');
                }
                $current['image_data'] ??= $imageData;

                continue;
            }

            if ($line === '') {
                continue;
            }

            if ($pendingOption !== null && $current !== null) {
                $current['option_'.strtolower($pendingOption)] = $line;
                $current['image_data'] ??= $imageData;
                $pendingOption = null;

                continue;
            }

            if ($questionText = $this->extractQuestionText($line)) {
                if ($current !== null) {
                    $this->resolveUnlabeledOptionLines($current);
                    $questions[] = $current;
                }

                $current = $this->emptyParsedQuestion($questionText, $imageData);

                continue;
            }

            if ($option = $this->extractOption($line)) {
                if ($current === null) {
                    $current = $this->emptyParsedQuestion('');
                    $current['_format_errors'][] = 'Option ditemukan sebelum pertanyaan.';
                }

                [$optionLabel, $optionText] = $option;
                $this->resolveUnlabeledOptionLines($current, false);

                if (! in_array($optionLabel, self::ANSWERS, true)) {
                    $current['_format_errors'][] = 'Option '.$optionLabel.' tidak didukung. Gunakan A sampai D.';

                    continue;
                }

                $current['option_'.strtolower($optionLabel)] = $optionText;
                $current['image_data'] ??= $imageData;

                continue;
            }

            if ($optionLabel = $this->extractOptionLabel($line)) {
                if ($current === null) {
                    $current = $this->emptyParsedQuestion('');
                }
                $pendingOption = $optionLabel;

                continue;
            }

            if ($answer = $this->extractAnswer($line, $current)) {
                if ($current === null) {
                    $current = $this->emptyParsedQuestion('');
                    $current['_format_errors'][] = 'Jawaban ditemukan sebelum pertanyaan.';
                }

                if (! in_array($answer, self::ANSWERS, true)) {
                    $current['_format_errors'][] = 'Jawaban '.$answer.' tidak valid. Gunakan A, B, C, atau D.';

                    continue;
                }

                $this->resolveUnlabeledOptionLines($current, true);
                $current['correct_answer'] = $answer;

                continue;
            }

            if ($current === null) {
                $current = $this->emptyParsedQuestion($line, $imageData);

                continue;
            }

            $current['image_data'] ??= $imageData;

            if (trim($current['correct_answer'] ?? '') !== '') {
                $this->resolveUnlabeledOptionLines($current);
                $questions[] = $current;
                $current = $this->emptyParsedQuestion($line);

                continue;
            }

            $hasOptionOrAnswer = collect(['option_a', 'option_b', 'option_c', 'option_d', 'correct_answer'])
                ->contains(fn ($key) => trim($current[$key] ?? '') !== '');

            if ($hasOptionOrAnswer) {
                $lastOption = collect(self::ANSWERS)
                    ->filter(fn (string $answer) => trim($current['option_'.strtolower($answer)] ?? '') !== '')
                    ->last();

                if ($lastOption && $this->hasEmptyOptionAfter($current, $lastOption)) {
                    $key = 'option_'.strtolower($lastOption);
                    $current[$key] = trim($current[$key].' '.$line);
                } else {
                    $current['_format_errors'][] = 'Baris tidak dikenali: '.$line;
                }

                continue;
            }

            $current['_unlabeled_lines'][] = $line;
        }

        if ($current !== null) {
            $this->resolveUnlabeledOptionLines($current);
            $questions[] = $current;
        }

        return array_values($questions);
    }

    private function resolveUnlabeledOptionLines(array &$question, bool $inferOptions = false): void
    {
        $lines = $question['_unlabeled_lines'] ?? [];
        unset($question['_unlabeled_lines']);

        if ($lines === []) {
            return;
        }

        $hasOptions = collect(self::ANSWERS)
            ->contains(fn (string $answer) => trim($question['option_'.strtolower($answer)] ?? '') !== '');

        if ($inferOptions && ! $hasOptions && count($lines) === 4) {
            foreach (self::ANSWERS as $index => $answer) {
                $question['option_'.strtolower($answer)] = trim($lines[$index]);
            }

            return;
        }

        $question['question'] = trim($question['question'].' '.implode(' ', $lines));
    }

    private function hasEmptyOptionAfter(array $question, string $lastOption): bool
    {
        $lastIndex = array_search($lastOption, self::ANSWERS, true);

        foreach (array_slice(self::ANSWERS, $lastIndex + 1) as $answer) {
            if (trim($question['option_'.strtolower($answer)] ?? '') === '') {
                return true;
            }
        }

        return false;
    }

    private function extractQuestionText(string $line): ?string
    {
        $patterns = [
            '/^\s*(?:soal|pertanyaan|question|q|no\.?)\s*(?:nomor|no\.?)?\s*\d+\s*[\.\):\-\x{2013}\x{2014}]?\s*(.+)$/iu',
            '/^\s*\d+\s*[\.\):\-\x{2013}\x{2014}]\s*(.+)$/u',
            '/^\s*\d+\s+(?=[\pL])(.+)$/u',
        ];

        foreach ($patterns as $pattern) {
            if (preg_match($pattern, $line, $match)) {
                $question = trim($match[1]);

                return $question !== '' ? $question : null;
            }
        }

        return null;
    }

    private function extractOption(string $line): ?array
    {
        $patterns = [
            '/^\s*(?:option|opsi|pilihan)\s*([A-D])\s*[\.\):\-\x{2013}\x{2014}]?\s*(.+)$/iu',
            '/^\s*\(?([A-D])\)?\s*[\.\):\-\x{2013}\x{2014}]\s*(.+)$/iu',
        ];

        foreach ($patterns as $pattern) {
            if (preg_match($pattern, $line, $match)) {
                $label = strtoupper($match[1]);
                $text = trim($match[2]);

                return $text !== '' ? [$label, $text] : null;
            }
        }

        return null;
    }

    private function extractOptionLabel(string $line): ?string
    {
        if (preg_match('/^\s*(?:(?:option|opsi|pilihan)\s*)?\(?([A-D])\)?\s*[\.\):\-\x{2013}\x{2014}]?\s*$/iu', $line, $match)) {
            return strtoupper($match[1]);
        }

        return null;
    }

    private function extractAnswer(string $line, ?array $current): ?string
    {
        $patterns = [
            '/^\s*(?:kunci(?:\s*jawaban)?|jawaban(?:\s*benar)?|answer(?:\s*key)?|correct\s*answer|ans|key)\s*[\:\-\x{2013}\x{2014}]?\s*(.+)$/iu',
        ];

        foreach ($patterns as $pattern) {
            if (! preg_match($pattern, $line, $match)) {
                continue;
            }

            $value = trim($match[1]);
            if (preg_match('/^\(?([A-D])\)?(?:\s*[\.\)]|\s|$)/iu', $value, $answerMatch)) {
                return strtoupper($answerMatch[1]);
            }

            $matchedOption = $this->answerFromOptionText($value, $current);
            if ($matchedOption) {
                return $matchedOption;
            }

            return strtoupper($value);
        }

        return null;
    }

    private function answerFromOptionText(string $value, ?array $current): ?string
    {
        if (! $current) {
            return null;
        }

        $normalizedValue = $this->normalizeAnswerText($value);
        if ($normalizedValue === '') {
            return null;
        }

        foreach (self::ANSWERS as $answer) {
            $optionText = $current['option_'.strtolower($answer)] ?? '';

            if ($this->normalizeAnswerText($optionText) === $normalizedValue) {
                return $answer;
            }
        }

        return null;
    }

    private function normalizeAnswerText(string $value): string
    {
        return trim(preg_replace('/\s+/u', ' ', mb_strtolower($value, 'UTF-8')) ?? '');
    }

    private function emptyParsedQuestion(string $question, ?string $imageData = null): array
    {
        return array_filter([
            'question' => $question,
            'image_data' => $imageData,
            'option_a' => '',
            'option_b' => '',
            'option_c' => '',
            'option_d' => '',
            'correct_answer' => '',
        ], static fn ($value, $key) => $key !== 'image_data' || $value !== null, ARRAY_FILTER_USE_BOTH);
    }

    private function extractParagraphText(
        string $documentXml,
        array $numbering = [],
        array $imageRelationships = []
    ): array {
        $dom = new \DOMDocument;
        $previous = libxml_use_internal_errors(true);
        $loaded = $dom->loadXML($documentXml, LIBXML_NONET);
        libxml_clear_errors();
        libxml_use_internal_errors($previous);

        if (! $loaded) {
            return [];
        }

        $xpath = new \DOMXPath($dom);
        $xpath->registerNamespace('w', 'http://schemas.openxmlformats.org/wordprocessingml/2006/main');
        $xpath->registerNamespace('a', 'http://schemas.openxmlformats.org/drawingml/2006/main');
        $xpath->registerNamespace('r', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships');

        $paragraphs = [];
        $numberCounters = [];

        foreach ($xpath->query('//w:p') as $paragraph) {
            $text = $this->paragraphTextWithBreaks($paragraph);
            $label = $this->paragraphNumberingLabel($xpath, $paragraph, $numbering, $numberCounters);
            $imageData = null;
            $imageNode = $xpath->query('.//a:blip[@r:embed]', $paragraph)->item(0);
            if ($imageNode instanceof \DOMElement) {
                $relationshipId = $imageNode->getAttributeNS(
                    'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
                    'embed'
                );
                $imageData = $imageRelationships[$relationshipId] ?? null;
            }

            $lines = preg_split('/\R/u', $text) ?: [];

            foreach ($lines as $index => $line) {
                $line = trim($line);

                if ($line === '' && ! $imageData) {
                    continue;
                }

                $paragraphs[] = [
                    'text' => trim(($index === 0 ? $label : '').' '.$line),
                    'image_data' => $index === 0 ? $imageData : null,
                ];
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

    private function extractDocxImageRelationships(\ZipArchive $zip): array
    {
        $relationshipsXml = $zip->getFromName('word/_rels/document.xml.rels');

        if (! $relationshipsXml) {
            return [];
        }

        $dom = new \DOMDocument;
        $previous = libxml_use_internal_errors(true);
        $loaded = $dom->loadXML($relationshipsXml, LIBXML_NONET);
        libxml_clear_errors();
        libxml_use_internal_errors($previous);

        if (! $loaded) {
            return [];
        }

        $images = [];

        foreach ($dom->getElementsByTagName('Relationship') as $relationship) {
            if (! str_ends_with($relationship->getAttribute('Type'), '/image')) {
                continue;
            }

            $target = str_replace('\\', '/', $relationship->getAttribute('Target'));
            $target = preg_replace('#^(?:\.\./)+#', '', $target);
            $entry = str_starts_with($target, 'word/') ? $target : 'word/'.ltrim($target, '/');
            $contents = $zip->getFromName($entry);

            if ($contents === false || strlen($contents) > 8 * 1024 * 1024) {
                continue;
            }

            $extension = strtolower(pathinfo($entry, PATHINFO_EXTENSION));
            $mime = match ($extension) {
                'jpg', 'jpeg' => 'image/jpeg',
                'gif' => 'image/gif',
                'webp' => 'image/webp',
                default => 'image/png',
            };

            $images[$relationship->getAttribute('Id')] = 'data:'.$mime.';base64,'.base64_encode($contents);
        }

        return $images;
    }

    private function prepareQuestionImportPreviewImages(array $questions): array
    {
        foreach (Storage::disk('public')->files('question-import-previews') as $file) {
            if (Storage::disk('public')->lastModified($file) < now()->subDay()->timestamp) {
                Storage::disk('public')->delete($file);
            }
        }

        return collect($questions)->map(function (array $question) {
            $imageData = $question['image_data'] ?? null;
            unset($question['image_data']);

            if (! $imageData || ! preg_match('#^data:(image/(?:png|jpeg|gif|webp));base64,(.+)$#s', $imageData, $match)) {
                return $question;
            }

            $contents = base64_decode(preg_replace('/\s+/', '', $match[2]), true);
            if ($contents === false || strlen($contents) > 8 * 1024 * 1024) {
                return $question;
            }

            $extension = match ($match[1]) {
                'image/jpeg' => 'jpg',
                'image/gif' => 'gif',
                'image/webp' => 'webp',
                default => 'png',
            };
            $token = 'question-import-previews/'.Str::uuid().'.'.$extension;
            Storage::disk('public')->put($token, $contents);
            $question['image_token'] = $token;
            $question['image_preview_url'] = url('/storage/'.$token);

            return $question;
        })->all();
    }

    private function storeImportedQuestionImage(?string $imageData, ?string $imageToken = null): ?string
    {
        if ($imageToken && preg_match('#^question-import-previews/[a-f0-9-]+\.(png|jpg|gif|webp)$#', $imageToken, $match)) {
            if (Storage::disk('public')->exists($imageToken)) {
                $path = 'question-images/'.Str::uuid().'.'.$match[1];
                Storage::disk('public')->move($imageToken, $path);

                return $path;
            }
        }

        if (! $imageData) {
            return null;
        }

        if (! preg_match('#^data:(image/(?:png|jpeg|gif|webp));base64,([A-Za-z0-9+/=\r\n]+)$#', $imageData, $match)) {
            return null;
        }

        $contents = base64_decode(preg_replace('/\s+/', '', $match[2]), true);

        if ($contents === false || strlen($contents) > 8 * 1024 * 1024) {
            return null;
        }

        $extension = match ($match[1]) {
            'image/jpeg' => 'jpg',
            'image/gif' => 'gif',
            'image/webp' => 'webp',
            default => 'png',
        };
        $path = 'question-images/'.Str::uuid().'.'.$extension;
        Storage::disk('public')->put($path, $contents);

        return $path;
    }

    private function buildNumberingDefinitions(string $numberingXml): array
    {
        if ($numberingXml === '') {
            return [];
        }

        $dom = new \DOMDocument;
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
