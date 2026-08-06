<?php

namespace Tests\Feature;

use App\Models\Certificate;
use App\Models\Role;
use App\Models\Test as TrainingTest;
use App\Models\TestResult;
use App\Models\Training;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class StatisticsTopScoresTest extends TestCase
{
    use RefreshDatabase;

    public function test_top_post_test_scores_include_duration_and_use_faster_duration_as_tie_breaker(): void
    {
        $adminRole = Role::create(['name' => 'Admin']);
        $employeeRole = Role::create(['name' => 'Karyawan']);

        $admin = User::create([
            'role_id' => $adminRole->id,
            'employee_number' => 'admin',
            'name' => 'Admin',
            'department' => 'IT',
            'position' => 'Admin',
            'email' => 'admin@example.com',
            'password' => Hash::make('admin'),
        ]);

        $training = Training::create([
            'title' => 'Pelatihan Keamanan',
            'is_active' => true,
        ]);

        $postTest = TrainingTest::create([
            'training_id' => $training->id,
            'type' => 'posttest',
            'duration' => 30,
            'passing_score' => 70,
        ]);

        $slowHighScore = $this->employee($employeeRole->id, 'andi123', 'Andi Saputra');
        $fastHighScore = $this->employee($employeeRole->id, 'budi123', 'Budi Santoso');
        $lowerScore = $this->employee($employeeRole->id, 'citra123', 'Citra Lestari');

        $this->postTestResult($slowHighScore->id, $postTest->id, 95, '2026-07-30 09:00:00', '2026-07-30 09:03:00');
        $this->postTestResult($fastHighScore->id, $postTest->id, 95, '2026-07-30 09:00:00', '2026-07-30 09:01:30');
        $this->postTestResult($lowerScore->id, $postTest->id, 90, '2026-07-30 09:00:00', '2026-07-30 09:02:00');

        Sanctum::actingAs($admin);

        $response = $this->getJson('/api/statistics?training_id='.$training->id);

        $response->assertOk()
            ->assertJsonPath('data.top_scores.0.employee_name', 'Budi Santoso')
            ->assertJsonPath('data.top_scores.0.score', 95)
            ->assertJsonPath('data.top_scores.0.duration_seconds', 90)
            ->assertJsonPath('data.top_scores.0.duration_label', '1 menit 30 detik')
            ->assertJsonPath('data.top_scores.1.employee_name', 'Andi Saputra')
            ->assertJsonPath('data.top_scores.1.duration_seconds', 180)
            ->assertJsonPath('data.top_scores.2.employee_name', 'Citra Lestari')
            ->assertJsonPath('data.top_scores.2.duration_seconds', 120);
    }

    public function test_resetting_a_post_test_deletes_its_certificate(): void
    {
        $adminRole = Role::create(['name' => 'Admin']);
        $employeeRole = Role::create(['name' => 'Karyawan']);
        $admin = $this->employee($adminRole->id, 'admin', 'Admin');
        $employee = $this->employee($employeeRole->id, 'employee', 'Employee');
        $training = Training::create(['title' => 'Pelatihan HIV', 'is_active' => true]);
        $postTest = TrainingTest::create([
            'training_id' => $training->id,
            'type' => 'posttest',
            'duration' => 30,
            'passing_score' => 70,
        ]);
        $result = TestResult::create([
            'user_id' => $employee->id,
            'test_id' => $postTest->id,
            'score' => 90,
            'correct_answers' => 9,
            'wrong_answers' => 1,
            'status' => 'Lulus',
            'started_at' => now()->subMinutes(5),
            'finished_at' => now(),
        ]);
        $certificate = Certificate::create([
            'user_id' => $employee->id,
            'test_result_id' => $result->id,
            'certificate_number' => 'CERT-HIV-RESET',
            'file_path' => '',
            'issued_at' => now(),
        ]);

        Sanctum::actingAs($admin);

        $this->postJson('/api/statistics/reset', [
            'training_id' => $training->id,
            'reset_type' => 'posttest',
            'user_ids' => [$employee->id],
        ])->assertOk()
            ->assertJsonPath('data.updated.test_results', 1)
            ->assertJsonPath('data.updated.certificates', 1);

        $this->assertDatabaseMissing('certificates', ['id' => $certificate->id]);
        $this->assertDatabaseHas('test_results', ['id' => $result->id]);
        $this->assertNotNull($result->fresh()->reset_at);
    }

    private function employee(int $roleId, string $username, string $name): User
    {
        return User::create([
            'role_id' => $roleId,
            'employee_number' => $username,
            'name' => $name,
            'department' => 'Farmasi',
            'position' => 'Karyawan',
            'email' => null,
            'password' => Hash::make($username),
        ]);
    }

    private function postTestResult(int $userId, int $testId, int $score, string $startedAt, string $finishedAt): void
    {
        TestResult::create([
            'user_id' => $userId,
            'test_id' => $testId,
            'score' => $score,
            'correct_answers' => $score,
            'wrong_answers' => 100 - $score,
            'status' => 'Lulus',
            'started_at' => $startedAt,
            'finished_at' => $finishedAt,
        ]);
    }
}
