<?php

namespace Tests\Feature;

use App\Http\Controllers\Api\QuestionController;
use PHPUnit\Framework\TestCase;
use ZipArchive;

class QuestionImportParserTest extends TestCase
{
    public function test_docx_question_parser_accepts_common_flexible_formats(): void
    {
        $docxPath = $this->createDocx([
            'Soal 1: Apa kepanjangan HIV?',
            'A) Human Immunodeficiency Virus',
            'B: Human Influenza Virus',
            '(C) Healthy Immune Variant',
            'D - High Infection Value',
            'Kunci Jawaban: A',
            '2) Setelah pajanan darah, tindakan pertama adalah',
            'Pilihan A: Pulang',
            'Pilihan B: Cuci area terpajan',
            'Pilihan C: Menunggu gejala',
            'Pilihan D: Tidak perlu lapor',
            'Jawaban Benar B',
        ]);

        try {
            $controller = new QuestionController();
            $method = new \ReflectionMethod($controller, 'parseDocxQuestions');
            $method->setAccessible(true);

            $questions = $method->invoke($controller, $docxPath);
        } finally {
            @unlink($docxPath);
        }

        $this->assertCount(2, $questions);
        $this->assertSame('Apa kepanjangan HIV?', $questions[0]['question']);
        $this->assertSame('Human Immunodeficiency Virus', $questions[0]['option_a']);
        $this->assertSame('Healthy Immune Variant', $questions[0]['option_c']);
        $this->assertSame('High Infection Value', $questions[0]['option_d']);
        $this->assertSame('A', $questions[0]['correct_answer']);
        $this->assertSame('Setelah pajanan darah, tindakan pertama adalah', $questions[1]['question']);
        $this->assertSame('Cuci area terpajan', $questions[1]['option_b']);
        $this->assertSame('B', $questions[1]['correct_answer']);
    }

    private function createDocx(array $paragraphs): string
    {
        $path = tempnam(sys_get_temp_dir(), 'question-import-').'.docx';
        $zip = new ZipArchive();
        $zip->open($path, ZipArchive::CREATE | ZipArchive::OVERWRITE);
        $zip->addFromString('word/document.xml', $this->documentXml($paragraphs));
        $zip->close();

        return $path;
    }

    private function documentXml(array $paragraphs): string
    {
        $body = collect($paragraphs)
            ->map(fn (string $text) => '<w:p><w:r><w:t>'.htmlspecialchars($text, ENT_XML1).'</w:t></w:r></w:p>')
            ->implode('');

        return '<?xml version="1.0" encoding="UTF-8"?>'
            .'<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
            .'<w:body>'.$body.'</w:body>'
            .'</w:document>';
    }
}
