<?php

namespace Tests\Feature;

use App\Models\Material;
use App\Models\Question;
use App\Models\Role;
use App\Models\Test as TrainingTest;
use App\Models\TestResult;
use App\Models\Training;
use App\Models\User;
use App\Models\UserMaterial;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PostTestAccessCodeTest extends TestCase
{
    use RefreshDatabase;

    public function test_employee_must_verify_training_access_code_before_opening_post_test(): void
    {
        [$employee, $training, $postTest] = $this->readyEmployeeAndLockedPostTest();

        Sanctum::actingAs($employee);

        $this->getJson("/api/trainings/{$training->id}/tests/posttest")
            ->assertForbidden()
            ->assertJsonPath('message', 'Masukkan kode akses Post-Test untuk membuka tes.');

        $this->postJson("/api/trainings/{$training->id}/post-test-access-code/verify", [
            'access_code' => 'SALAH',
        ])
            ->assertStatus(422)
            ->assertJsonPath('message', 'Kode akses Post-Test tidak sesuai.');

        $this->postJson("/api/trainings/{$training->id}/post-test-access-code/verify", [
            'access_code' => 'KODE-123',
        ])
            ->assertOk()
            ->assertJsonPath('data.verified', true);

        $this->getJson("/api/trainings/{$training->id}/tests/posttest")
            ->assertOk()
            ->assertJsonPath('data.id', $postTest->id);
    }

    public function test_changing_training_access_code_invalidates_previous_verification(): void
    {
        [$employee, $training] = $this->readyEmployeeAndLockedPostTest();
        $admin = $this->admin();

        Sanctum::actingAs($employee);

        $this->postJson("/api/trainings/{$training->id}/post-test-access-code/verify", [
            'access_code' => 'KODE-123',
        ])->assertOk();

        $this->getJson("/api/trainings/{$training->id}/tests/posttest")->assertOk();

        Sanctum::actingAs($admin);

        $this->putJson("/api/trainings/{$training->id}", [
            'title' => $training->title,
            'post_test_access_code' => 'KODE-BARU',
        ])->assertOk();

        Sanctum::actingAs($employee);

        $this->getJson("/api/trainings/{$training->id}/tests/posttest")
            ->assertForbidden()
            ->assertJsonPath('message', 'Masukkan kode akses Post-Test untuk membuka tes.');

        $this->postJson("/api/trainings/{$training->id}/post-test-access-code/verify", [
            'access_code' => 'KODE-BARU',
        ])->assertOk();

        $this->getJson("/api/trainings/{$training->id}/tests/posttest")->assertOk();
    }

    public function test_post_test_stays_locked_when_admin_has_not_configured_access_code(): void
    {
        [$employee, $training] = $this->readyEmployeeAndLockedPostTest(null);

        Sanctum::actingAs($employee);

        $this->getJson("/api/trainings/{$training->id}/materials/progress")
            ->assertOk()
            ->assertJsonPath('data.training.post_test_access_required', true)
            ->assertJsonPath('data.training.post_test_access_verified', false);

        $this->getJson("/api/trainings/{$training->id}/tests/posttest")
            ->assertForbidden()
            ->assertJsonPath('message', 'Masukkan kode akses Post-Test untuk membuka tes.');

        $this->postJson("/api/trainings/{$training->id}/post-test-access-code/verify", [
            'access_code' => 'APA-SAJA',
        ])
            ->assertStatus(422)
            ->assertJsonPath('message', 'Kode akses belum tersedia.');
    }

    public function test_employee_can_verify_access_code_when_only_encrypted_admin_display_value_exists(): void
    {
        [$employee, $training] = $this->readyEmployeeAndLockedPostTest(null);

        $training->forceFill([
            'post_test_access_code_encrypted' => Crypt::encryptString('DIKLAT2026'),
            'post_test_access_code_updated_at' => now(),
        ])->save();

        Sanctum::actingAs($employee);

        $this->postJson("/api/trainings/{$training->id}/post-test-access-code/verify", [
            'access_code' => 'DIKLAT2026',
        ])->assertOk();

        $this->assertNotNull($training->fresh()->post_test_access_code_hash);

        $this->getJson("/api/trainings/{$training->id}/tests/posttest")->assertOk();
    }

    private function readyEmployeeAndLockedPostTest(?string $accessCode = 'KODE-123'): array
    {
        $employeeRole = Role::create(['name' => 'Karyawan']);
        Role::firstOrCreate(['name' => 'Admin']);
        Role::firstOrCreate(['name' => 'Super Admin']);

        $employee = User::create([
            'role_id' => $employeeRole->id,
            'employee_number' => 'andi123',
            'name' => 'Andi Saputra',
            'department' => 'Farmasi',
            'position' => 'Karyawan',
            'email' => null,
            'password' => Hash::make('andi123'),
        ]);

        $trainingPayload = [
            'title' => 'Pelatihan Keselamatan',
            'is_active' => true,
        ];

        if ($accessCode !== null) {
            $trainingPayload['post_test_access_code_hash'] = Hash::make($accessCode);
            $trainingPayload['post_test_access_code_updated_at'] = now();
        }

        $training = Training::create($trainingPayload);

        $preTest = TrainingTest::create([
            'training_id' => $training->id,
            'type' => 'pretest',
            'duration' => 30,
            'passing_score' => 70,
        ]);

        $postTest = TrainingTest::create([
            'training_id' => $training->id,
            'type' => 'posttest',
            'duration' => 30,
            'passing_score' => 70,
        ]);

        Question::create([
            'test_id' => $preTest->id,
            'question' => 'Apa tujuan pelatihan?',
            'option_a' => 'Belajar',
            'option_b' => 'Menunggu',
            'option_c' => 'Pulang',
            'option_d' => 'Diam',
            'correct_answer' => 'A',
            'order_number' => 1,
        ]);

        $material = Material::create([
            'training_id' => $training->id,
            'title' => 'Materi Keselamatan',
            'description' => null,
            'speaker' => '',
            'order_number' => 1,
        ]);

        TestResult::create([
            'user_id' => $employee->id,
            'test_id' => $preTest->id,
            'score' => 100,
            'correct_answers' => 1,
            'wrong_answers' => 0,
            'status' => 'Lulus',
            'started_at' => now()->subMinutes(5),
            'finished_at' => now()->subMinutes(4),
        ]);

        UserMaterial::create([
            'user_id' => $employee->id,
            'material_id' => $material->id,
            'is_completed' => true,
            'completed_at' => now()->subMinute(),
        ]);

        return [$employee, $training, $postTest];
    }

    private function admin(): User
    {
        $adminRole = Role::firstOrCreate(['name' => 'Admin']);

        return User::create([
            'role_id' => $adminRole->id,
            'employee_number' => 'admin123',
            'name' => 'Admin',
            'department' => 'IT',
            'position' => 'Admin',
            'email' => 'admin@example.com',
            'password' => Hash::make('admin123'),
        ]);
    }
}
