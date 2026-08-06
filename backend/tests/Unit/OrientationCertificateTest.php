<?php

namespace Tests\Unit;

use App\Http\Controllers\Api\CertificateController;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use ReflectionMethod;

class OrientationCertificateTest extends TestCase
{
    #[DataProvider('bhdDepartments')]
    public function test_bhd_is_added_for_configured_departments(string $department): void
    {
        $materials = $this->materialsFor($department);

        $this->assertCount(6, $materials);
        $this->assertSame('BANTUAN HIDUP DASAR', $materials[3]);
    }

    public function test_non_bhd_and_student_departments_receive_five_materials(): void
    {
        foreach (['Farmasi', 'Mahasiswa/Pelajar', '', null] as $department) {
            $materials = $this->materialsFor($department);

            $this->assertCount(5, $materials);
            $this->assertNotContains('BANTUAN HIDUP DASAR', $materials);
        }
    }

    public static function bhdDepartments(): array
    {
        return array_map(
            static fn (string $department): array => [$department],
            [
                'IGD', 'Rawat Jalan', 'Kamar Operasi/IBS', 'Mahoni', 'Kenanga',
                'Elim 2', 'Elim 3', 'Cemara', 'Cendana', 'Tapis', 'Akasia',
                'Pinus', 'Elim 5', 'ICU', 'Medis',
            ]
        );
    }

    private function materialsFor(?string $department): array
    {
        $method = new ReflectionMethod(CertificateController::class, 'orientationMaterials');

        return $method->invoke(new CertificateController, $department);
    }
}
