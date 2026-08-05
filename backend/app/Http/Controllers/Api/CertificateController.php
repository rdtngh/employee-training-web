<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Certificate;
use App\Models\TestResult;
use App\Models\Training;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Str;

class CertificateController extends Controller
{
    public function index(): JsonResponse
    {
        $this->ensureCertificatesForPassedPostTests();

        $certificates = Certificate::query()
            ->with([
                'user:id,employee_number,name,department,position,email',
                'testResult:id,user_id,test_id,score,status,finished_at',
                'testResult.test:id,training_id,type',
                'testResult.test.training:id,title,certificate_template_path,certificate_template_settings',
            ])
            ->whereHas('testResult.test', function ($query) {
                $query->where('type', 'posttest');
            })
            ->whereHas('user.role', function ($query) {
                $query->where('name', 'Karyawan');
            })
            ->latest('issued_at')
            ->get()
            ->map(fn (Certificate $certificate) => $this->certificatePayload($certificate))
            ->values();

        return response()->json([
            'success' => true,
            'data' => [
                'title' => 'Sertifikat',
                'message' => $certificates->isEmpty()
                    ? 'Belum ada peserta yang lulus pelatihan.'
                    : 'Daftar peserta yang telah lulus pelatihan.',
                'certificates' => $certificates,
            ],
        ]);
    }

    public function show(Request $request, Training $training): JsonResponse
    {
        $result = $this->passedPostTestResult($request, $training);

        if (! $result) {
            return response()->json([
                'success' => false,
                'message' => 'Anda belum memenuhi syarat untuk mendapatkan sertifikat.',
            ], 403);
        }

        $certificate = $this->firstOrCreateCertificate($request->user()->id, $result);

        return response()->json([
            'success' => true,
            'data' => [
                'employee_name' => $request->user()->name,
                'training_title' => $training->title,
                'certificate_number' => $this->certificateDisplayNumber($certificate, $result->finished_at),
                'sequence_number' => $this->certificateSequence($certificate),
                'roman_month' => $this->romanMonth($result->finished_at),
                'year' => optional($result->finished_at)->format('Y'),
                'completion_date' => optional($result->finished_at)->toDateString(),
                'issued_at' => optional($certificate->issued_at)->toDateString(),
                'certificate_template' => $this->certificateTemplatePayload($training),
                'eligible' => true,
            ],
        ]);
    }

    public function download(Request $request, Training $training): Response
    {
        abort_if(! $training->is_active, 403, 'Pelatihan belum tersedia.');

        $result = $this->passedPostTestResult($request, $training);

        if (! $result) {
            return response([
                'success' => false,
                'message' => 'Sertifikat belum tersedia karena Post-Test belum lulus.',
            ], 404);
        }

        $certificate = $this->firstOrCreateCertificate($request->user()->id, $result);

        return $this->certificatePdfResponse($certificate, $result, $training);
    }

    public function downloadFile(Certificate $certificate): Response
    {
        $certificate->load([
            'user.role',
            'testResult.user',
            'testResult.test.training:id,title,certificate_template_path,certificate_template_settings',
        ]);

        abort_unless(
            $certificate->testResult?->test?->type === 'posttest'
                && $certificate->testResult?->status === 'Lulus'
                && $certificate->testResult?->user_id === $certificate->user_id
                && $certificate->user?->role?->name === 'Karyawan',
            404,
            'Sertifikat tidak ditemukan.'
        );

        $training = $certificate->testResult->test->training;

        return $this->certificatePdfResponse($certificate, $certificate->testResult, $training);
    }

    private function certificatePdfResponse(Certificate $certificate, TestResult $result, Training $training): Response
    {
        $pdf = $this->buildPdf($certificate, $result, $training);
        $filename = sprintf('sertifikat-%s.pdf', Str::slug($training->title) ?: $training->id);

        return response($pdf, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="'.$filename.'"',
            'Content-Length' => strlen($pdf),
        ]);
    }

    private function passedPostTestResult(Request $request, Training $training): ?TestResult
    {
        return TestResult::query()
            ->with(['test.training', 'user'])
            ->where('user_id', $request->user()->id)
            ->where('status', 'Lulus')
            ->whereHas('test', function ($query) use ($training) {
                $query->where('training_id', $training->id)
                    ->where('type', 'posttest');
            })
            ->latest('finished_at')
            ->first();
    }

    private function firstOrCreateCertificate(int $userId, TestResult $result): Certificate
    {
        return Certificate::firstOrCreate(
            [
                'user_id' => $userId,
                'test_result_id' => $result->id,
            ],
            [
                'certificate_number' => $this->certificateNumber(),
                'file_path' => '',
                'issued_at' => $result->finished_at ?? now(),
            ]
        );
    }

    private function ensureCertificatesForPassedPostTests(): void
    {
        TestResult::query()
            ->where('status', 'Lulus')
            ->whereHas('test', function ($query) {
                $query->where('type', 'posttest');
            })
            ->whereHas('user.role', function ($query) {
                $query->where('name', 'Karyawan');
            })
            ->whereDoesntHave('certificate')
            ->each(function (TestResult $result) {
                Certificate::create([
                    'user_id' => $result->user_id,
                    'test_result_id' => $result->id,
                    'certificate_number' => $this->certificateNumber(),
                    'file_path' => '',
                    'issued_at' => $result->finished_at ?? now(),
                ]);
            });
    }

    private function certificatePayload(Certificate $certificate): array
    {
        $result = $certificate->testResult;
        $test = $result?->test;
        $training = $test?->training;
        $user = $certificate->user;
        $completionDate = $result?->finished_at ?? $certificate->issued_at;

        return [
            'id' => $certificate->id,
            'certificate_number' => $this->certificateDisplayNumber($certificate, $completionDate),
            'sequence_number' => $this->certificateSequence($certificate),
            'roman_month' => $this->romanMonth($completionDate),
            'year' => optional($completionDate)->format('Y'),
            'completion_date' => optional($completionDate)->toDateString(),
            'issued_at' => optional($certificate->issued_at)->toDateString(),
            'employee' => [
                'id' => $user?->id,
                'employee_number' => $user?->employee_number,
                'name' => $user?->name,
                'department' => $user?->department,
                'position' => $user?->position,
                'email' => $user?->email,
            ],
            'training' => [
                'id' => $training?->id,
                'title' => $training?->title,
                'certificate_template' => $this->certificateTemplatePayload($training),
            ],
            'result' => [
                'id' => $result?->id,
                'score' => $result?->score,
                'status' => $result?->status,
                'finished_at' => optional($result?->finished_at)->toDateString(),
            ],
        ];
    }

    private function certificateDisplayNumber(Certificate $certificate, $date): string
    {
        $rawNumber = trim((string) $certificate->certificate_number);

        if (Str::startsWith(Str::upper($rawNumber), 'NO:')) {
            return $rawNumber;
        }

        if (Str::contains($rawNumber, '/DIKLATLIT-RSABL/')) {
            return 'NO: '.$rawNumber;
        }

        $sequence = ctype_digit($rawNumber) ? $rawNumber : (string) $this->certificateSequence($certificate);
        $romanMonth = $this->romanMonth($date);
        $year = optional($date)->format('Y');

        if ($sequence !== '' && $romanMonth !== '' && $year) {
            return "NO: {$sequence}/DIKLATLIT-RSABL/{$romanMonth}/{$year}";
        }

        return $rawNumber ? 'NO: '.$rawNumber : '';
    }

    private function certificateTemplatePayload(?Training $training): ?array
    {
        if (! $training?->certificate_template_path) {
            return null;
        }

        return [
            'background_url' => url("/api/trainings/{$training->id}/certificate-template/background"),
            'settings' => $training->certificate_template_settings
                ?: $this->defaultCertificateTemplateSettings(),
        ];
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

    private function certificateSequence(Certificate $certificate): int
    {
        if (! $certificate->id) {
            return 0;
        }

        return Certificate::query()
            ->whereHas('testResult.test', function ($query) {
                $query->where('type', 'posttest');
            })
            ->whereHas('user.role', function ($query) {
                $query->where('name', 'Karyawan');
            })
            ->where('id', '<=', $certificate->id)
            ->count();
    }

    private function romanMonth($date): string
    {
        $month = (int) optional($date)->format('n');
        $months = [
            1 => 'I',
            2 => 'II',
            3 => 'III',
            4 => 'IV',
            5 => 'V',
            6 => 'VI',
            7 => 'VII',
            8 => 'VIII',
            9 => 'IX',
            10 => 'X',
            11 => 'XI',
            12 => 'XII',
        ];

        return $months[$month] ?? '';
    }

    private function indonesianDate($date): string
    {
        if (! $date) {
            return '';
        }

        $months = [
            1 => 'Januari',
            2 => 'Februari',
            3 => 'Maret',
            4 => 'April',
            5 => 'Mei',
            6 => 'Juni',
            7 => 'Juli',
            8 => 'Agustus',
            9 => 'September',
            10 => 'Oktober',
            11 => 'November',
            12 => 'Desember',
        ];
        $month = (int) $date->format('n');

        return $date->format('j').' '.($months[$month] ?? '').' '.$date->format('Y');
    }

    private function certificateNumber(): string
    {
        do {
            $number = 'CERT-'.now()->format('Ymd').'-'.strtoupper(Str::random(8));
        } while (Certificate::where('certificate_number', $number)->exists());

        return $number;
    }

    private function buildPdf(Certificate $certificate, TestResult $result, Training $training): string
    {
        $completionDate = $result->finished_at ?? $certificate->issued_at ?? now();

        return Pdf::loadView('certificates.template', [
            'participantName' => Str::title($result->user->name),
            'trainingTitle' => $training->title,
            'certificateNumber' => $this->certificateDisplayNumber($certificate, $completionDate),
            'completionDate' => $this->indonesianDate($completionDate),
            'trainingPeriod' => $this->trainingPeriod($training, $completionDate),
            'assets' => $this->certificateAssetDataUris(),
        ])
            ->setPaper('a4', 'landscape')
            ->output();
    }

    private function certificateAssetDataUris(): array
    {
        $assets = collect([
            'bgDaun' => 'bg-daun.svg',
            'daunKananAtas' => 'daun-kanan-atas.svg',
            'frameGold' => 'frame-gold.svg',
            'garisGold' => 'garis-gold.svg',
            'piagam' => 'piagam-advent-pdf.jpg',
            'sudutAtas' => 'sudut-atas.svg',
            'sudutBawah' => 'sudut-bawah.svg',
        ])->mapWithKeys(function (string $file, string $key) {
            $path = base_path("../frontend/src/assets/icons/{$file}");

            return [$key => $this->assetDataUri($path)];
        })->all();

        $assets['logoRsabl'] = $this->assetDataUri(base_path('../frontend/src/assets/logo/logo-rsabl-pdf.jpg'));
        $assets['ttdDirektur'] = $this->assetDataUri(base_path('../frontend/src/assets/images/ttd-direktur.png'));

        return $assets;
    }

    private function assetDataUri(string $path): string
    {
        if (! file_exists($path)) {
            return '';
        }

        $contents = file_get_contents($path);
        $extension = strtolower(pathinfo($path, PATHINFO_EXTENSION));
        $mime = match (true) {
            str_starts_with($contents, "\xFF\xD8\xFF") => 'image/jpeg',
            $extension === 'svg' => 'image/svg+xml',
            in_array($extension, ['jpg', 'jpeg'], true) => 'image/jpeg',
            default => 'image/png',
        };

        return 'data:'.$mime.';base64,'.base64_encode($contents);
    }

    private function loadCertificateTemplate(): array
    {
        $path = storage_path('app/certificate-templates/default.png');

        if (! file_exists($path)) {
            return [];
        }

        return $this->pngImageObject($path);
    }

    private function trainingPeriod(Training $training, $fallbackDate): string
    {
        if ($training->start_date && $training->end_date) {
            if ($training->start_date->equalTo($training->end_date)) {
                return $training->start_date->format('d F Y');
            }

            return $training->start_date->format('d F Y').' - '.$training->end_date->format('d F Y');
        }

        return $fallbackDate->format('d F Y');
    }

    private function trainingNameSuffix(string $title): string
    {
        return trim(preg_replace('/^pelatihan\s+/i', '', $title)) ?: $title;
    }

    private function centeredText(string $text, int $left, int $right, int $y, string $font, int $size): string
    {
        $maxWidth = $right - $left;
        $text = $this->fitText($text, $maxWidth, $size);
        $x = $left + (($maxWidth - $this->textWidth($text, $size)) / 2);

        return sprintf(
            "BT 0.14 0.16 0.20 rg /%s %d Tf %.2F %d Td (%s) Tj ET\n",
            $font,
            $size,
            $x,
            $y,
            $this->pdfText($text)
        );
    }

    private function leftText(string $text, int $x, int $y, string $font, int $size, int $maxWidth): string
    {
        $text = $this->fitText($text, $maxWidth, $size);

        return sprintf(
            "BT 0.14 0.16 0.20 rg /%s %d Tf %d %d Td (%s) Tj ET\n",
            $font,
            $size,
            $x,
            $y,
            $this->pdfText($text)
        );
    }

    private function fitText(string $text, int $maxWidth, int $size): string
    {
        while ($this->textWidth($text, $size) > $maxWidth && strlen($text) > 8) {
            $text = rtrim(substr($text, 0, -1));
        }

        return $this->textWidth($text, $size) > $maxWidth ? $text : $text;
    }

    private function textWidth(string $text, int $size): float
    {
        return strlen($this->pdfText($text)) * $size * 0.5;
    }

    private function pdfText(string $text): string
    {
        $text = iconv('UTF-8', 'ISO-8859-1//TRANSLIT//IGNORE', $text) ?: $text;

        return str_replace(
            ['\\', '(', ')', "\r", "\n"],
            ['\\\\', '\\(', '\\)', ' ', ' '],
            $text
        );
    }

    private function pngImageObject(string $path): array
    {
        $contents = file_get_contents($path);
        $offset = 8;
        $width = 0;
        $height = 0;
        $bitDepth = 8;
        $colorType = 2;
        $data = '';

        while ($offset < strlen($contents)) {
            $length = unpack('N', substr($contents, $offset, 4))[1];
            $type = substr($contents, $offset + 4, 4);
            $chunk = substr($contents, $offset + 8, $length);

            if ($type === 'IHDR') {
                $width = unpack('N', substr($chunk, 0, 4))[1];
                $height = unpack('N', substr($chunk, 4, 4))[1];
                $bitDepth = ord($chunk[8]);
                $colorType = ord($chunk[9]);
            }

            if ($type === 'IDAT') {
                $data .= $chunk;
            }

            if ($type === 'IEND') {
                break;
            }

            $offset += 12 + $length;
        }

        if ($bitDepth !== 8 || ! in_array($colorType, [2, 6], true)) {
            return [];
        }

        $colors = $colorType === 6 ? 4 : 3;

        return [
            'object' => '7 0 obj << /Type /XObject /Subtype /Image /Width '.$width.' /Height '.$height.' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /DecodeParms << /Predictor 15 /Colors '.$colors.' /BitsPerComponent 8 /Columns '.$width.' >> /Length '.strlen($data).' >> stream'."\n".$data."\n".'endstream endobj',
        ];
    }

    private function pdfDocument(string $content, array $template = []): string
    {
        $imageResource = $template
            ? ' /XObject << /I1 7 0 R >>'
            : '';

        $objects = [
            '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
            '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
            '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /Font << /F1 4 0 R /F2 5 0 R /F3 8 0 R /F4 9 0 R >>'.$imageResource.' >> /Contents 6 0 R >> endobj',
            '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Times-Roman >> endobj',
            '5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Times-Bold >> endobj',
            '6 0 obj << /Length '.strlen($content).' >> stream'."\n".$content."\n".'endstream endobj',
        ];

        if ($template) {
            $objects[] = $template['object'];
        } else {
            $objects[] = '7 0 obj << >> endobj';
        }

        $objects[] = '8 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj';
        $objects[] = '9 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> endobj';

        $pdf = "%PDF-1.4\n";
        $offsets = [0];

        foreach ($objects as $object) {
            $offsets[] = strlen($pdf);
            $pdf .= $object."\n";
        }

        $xrefOffset = strlen($pdf);
        $pdf .= "xref\n0 ".(count($objects) + 1)."\n";
        $pdf .= "0000000000 65535 f \n";

        foreach (array_slice($offsets, 1) as $offset) {
            $pdf .= sprintf("%010d 00000 n \n", $offset);
        }

        $pdf .= 'trailer << /Size '.(count($objects) + 1)." /Root 1 0 R >>\n";
        $pdf .= "startxref\n".$xrefOffset."\n%%EOF";

        return $pdf;
    }
}
