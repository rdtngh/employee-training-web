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
            $controller = new QuestionController;
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

    public function test_docx_parser_combines_separate_option_labels_and_reads_question_image(): void
    {
        $path = tempnam(sys_get_temp_dir(), 'question-import-').'.docx';
        $zip = new ZipArchive;
        $zip->open($path, ZipArchive::CREATE | ZipArchive::OVERWRITE);
        $zip->addFromString('word/document.xml', '<?xml version="1.0" encoding="UTF-8"?>'
            .'<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" '
            .'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" '
            .'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>'
            .'<w:p><w:r><w:t>1. Pilih gambar yang benar</w:t></w:r><w:r><w:drawing><a:blip r:embed="rId5"/></w:drawing></w:r></w:p>'
            .'<w:p><w:r><w:t>A.</w:t></w:r></w:p><w:p><w:r><w:t>Pilihan pertama</w:t></w:r></w:p>'
            .'<w:p><w:r><w:t>B.</w:t></w:r></w:p><w:p><w:r><w:t>Pilihan kedua</w:t></w:r></w:p>'
            .'<w:p><w:r><w:t>C.</w:t></w:r></w:p><w:p><w:r><w:t>Pilihan ketiga</w:t></w:r></w:p>'
            .'<w:p><w:r><w:t>D.</w:t></w:r></w:p><w:p><w:r><w:t>Pilihan keempat</w:t></w:r></w:p>'
            .'<w:p><w:r><w:t>Kunci: B</w:t></w:r></w:p></w:body></w:document>');
        $zip->addFromString('word/_rels/document.xml.rels', '<?xml version="1.0" encoding="UTF-8"?>'
            .'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            .'<Relationship Id="rId5" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image1.png"/>'
            .'</Relationships>');
        $zip->addFromString('word/media/image1.png', base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='));
        $zip->close();

        try {
            $controller = new QuestionController;
            $questions = (new \ReflectionMethod($controller, 'parseDocxQuestions'))->invoke($controller, $path);
        } finally {
            @unlink($path);
        }

        $this->assertCount(1, $questions);
        $this->assertSame('Pilihan pertama', $questions[0]['option_a']);
        $this->assertSame('Pilihan keempat', $questions[0]['option_d']);
        $this->assertSame('B', $questions[0]['correct_answer']);
        $this->assertStringStartsWith('data:image/png;base64,', $questions[0]['image_data']);
    }

    private function createDocx(array $paragraphs): string
    {
        $path = tempnam(sys_get_temp_dir(), 'question-import-').'.docx';
        $zip = new ZipArchive;
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
