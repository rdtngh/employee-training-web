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
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use ZipArchive;

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
                'score_distributions' => $this->scoreDistributions($testIds),
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

    public function export(Request $request): JsonResponse|BinaryFileResponse
    {
        $training = $this->resolveTraining($request);

        if (! $training) {
            return response()->json([
                'success' => false,
                'message' => 'Training tidak ditemukan.',
            ], 404);
        }

        $testIds = $training->tests()->pluck('id');

        $results = TestResult::query()
            ->with(['user:id,employee_number,name,department,position,email', 'test:id,training_id,type,passing_score'])
            ->whereIn('test_id', $testIds)
            ->whereHas('user.role', fn ($query) => $query->where('name', 'Karyawan'))
            ->orderByDesc('updated_at')
            ->get()
            ->unique('user_id')
            ->values();

        $participantCount = $results->count();
        $passedCount = $results->where('status', 'Lulus')->count();
        $failedCount = $results->where('status', 'Tidak Lulus')->count();

        if ($participantCount === 0) {
            return response()->json([
                'success' => false,
                'message' => 'Tidak ada data statistik yang tersedia untuk diexport.',
            ], 422);
        }

        $summaryRows = [
            ['Nama Pelatihan', $training->title],
            ['Jumlah Peserta', $participantCount],
            ['Rata-rata Nilai', $this->formatNumber($results->avg('score'))],
            ['Jumlah Lulus', $passedCount],
            ['Jumlah Tidak Lulus', $failedCount],
            ['Nilai Tertinggi', $results->max('score') ?? 0],
            ['Nilai Terendah', $results->min('score') ?? 0],
            [
                'Persentase Kelulusan',
                $participantCount > 0 ? $this->formatNumber(($passedCount / $participantCount) * 100).'%' : '0%',
            ],
        ];

        $detailRows = $results->map(fn ($result, $index) => [
            $index + 1,
            $result->user?->employee_number,
            $result->user?->name,
            $result->user?->department,
            $result->user?->position,
            strtoupper((string) $result->test?->type),
            $result->score,
            $result->test?->passing_score,
            $result->correct_answers,
            $result->wrong_answers,
            $result->status,
            $result->started_at?->format('Y-m-d H:i:s'),
            $result->finished_at?->format('Y-m-d H:i:s'),
            $result->user?->email,
        ])->all();

        $filename = sprintf(
            'statistik-%s-%s.xlsx',
            $this->slug($training->title),
            now()->format('Ymd-His')
        );
        $path = $this->createStatisticsWorkbook($summaryRows, $detailRows, $filename);

        return response()->download($path, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Cache-Control' => 'no-store, no-cache',
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
            'score_distributions' => $this->emptyScoreDistributions(),
        ];
    }

    private function scoreDistributions($testIds): array
    {
        $results = TestResult::query()
            ->with('test:id,type')
            ->whereIn('test_id', $testIds)
            ->whereHas('user.role', fn ($query) => $query->where('name', 'Karyawan'))
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

    private function slug(string $value): string
    {
        $slug = strtolower(preg_replace('/[^A-Za-z0-9]+/', '-', $value) ?? '');
        $slug = trim($slug, '-');

        return $slug !== '' ? $slug : 'training';
    }

    private function createStatisticsWorkbook(array $summaryRows, array $detailRows, string $filename): string
    {
        $directory = storage_path('app/exports');

        if (! is_dir($directory)) {
            mkdir($directory, 0755, true);
        }

        $path = $directory.DIRECTORY_SEPARATOR.$filename;
        $zip = new ZipArchive();

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
            'No. Karyawan',
            'Nama Peserta',
            'Departemen',
            'Jabatan',
            'Jenis Tes',
            'Nilai',
            'Nilai Minimal Lulus',
            'Jawaban Benar',
            'Jawaban Salah',
            'Status',
            'Mulai Ujian',
            'Selesai Ujian',
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
            'F' => 14,
            'G' => 12,
            'H' => 20,
            'I' => 18,
            'J' => 18,
            'K' => 16,
            'L' => 22,
            'M' => 22,
            'N' => 30,
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
