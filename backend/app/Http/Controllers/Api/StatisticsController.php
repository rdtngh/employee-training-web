<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TestResult;
use App\Models\Training;
use App\Models\UserMaterial;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use ZipArchive;

class StatisticsController extends Controller
{
    private const RESET_PROTECTED_TRAINING_TITLES = [
        'Pelatihan Sosialisasi Pendidikan Dalam Pelayanan',
    ];

    public function index(Request $request): JsonResponse
    {
        $training = $this->resolveTraining($request);

        if (! $training) {
            return response()->json([
                'success' => true,
                'data' => $this->emptyStatistics(),
            ]);
        }

        $statistics = $this->trainingStatistics($training);
        unset($statistics['participant_rows']);

        return response()->json([
            'success' => true,
            'data' => [
                'title' => 'Statistik',
                'training' => [
                    'id' => $training->id,
                    'title' => $training->title,
                ],
                ...$statistics,
            ],
        ]);
    }

    public function reset(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'training_id' => ['required', 'integer', 'exists:trainings,id'],
            'reset_type' => ['required', 'string', 'in:pretest,posttest'],
            'user_ids' => ['sometimes', 'array'],
            'user_ids.*' => ['integer', 'exists:users,id'],
        ]);

        $training = $this->resolveTraining($request);

        if (! $training) {
            return response()->json([
                'success' => false,
                'message' => 'Training tidak ditemukan.',
            ], 404);
        }

        if ($this->isResetProtectedTraining($training)) {
            return response()->json([
                'success' => false,
                'message' => 'Pelatihan ini dilindungi dan tidak dapat direset karena digunakan untuk hasil testing.',
            ], 422);
        }

        $types = [$validated['reset_type']];

        $updated = DB::transaction(function () use ($training, $types, $validated) {
            $query = TestResult::query()
                ->whereHas('test', function ($query) use ($training) {
                    $query->where('training_id', $training->id);
                })
                ->whereHas('user.role', fn ($query) => $query->where('name', 'Karyawan'))
                ->whereHas('test', fn ($query) => $query->whereIn('type', $types))
                ->whereNull('reset_at');

            if (! empty($validated['user_ids'])) {
                $query->whereIn('user_id', $validated['user_ids']);
            }

            return $query->update(['reset_at' => now()]);
        });

        return response()->json([
            'success' => true,
            'message' => 'Reset pelatihan berhasil diproses.',
            'data' => [
                'training' => [
                    'id' => $training->id,
                    'title' => $training->title,
                ],
                'reset_type' => $validated['reset_type'],
                'updated' => [
                    'test_results' => $updated,
                    'top_score_results' => 0,
                    'certificates' => 0,
                    'answers' => 0,
                    'materials' => 0,
                    'results' => 0,
                ],
            ],
        ]);
    }

    public function export(Request $request): JsonResponse|BinaryFileResponse
    {
        $training = $this->resolveTraining($request);

        if (! $training) {
            return response()->json([
                'success' => false,
                'message' => 'Training tidak ditemukan.',
            ], 404);
        }

        $statistics = $this->trainingStatistics($training);
        $participantRows = $statistics['participant_rows'];
        $participantCount = count($participantRows);

        if ($participantCount === 0) {
            return response()->json([
                'success' => false,
                'message' => 'Tidak ada data statistik yang tersedia untuk diexport.',
            ], 422);
        }

        $summaryRows = [
            ['Nama Pelatihan', $training->title],
            ['Jumlah Peserta', $participantCount],
            ['Rata-rata Nilai Pre-Test', $statistics['average_pretest_score']],
            ['Rata-rata Nilai Post-Test', $statistics['average_posttest_score']],
            ['Jumlah Lulus', $statistics['passed_count']],
            ['Jumlah Tidak Lulus', $statistics['failed_count']],
            ['Nilai Post-Test Tertinggi', $statistics['highest_score']],
            ['Nilai Post-Test Terendah', $statistics['lowest_score']],
            [
                'Persentase Kelulusan',
                $statistics['posttest_participant_count'] > 0 ? $statistics['pass_percentage'].'%' : '0%',
            ],
        ];

        foreach ($statistics['top_scores'] as $index => $topScore) {
            $summaryRows[] = [
                'Top Leaderboard '.($index + 1).' Post-Test',
                $topScore['employee_name'].' - '.$topScore['score'].' - '.$topScore['duration_label'],
            ];
        }

        $detailRows = collect($participantRows)->map(fn ($row, $index) => [
            $index + 1,
            $row['employee_number'],
            $row['employee_name'],
            $row['department'],
            $row['position'],
            $row['pretest_score'],
            $row['posttest_score'],
            $row['passing_score'],
            $row['pretest_correct_answers'],
            $row['pretest_wrong_answers'],
            $row['posttest_correct_answers'],
            $row['posttest_wrong_answers'],
            $row['status'],
            $row['pretest_started_at'],
            $row['pretest_finished_at'],
            $row['posttest_started_at'],
            $row['posttest_finished_at'],
            $row['posttest_duration_label'],
            $row['email'],
        ])->all();

        $filename = sprintf('statistik_%s.xlsx', $this->fileNamePart($training->title));
        $path = $this->createStatisticsWorkbook($summaryRows, $detailRows, $filename);

        return response()->download($path, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Cache-Control' => 'no-store, no-cache',
            'X-Filename' => $filename,
        ])->deleteFileAfterSend(true);
    }

    public function attendanceExport(Request $request): JsonResponse|BinaryFileResponse
    {
        $training = $this->resolveTraining($request);

        if (! $training) {
            return response()->json([
                'success' => false,
                'message' => 'Training tidak ditemukan.',
            ], 404);
        }

        $statistics = $this->trainingStatistics($training);
        $attendance = $statistics['attendance_recap'];
        $rows = $attendance['rows'];

        if (count($rows) === 0) {
            return response()->json([
                'success' => false,
                'message' => 'Belum ada peserta yang menyelesaikan seluruh alur pelatihan.',
            ], 422);
        }

        $summaryRows = [
            ['Nama Pelatihan', $training->title],
            ['Jumlah Peserta Hadir', $attendance['participant_count']],
            ['Jumlah Materi', $attendance['material_count']],
            ['Kriteria', 'Pre-Test selesai, seluruh materi selesai, dan Post-Test selesai'],
        ];

        $detailRows = collect($rows)->map(fn ($row, $index) => [
            $index + 1,
            $row['employee_number'],
            $row['employee_name'],
            $row['department'],
            $row['position'],
            $row['login_status'],
            $row['pretest_finished_at'],
            $row['materials_completed_at'],
            $row['posttest_finished_at'],
            $row['posttest_score'],
            $row['posttest_status'],
            $row['attendance_status'],
            $row['email'],
        ])->all();

        $filename = sprintf('rekap_absensi_%s.xlsx', $this->fileNamePart($training->title));
        $path = $this->createAttendanceWorkbook($summaryRows, $detailRows, $filename);

        return response()->download($path, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Cache-Control' => 'no-store, no-cache',
            'X-Filename' => $filename,
        ])->deleteFileAfterSend(true);
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

    private function trainingStatistics(Training $training): array
    {
        $testIds = $training->tests()->pluck('id');
        $pretestResults = $this->latestResultsByType($training, 'pretest');
        $posttestResults = $this->latestResultsByType($training, 'posttest');
        $topScoreResults = $posttestResults;
        $participantRows = $this->participantScoreRows($training, $pretestResults, $posttestResults);
        $attendanceRows = $this->attendanceRows($training, $pretestResults, $posttestResults);
        $materialCount = $training->materials()->count();
        $posttestCount = $posttestResults->count();
        $passedCount = $posttestResults->where('status', 'Lulus')->count();
        $failedCount = $posttestResults->where('status', 'Tidak Lulus')->count();

        return [
            'average_score' => $this->formatNumber($posttestResults->avg('score')),
            'average_pretest_score' => $this->formatNumber($pretestResults->avg('score')),
            'average_posttest_score' => $this->formatNumber($posttestResults->avg('score')),
            'averages' => [
                'pretest' => $this->formatNumber($pretestResults->avg('score')),
                'posttest' => $this->formatNumber($posttestResults->avg('score')),
            ],
            'participant_count' => count($participantRows),
            'pretest_participant_count' => $pretestResults->count(),
            'posttest_participant_count' => $posttestCount,
            'passed_count' => $passedCount,
            'failed_count' => $failedCount,
            'highest_score' => $posttestResults->max('score') ?? 0,
            'lowest_score' => $posttestResults->min('score') ?? 0,
            'pass_percentage' => $posttestCount > 0
                ? $this->formatNumber(($passedCount / $posttestCount) * 100)
                : 0,
            'top_scores' => $this->topScores($topScoreResults),
            'score_distributions' => $this->scoreDistributions($testIds),
            'attendance_recap' => [
                'participant_count' => count($attendanceRows),
                'material_count' => $materialCount,
                'rows' => $attendanceRows,
            ],
            'participant_rows' => $participantRows,
        ];
    }

    private function latestResultsByType(Training $training, string $type)
    {
        return TestResult::query()
            ->with([
                'user:id,employee_number,name,department,position,email',
                'user.trainingParticipations' => fn ($query) => $query->where('training_id', $training->id),
                'test:id,training_id,type,passing_score',
            ])
            ->whereHas('test', function ($query) use ($training, $type) {
                $query->where('training_id', $training->id)
                    ->where('type', $type);
            })
            ->whereHas('user.role', fn ($query) => $query->where('name', 'Karyawan'))
            ->whereNull('reset_at')
            ->whereNotNull('finished_at')
            ->orderByDesc('finished_at')
            ->orderByDesc('updated_at')
            ->get()
            ->unique('user_id')
            ->values();
    }

    private function participantScoreRows(Training $training, $pretestResults, $posttestResults): array
    {
        $pretestByUser = $pretestResults->keyBy('user_id');
        $posttestByUser = $posttestResults->keyBy('user_id');

        return $pretestByUser
            ->keys()
            ->merge($posttestByUser->keys())
            ->unique()
            ->map(function ($userId) use ($training, $pretestByUser, $posttestByUser) {
                $pretest = $pretestByUser->get($userId);
                $posttest = $posttestByUser->get($userId);
                $user = $posttest?->user ?? $pretest?->user;

                return [
                    'user_id' => $user?->id,
                    'employee_number' => $user?->employee_number,
                    'employee_name' => $user?->name,
                    'department' => $this->participantDepartment($user, $training),
                    'position' => $user?->position,
                    'email' => $user?->email,
                    'pretest_score' => $pretest?->score,
                    'posttest_score' => $posttest?->score,
                    'passing_score' => $posttest?->test?->passing_score,
                    'pretest_correct_answers' => $pretest?->correct_answers,
                    'pretest_wrong_answers' => $pretest?->wrong_answers,
                    'posttest_correct_answers' => $posttest?->correct_answers,
                    'posttest_wrong_answers' => $posttest?->wrong_answers,
                    'status' => $posttest?->status ?? '-',
                    'pretest_started_at' => $this->dateTime($pretest?->started_at),
                    'pretest_finished_at' => $this->dateTime($pretest?->finished_at),
                    'posttest_started_at' => $this->dateTime($posttest?->started_at),
                    'posttest_finished_at' => $this->dateTime($posttest?->finished_at),
                    'posttest_duration_seconds' => $this->durationSeconds($posttest),
                    'posttest_duration_label' => $this->formatDuration($this->durationSeconds($posttest)),
                ];
            })
            ->sortBy(fn ($row) => strtolower((string) $row['employee_name']).'|'.(string) $row['employee_number'])
            ->values()
            ->all();
    }

    private function attendanceRows(Training $training, $pretestResults, $posttestResults): array
    {
        $materialIds = $training->materials()->pluck('id');

        if ($materialIds->isEmpty()) {
            return [];
        }

        $pretestByUser = $pretestResults->keyBy('user_id');
        $posttestByUser = $posttestResults->keyBy('user_id');
        $candidateUserIds = $pretestByUser
            ->keys()
            ->intersect($posttestByUser->keys())
            ->values();

        if ($candidateUserIds->isEmpty()) {
            return [];
        }

        $completedMaterialsByUser = UserMaterial::query()
            ->whereIn('user_id', $candidateUserIds)
            ->whereIn('material_id', $materialIds)
            ->where('is_completed', true)
            ->whereNotNull('completed_at')
            ->get(['user_id', 'material_id', 'completed_at'])
            ->groupBy('user_id');

        return $candidateUserIds
            ->map(function ($userId) use ($training, $pretestByUser, $posttestByUser, $completedMaterialsByUser, $materialIds) {
                $completedMaterials = $completedMaterialsByUser->get($userId, collect());

                if ($completedMaterials->pluck('material_id')->unique()->count() < $materialIds->count()) {
                    return null;
                }

                $pretest = $pretestByUser->get($userId);
                $posttest = $posttestByUser->get($userId);
                $user = $posttest?->user ?? $pretest?->user;
                $materialsCompletedAt = $completedMaterials->max('completed_at');

                return [
                    'user_id' => $user?->id,
                    'employee_number' => $user?->employee_number,
                    'employee_name' => $user?->name,
                    'department' => $this->participantDepartment($user, $training),
                    'position' => $user?->position,
                    'email' => $user?->email,
                    'login_status' => 'Sudah login',
                    'pretest_finished_at' => $this->dateTime($pretest?->finished_at),
                    'materials_completed_at' => $this->dateTime($materialsCompletedAt),
                    'posttest_finished_at' => $this->dateTime($posttest?->finished_at),
                    'posttest_score' => $posttest?->score,
                    'posttest_status' => $posttest?->status ?? '-',
                    'attendance_status' => 'Hadir',
                ];
            })
            ->filter()
            ->sortBy(fn ($row) => strtolower((string) $row['employee_name']).'|'.(string) $row['employee_number'])
            ->values()
            ->all();
    }

    private function participantDepartment($user, Training $training): ?string
    {
        return $user?->trainingParticipations
            ?->firstWhere('training_id', $training->id)?->department
            ?? $user?->department;
    }

    private function topScores($posttestResults): array
    {
        return $posttestResults
            ->sort(function (TestResult $a, TestResult $b) {
                $scoreCompare = $b->score <=> $a->score;

                if ($scoreCompare !== 0) {
                    return $scoreCompare;
                }

                $durationCompare = ($this->durationSeconds($a) ?? PHP_INT_MAX) <=> ($this->durationSeconds($b) ?? PHP_INT_MAX);

                if ($durationCompare !== 0) {
                    return $durationCompare;
                }

                $nameCompare = strcmp(strtolower((string) $a->user?->name), strtolower((string) $b->user?->name));

                if ($nameCompare !== 0) {
                    return $nameCompare;
                }

                $numberCompare = strcmp((string) $a->user?->employee_number, (string) $b->user?->employee_number);

                return $numberCompare !== 0 ? $numberCompare : ($a->id <=> $b->id);
            })
            ->take(20)
            ->values()
            ->map(fn (TestResult $result, int $index) => [
                'rank' => $index + 1,
                'employee_id' => $result->user?->id,
                'employee_number' => $result->user?->employee_number,
                'employee_name' => $result->user?->name,
                'score' => $result->score,
                'duration_seconds' => $this->durationSeconds($result),
                'duration_label' => $this->formatDuration($this->durationSeconds($result)),
                'status' => $result->status,
            ])
            ->all();
    }

    private function durationSeconds(?TestResult $result): ?int
    {
        if (! $result?->started_at || ! $result->finished_at) {
            return null;
        }

        $seconds = $result->finished_at->getTimestamp() - $result->started_at->getTimestamp();

        return $seconds > 0 ? $seconds : null;
    }

    private function isResetProtectedTraining(Training $training): bool
    {
        $title = trim(strtolower($training->title));

        foreach (self::RESET_PROTECTED_TRAINING_TITLES as $protectedTitle) {
            if ($title === trim(strtolower($protectedTitle))) {
                return true;
            }
        }

        return false;
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

    private function dateTime($dateTime): ?string
    {
        return $dateTime?->copy()->timezone('Asia/Jakarta')->format('Y-m-d H:i:s');
    }

    private function emptyStatistics(): array
    {
        return [
            'title' => 'Statistik',
            'training' => null,
            'average_score' => 0,
            'average_pretest_score' => 0,
            'average_posttest_score' => 0,
            'averages' => [
                'pretest' => 0,
                'posttest' => 0,
            ],
            'participant_count' => 0,
            'pretest_participant_count' => 0,
            'posttest_participant_count' => 0,
            'passed_count' => 0,
            'failed_count' => 0,
            'highest_score' => 0,
            'lowest_score' => 0,
            'pass_percentage' => 0,
            'top_scores' => [],
            'score_distributions' => $this->emptyScoreDistributions(),
            'attendance_recap' => [
                'participant_count' => 0,
                'material_count' => 0,
                'rows' => [],
            ],
        ];
    }

    private function scoreDistributions($testIds): array
    {
        $results = TestResult::query()
            ->with('test:id,type')
            ->whereIn('test_id', $testIds)
            ->whereHas('user.role', fn ($query) => $query->where('name', 'Karyawan'))
            ->whereNull('reset_at')
            ->whereNotNull('finished_at')
            ->orderByDesc('updated_at')
            ->get()
            ->groupBy(fn ($result) => $result->test?->type);

        return collect(['pretest' => 'Pre Test', 'posttest' => 'Post Test'])
            ->mapWithKeys(function ($label, $type) use ($results) {
                $typeResults = ($results->get($type) ?? collect())
                    ->unique('user_id')
                    ->values();

                return [
                    $type => [
                        'label' => $label,
                        'participant_count' => $typeResults->count(),
                        'ranges' => $this->scoreRangeRows($typeResults),
                    ],
                ];
            })
            ->all();
    }

    private function emptyScoreDistributions(): array
    {
        return collect(['pretest' => 'Pre Test', 'posttest' => 'Post Test'])
            ->mapWithKeys(fn ($label, $type) => [
                $type => [
                    'label' => $label,
                    'participant_count' => 0,
                    'ranges' => $this->scoreRangeRows(collect()),
                ],
            ])
            ->all();
    }

    private function scoreRangeRows($results): array
    {
        $ranges = [
            ['label' => '1-20', 'min' => 0, 'max' => 20],
            ['label' => '21-30', 'min' => 21, 'max' => 30],
            ['label' => '31-40', 'min' => 31, 'max' => 40],
            ['label' => '41-50', 'min' => 41, 'max' => 50],
            ['label' => '51-60', 'min' => 51, 'max' => 60],
            ['label' => '61-70', 'min' => 61, 'max' => 70],
            ['label' => '71-80', 'min' => 71, 'max' => 80],
            ['label' => '81-90', 'min' => 81, 'max' => 90],
            ['label' => '91-100', 'min' => 91, 'max' => 100],
        ];
        $total = $results->count();

        return collect($ranges)
            ->map(function ($range) use ($results, $total) {
                $count = $results
                    ->filter(fn ($result) => $result->score >= $range['min'] && $result->score <= $range['max'])
                    ->count();

                return [
                    'label' => $range['label'],
                    'count' => $count,
                    'percentage' => $total > 0 ? $this->formatNumber(($count / $total) * 100) : 0,
                ];
            })
            ->all();
    }

    private function formatNumber(null|int|float|string $value): int|float
    {
        $number = round((float) ($value ?? 0), 1);

        return fmod($number, 1.0) === 0.0 ? (int) $number : $number;
    }

    private function fileNamePart(string $value): string
    {
        $name = strtolower(preg_replace('/[^A-Za-z0-9]+/', '_', $value) ?? '');
        $name = trim($name, '_');

        return $name !== '' ? $name : 'training';
    }

    private function createStatisticsWorkbook(array $summaryRows, array $detailRows, string $filename): string
    {
        $directory = storage_path('app/exports');

        if (! is_dir($directory)) {
            mkdir($directory, 0755, true);
        }

        $path = $directory.DIRECTORY_SEPARATOR.$filename;
        $zip = new ZipArchive;

        if ($zip->open($path, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            abort(500, 'File export gagal dibuat.');
        }

        $zip->addFromString('[Content_Types].xml', $this->xlsxContentTypes());
        $zip->addFromString('_rels/.rels', $this->xlsxRootRelations());
        $zip->addFromString('xl/workbook.xml', $this->xlsxWorkbook());
        $zip->addFromString('xl/_rels/workbook.xml.rels', $this->xlsxWorkbookRelations());
        $zip->addFromString('xl/styles.xml', $this->xlsxStyles());
        $zip->addFromString('xl/worksheets/sheet1.xml', $this->xlsxSummarySheet($summaryRows));
        $zip->addFromString('xl/worksheets/sheet2.xml', $this->xlsxDetailSheet($detailRows));
        $zip->close();

        return $path;
    }

    private function createAttendanceWorkbook(array $summaryRows, array $detailRows, string $filename): string
    {
        $directory = storage_path('app/exports');

        if (! is_dir($directory)) {
            mkdir($directory, 0755, true);
        }

        $path = $directory.DIRECTORY_SEPARATOR.$filename;
        $zip = new ZipArchive;

        if ($zip->open($path, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            abort(500, 'File export gagal dibuat.');
        }

        $zip->addFromString('[Content_Types].xml', $this->xlsxContentTypes());
        $zip->addFromString('_rels/.rels', $this->xlsxRootRelations());
        $zip->addFromString('xl/workbook.xml', $this->xlsxAttendanceWorkbook());
        $zip->addFromString('xl/_rels/workbook.xml.rels', $this->xlsxWorkbookRelations());
        $zip->addFromString('xl/styles.xml', $this->xlsxStyles());
        $zip->addFromString('xl/worksheets/sheet1.xml', $this->xlsxAttendanceSummarySheet($summaryRows));
        $zip->addFromString('xl/worksheets/sheet2.xml', $this->xlsxAttendanceDetailSheet($detailRows));
        $zip->close();

        return $path;
    }

    private function xlsxSummarySheet(array $summaryRows): string
    {
        $rows = [
            ['cells' => [['Ringkasan Statistik', 1]]],
            ['cells' => []],
        ];

        foreach ($summaryRows as $row) {
            $rows[] = ['cells' => [[$row[0], 2], [$row[1], 3]]];
        }

        return $this->xlsxSheet($rows, ['A' => 30, 'B' => 28]);
    }

    private function xlsxDetailSheet(array $detailRows): string
    {
        $headers = [
            'No',
            'Username',
            'Nama Peserta',
            'Departemen',
            'Jabatan',
            'Nilai Pre-Test',
            'Nilai Post-Test',
            'Nilai Minimal Lulus',
            'Jawaban Benar Pre-Test',
            'Jawaban Salah Pre-Test',
            'Jawaban Benar Post-Test',
            'Jawaban Salah Post-Test',
            'Status',
            'Mulai Pre-Test',
            'Selesai Pre-Test',
            'Mulai Post-Test',
            'Selesai Post-Test',
            'Durasi Post-Test',
            'Email',
        ];

        $rows = [
            ['cells' => [['Detail Peserta', 1]]],
            ['cells' => []],
            ['cells' => array_map(fn ($header) => [$header, 4], $headers)],
        ];

        foreach ($detailRows as $detailRow) {
            $rows[] = ['cells' => array_map(fn ($value) => [$value, 5], $detailRow)];
        }

        return $this->xlsxSheet($rows, [
            'A' => 8,
            'B' => 18,
            'C' => 28,
            'D' => 20,
            'E' => 18,
            'F' => 16,
            'G' => 12,
            'H' => 20,
            'I' => 18,
            'J' => 18,
            'K' => 22,
            'L' => 22,
            'M' => 16,
            'N' => 22,
            'O' => 22,
            'P' => 22,
            'Q' => 22,
            'R' => 18,
            'S' => 30,
        ]);
    }

    private function xlsxAttendanceSummarySheet(array $summaryRows): string
    {
        $rows = [
            ['cells' => [['Ringkasan Rekap Absensi', 1]]],
            ['cells' => []],
        ];

        foreach ($summaryRows as $row) {
            $rows[] = ['cells' => [[$row[0], 2], [$row[1], 3]]];
        }

        return $this->xlsxSheet($rows, ['A' => 28, 'B' => 58]);
    }

    private function xlsxAttendanceDetailSheet(array $detailRows): string
    {
        $headers = [
            'No',
            'Username',
            'Nama Peserta',
            'Departemen',
            'Jabatan',
            'Status Login',
            'Selesai Pre-Test',
            'Selesai Materi',
            'Selesai Post-Test',
            'Nilai Post-Test',
            'Status Post-Test',
            'Status Absensi',
            'Email',
        ];

        $rows = [
            ['cells' => [['Rekap Absensi', 1]]],
            ['cells' => []],
            ['cells' => array_map(fn ($header) => [$header, 4], $headers)],
        ];

        foreach ($detailRows as $detailRow) {
            $rows[] = ['cells' => array_map(fn ($value) => [$value, 5], $detailRow)];
        }

        return $this->xlsxSheet($rows, [
            'A' => 8,
            'B' => 18,
            'C' => 28,
            'D' => 20,
            'E' => 18,
            'F' => 16,
            'G' => 22,
            'H' => 22,
            'I' => 22,
            'J' => 16,
            'K' => 18,
            'L' => 16,
            'M' => 30,
        ]);
    }

    private function xlsxSheet(array $rows, array $columnWidths): string
    {
        $rowXml = '';
        $maxColumn = 1;

        foreach ($rows as $rowIndex => $row) {
            $cellXml = '';

            foreach ($row['cells'] as $columnIndex => [$value, $style]) {
                $maxColumn = max($maxColumn, $columnIndex + 1);
                $cellXml .= $this->xlsxCell($columnIndex + 1, $rowIndex + 1, $value, $style);
            }

            $height = $rowIndex === 0 ? ' ht="24" customHeight="1"' : '';
            $rowXml .= '<row r="'.($rowIndex + 1).'"'.$height.'>'.$cellXml.'</row>';
        }

        $cols = '';

        foreach ($columnWidths as $column => $width) {
            $index = $this->columnNumber($column);
            $cols .= '<col min="'.$index.'" max="'.$index.'" width="'.$width.'" customWidth="1"/>';
        }

        $dimension = 'A1:'.$this->columnName($maxColumn).max(1, count($rows));

        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            .'<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
            .'<dimension ref="'.$dimension.'"/>'
            .'<sheetViews><sheetView workbookViewId="0"/></sheetViews>'
            .'<sheetFormatPr defaultRowHeight="18"/>'
            .'<cols>'.$cols.'</cols>'
            .'<sheetData>'.$rowXml.'</sheetData>'
            .'</worksheet>';
    }

    private function xlsxCell(int $column, int $row, mixed $value, int $style): string
    {
        $reference = $this->columnName($column).$row;

        if (is_int($value) || is_float($value)) {
            return '<c r="'.$reference.'" s="'.$style.'"><v>'.$value.'</v></c>';
        }

        return '<c r="'.$reference.'" s="'.$style.'" t="inlineStr"><is><t>'
            .$this->xmlEscape((string) ($value ?? ''))
            .'</t></is></c>';
    }

    private function xlsxStyles(): string
    {
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            .'<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
            .'<fonts count="3">'
            .'<font><sz val="11"/><color rgb="FF111827"/><name val="Calibri"/></font>'
            .'<font><b/><sz val="14"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>'
            .'<font><b/><sz val="11"/><color rgb="FF111827"/><name val="Calibri"/></font>'
            .'</fonts>'
            .'<fills count="4">'
            .'<fill><patternFill patternType="none"/></fill>'
            .'<fill><patternFill patternType="gray125"/></fill>'
            .'<fill><patternFill patternType="solid"><fgColor rgb="FF2F7D32"/><bgColor indexed="64"/></patternFill></fill>'
            .'<fill><patternFill patternType="solid"><fgColor rgb="FFE8F5E9"/><bgColor indexed="64"/></patternFill></fill>'
            .'</fills>'
            .'<borders count="2">'
            .'<border><left/><right/><top/><bottom/><diagonal/></border>'
            .'<border><left style="thin"><color rgb="FFD9E2D9"/></left><right style="thin"><color rgb="FFD9E2D9"/></right><top style="thin"><color rgb="FFD9E2D9"/></top><bottom style="thin"><color rgb="FFD9E2D9"/></bottom><diagonal/></border>'
            .'</borders>'
            .'<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
            .'<cellXfs count="6">'
            .'<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'
            .'<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center"/></xf>'
            .'<xf numFmtId="0" fontId="2" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>'
            .'<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"/>'
            .'<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center"/></xf>'
            .'<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"/>'
            .'</cellXfs>'
            .'<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>'
            .'</styleSheet>';
    }

    private function xlsxContentTypes(): string
    {
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            .'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
            .'<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
            .'<Default Extension="xml" ContentType="application/xml"/>'
            .'<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
            .'<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
            .'<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
            .'<Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
            .'</Types>';
    }

    private function xlsxRootRelations(): string
    {
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            .'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            .'<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
            .'</Relationships>';
    }

    private function xlsxWorkbook(): string
    {
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            .'<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
            .'<sheets>'
            .'<sheet name="Ringkasan" sheetId="1" r:id="rId1"/>'
            .'<sheet name="Detail Peserta" sheetId="2" r:id="rId2"/>'
            .'</sheets>'
            .'</workbook>';
    }

    private function xlsxAttendanceWorkbook(): string
    {
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            .'<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
            .'<sheets>'
            .'<sheet name="Ringkasan Absensi" sheetId="1" r:id="rId1"/>'
            .'<sheet name="Rekap Absensi" sheetId="2" r:id="rId2"/>'
            .'</sheets>'
            .'</workbook>';
    }

    private function xlsxWorkbookRelations(): string
    {
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            .'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            .'<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>'
            .'<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>'
            .'<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
            .'</Relationships>';
    }

    private function columnName(int $number): string
    {
        $name = '';

        while ($number > 0) {
            $number--;
            $name = chr(65 + ($number % 26)).$name;
            $number = intdiv($number, 26);
        }

        return $name;
    }

    private function columnNumber(string $name): int
    {
        $number = 0;

        foreach (str_split($name) as $char) {
            $number = ($number * 26) + ord($char) - 64;
        }

        return $number;
    }

    private function xmlEscape(string $value): string
    {
        return htmlspecialchars($value, ENT_QUOTES | ENT_XML1, 'UTF-8');
    }
}
