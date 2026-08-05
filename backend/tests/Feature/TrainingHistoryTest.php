<?php

namespace Tests\Feature;

use App\Models\Certificate;
use App\Models\Material;
use App\Models\PostTestAccess;
use App\Models\Question;
use App\Models\Role;
use App\Models\Test;
use App\Models\TestResult;
use App\Models\Training;
use App\Models\User;
use App\Models\UserAnswer;
use App\Models\UserMaterial;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TrainingHistoryTest extends TestCase
{
    use RefreshDatabase;

    public function test_employee_only_sees_finished_post_test_histories(): void
    {
        [$admin, $employee] = $this->users();
        [$training, $test] = $this->trainingWithPostTest('Pelatihan Selesai');
        [$unfinishedTraining, $unfinishedTest] = $this->trainingWithPostTest('Belum Selesai');

        $finished = $this->createTestResult($employee, $test, 'Lulus', now());
        Certificate::create([
            'user_id' => $employee->id,
            'test_result_id' => $finished->id,
            'certificate_number' => 'CERT-001',
            'file_path' => '',
            'issued_at' => now(),
        ]);
        $this->createTestResult($employee, $unfinishedTest, 'Tidak Lulus', null);

        Sanctum::actingAs($employee);

        $this->getJson('/api/training-history')
            ->assertOk()
            ->assertJsonCount(1, 'data.histories')
            ->assertJsonPath('data.histories.0.training.id', $training->id)
            ->assertJsonPath('data.histories.0.certificate.certificate_number', 'CERT-001');
    }

    public function test_admin_can_permanently_delete_one_employee_training_history(): void
    {
        [$admin, $employee] = $this->users();
        [$training, $postTest] = $this->trainingWithPostTest('Pelatihan Mutu');
        $preTest = Test::create(['training_id' => $training->id, 'type' => 'pretest', 'duration' => 20, 'passing_score' => 70]);
        $material = Material::create(['training_id' => $training->id, 'title' => 'Materi', 'description' => null, 'speaker' => '', 'order_number' => 1]);
        $question = Question::create(['test_id' => $postTest->id, 'question' => 'Soal?', 'option_a' => 'A', 'option_b' => 'B', 'option_c' => 'C', 'option_d' => 'D', 'correct_answer' => 'A', 'order_number' => 1]);
        $postResult = $this->createTestResult($employee, $postTest, 'Lulus', now());
        $this->createTestResult($employee, $preTest, 'Lulus', now()->subHour());
        Certificate::create(['user_id' => $employee->id, 'test_result_id' => $postResult->id, 'certificate_number' => 'CERT-DELETE', 'file_path' => '', 'issued_at' => now()]);
        UserMaterial::create(['user_id' => $employee->id, 'material_id' => $material->id, 'is_completed' => true, 'completed_at' => now()]);
        UserAnswer::create(['user_id' => $employee->id, 'question_id' => $question->id, 'selected_answer' => 'A']);
        PostTestAccess::create(['user_id' => $employee->id, 'training_id' => $training->id, 'verified_at' => now()]);

        Sanctum::actingAs($admin);

        $this->deleteJson("/api/training-histories/{$training->id}/users/{$employee->id}")
            ->assertOk();

        $this->assertDatabaseMissing('test_results', ['user_id' => $employee->id, 'test_id' => $postTest->id]);
        $this->assertDatabaseMissing('test_results', ['user_id' => $employee->id, 'test_id' => $preTest->id]);
        $this->assertDatabaseMissing('certificates', ['user_id' => $employee->id]);
        $this->assertDatabaseMissing('user_materials', ['user_id' => $employee->id, 'material_id' => $material->id]);
        $this->assertDatabaseMissing('user_answers', ['user_id' => $employee->id, 'question_id' => $question->id]);
        $this->assertDatabaseMissing('post_test_accesses', ['user_id' => $employee->id, 'training_id' => $training->id]);
        $this->assertDatabaseHas('trainings', ['id' => $training->id]);
    }

    public function test_employee_can_preview_an_earned_certificate_after_training_is_inactive(): void
    {
        [, $employee] = $this->users();
        [$training, $postTest] = $this->trainingWithPostTest('Pelatihan Lama');
        $training->update(['is_active' => false]);
        $result = $this->createTestResult($employee, $postTest, 'Lulus', now());
        Certificate::create(['user_id' => $employee->id, 'test_result_id' => $result->id, 'certificate_number' => 'CERT-HISTORY', 'file_path' => '', 'issued_at' => now()]);

        Sanctum::actingAs($employee);

        $this->getJson("/api/certificates/{$training->id}")
            ->assertOk()
            ->assertJsonPath('data.training_title', 'Pelatihan Lama')
            ->assertJsonPath('data.eligible', true);
    }

    public function test_admin_can_preview_an_employee_certificate(): void
    {
        [$admin, $employee] = $this->users();
        [$training, $postTest] = $this->trainingWithPostTest('Pelatihan Mutu');
        $result = $this->createTestResult($employee, $postTest, 'Lulus', now());
        $certificate = Certificate::create(['user_id' => $employee->id, 'test_result_id' => $result->id, 'certificate_number' => 'CERT-ADMIN', 'file_path' => '', 'issued_at' => now()]);

        Sanctum::actingAs($admin);

        $this->getJson("/api/certificates/{$certificate->id}/preview")
            ->assertOk()
            ->assertJsonPath('data.employee.name', 'Karyawan')
            ->assertJsonPath('data.training.title', $training->title);
    }

    public function test_certificate_sequence_restarts_from_one_each_year(): void
    {
        [$admin, $employee] = $this->users();
        [$training2026A, $test2026A] = $this->trainingWithPostTest('Pelatihan 2026 A');
        [$training2026B, $test2026B] = $this->trainingWithPostTest('Pelatihan 2026 B');
        [$training2027, $test2027] = $this->trainingWithPostTest('Pelatihan 2027');
        $date2026A = Carbon::parse('2026-08-01 10:00:00');
        $date2026B = Carbon::parse('2026-09-01 10:00:00');
        $date2027 = Carbon::parse('2027-01-05 10:00:00');

        $result2026A = $this->createTestResult($employee, $test2026A, 'Lulus', $date2026A);
        $result2026B = $this->createTestResult($employee, $test2026B, 'Lulus', $date2026B);
        $result2027 = $this->createTestResult($employee, $test2027, 'Lulus', $date2027);
        Certificate::create(['user_id' => $employee->id, 'test_result_id' => $result2026A->id, 'certificate_number' => 'LEGACY-1', 'file_path' => '', 'issued_at' => $date2026A]);
        $certificate2026B = Certificate::create(['user_id' => $employee->id, 'test_result_id' => $result2026B->id, 'certificate_number' => 'LEGACY-2', 'file_path' => '', 'issued_at' => $date2026B]);
        $certificate2027 = Certificate::create(['user_id' => $employee->id, 'test_result_id' => $result2027->id, 'certificate_number' => 'LEGACY-3', 'file_path' => '', 'issued_at' => $date2027]);

        Sanctum::actingAs($admin);

        $this->getJson("/api/certificates/{$certificate2026B->id}/preview")
            ->assertOk()
            ->assertJsonPath('data.sequence_number', 2)
            ->assertJsonPath('data.certificate_number', 'NO: 2/DIKLATLIT-RSABL/IX/2026');

        $this->getJson("/api/certificates/{$certificate2027->id}/preview")
            ->assertOk()
            ->assertJsonPath('data.sequence_number', 1)
            ->assertJsonPath('data.certificate_number', 'NO: 1/DIKLATLIT-RSABL/I/2027');
    }

    private function users(): array
    {
        $adminRole = Role::create(['name' => 'Admin']);
        $employeeRole = Role::create(['name' => 'Karyawan']);
        Role::create(['name' => 'Super Admin']);

        $admin = User::create(['role_id' => $adminRole->id, 'employee_number' => 'admin', 'name' => 'Admin', 'department' => 'IT', 'position' => 'Admin', 'email' => 'admin@example.com', 'password' => 'password']);
        $employee = User::create(['role_id' => $employeeRole->id, 'employee_number' => 'employee', 'name' => 'Karyawan', 'department' => 'Unit', 'position' => 'Staf', 'email' => 'employee@example.com', 'password' => 'password']);

        return [$admin, $employee];
    }

    private function trainingWithPostTest(string $title): array
    {
        $training = Training::create(['title' => $title, 'is_active' => true]);
        $test = Test::create(['training_id' => $training->id, 'type' => 'posttest', 'duration' => 20, 'passing_score' => 70]);

        return [$training, $test];
    }

    private function createTestResult(User $user, Test $test, string $status, $finishedAt): TestResult
    {
        return TestResult::create(['user_id' => $user->id, 'test_id' => $test->id, 'score' => $status === 'Lulus' ? 90 : 50, 'correct_answers' => 9, 'wrong_answers' => 1, 'status' => $status, 'started_at' => now()->subMinutes(10), 'finished_at' => $finishedAt]);
    }
}
