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
                'testResult.test.training:id,title',
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

    public function download(Request $request, Training $training): Response
    {
        $result = TestResult::query()
            ->with(['test.training', 'user'])
            ->where('user_id', $request->user()->id)
            ->where('status', 'Lulus')
            ->whereHas('test', function ($query) use ($training) {
                $query->where('training_id', $training->id)
                    ->where('type', 'posttest');
            })
            ->latest('finished_at')
            ->first();

        if (! $result) {
            return response([
                'success' => false,
                'message' => 'Sertifikat belum tersedia karena Post-Test belum lulus.',
            ], 404);
        }

        $certificate = Certificate::firstOrCreate(
            [
                'user_id' => $request->user()->id,
                'test_result_id' => $result->id,
            ],
            [
                'certificate_number' => $this->certificateNumber(),
                'file_path' => '',
                'issued_at' => now(),
            ]
        );

        $pdf = $this->buildPdf($certificate, $result, $training);
        $filename = sprintf('sertifikat-%s.pdf', Str::slug($training->title) ?: $training->id);

        return response($pdf, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="'.$filename.'"',
            'Content-Length' => strlen($pdf),
        ]);
    }

    public function downloadFile(Certificate $certificate): Response
    {
        $certificate->load([
            'user.role',
            'testResult.user',
            'testResult.test.training',
        ]);

        abort_unless(
            $certificate->testResult?->test?->type === 'posttest'
                && $certificate->user?->role?->name === 'Karyawan',
            404,
            'Sertifikat tidak ditemukan.'
        );

        $training = $certificate->testResult->test->training;
        $pdf = $this->buildPdf($certificate, $certificate->testResult, $training);
        $filename = sprintf('sertifikat-%s.pdf', Str::slug($certificate->user->name) ?: $certificate->id);

        return response($pdf, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="'.$filename.'"',
            'Content-Length' => strlen($pdf),
        ]);
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

        return [
            'id' => $certificate->id,
            'certificate_number' => $certificate->certificate_number,
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
            ],
            'result' => [
                'id' => $result?->id,
                'score' => $result?->score,
                'status' => $result?->status,
                'finished_at' => optional($result?->finished_at)->toDateString(),
            ],
        ];
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
        $issuedAt = $certificate->issued_at ?? $result->finished_at ?? now();

        return Pdf::loadView('certificates.template', [
            'participantName' => $result->user->name,
            'trainingTitle' => $training->title,
            'trainingPeriod' => $this->trainingPeriod($training, $issuedAt),
        ])
            ->setPaper('a4', 'landscape')
            ->output();
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

        $pdf .= "trailer << /Size ".(count($objects) + 1)." /Root 1 0 R >>\n";
        $pdf .= "startxref\n".$xrefOffset."\n%%EOF";

        return $pdf;
    }
}
