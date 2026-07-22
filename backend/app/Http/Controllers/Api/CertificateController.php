<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Certificate;
use App\Models\TestResult;
use App\Models\Training;
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
        $issuedAt = $certificate->issued_at ?? now();
        $lines = [
            ['CERTIFICATE OF COMPLETION', 150, 430, 30, 'bold'],
            ['This certificate is proudly presented to', 215, 385, 14, 'regular'],
            [$result->user->name, 210, 340, 26, 'bold'],
            ['For successfully completing the training', 205, 300, 14, 'regular'],
            [$training->title, 170, 260, 20, 'bold'],
            ['Score: '.$result->score.' | Certificate No: '.$certificate->certificate_number, 185, 210, 12, 'regular'],
            ['Issued at: '.$issuedAt->format('d F Y'), 300, 180, 12, 'regular'],
        ];

        $content = "q\n";
        $content .= "1 1 1 rg 0 0 842 595 re f\n";
        $content .= "0.08 0.35 0.19 RG 5 w 42 42 758 511 re S\n";
        $content .= "0.80 0.66 0.30 RG 2 w 62 62 718 471 re S\n";
        $content .= "0.08 0.35 0.19 rg\n";

        foreach ($lines as [$text, $x, $y, $size, $weight]) {
            $font = $weight === 'bold' ? 'F2' : 'F1';
            $content .= sprintf(
                "BT /%s %d Tf %d %d Td (%s) Tj ET\n",
                $font,
                $size,
                $x,
                $y,
                $this->pdfText($text)
            );
        }

        $content .= "Q\n";

        return $this->pdfDocument($content);
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

    private function pdfDocument(string $content): string
    {
        $objects = [
            '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
            '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
            '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >> endobj',
            '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
            '5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> endobj',
            '6 0 obj << /Length '.strlen($content).' >> stream'."\n".$content."\n".'endstream endobj',
        ];

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
