<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class UserManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_super_admin_can_create_user_with_alphanumeric_username(): void
    {
        $superAdminRole = Role::create(['name' => 'Super Admin']);
        Role::create(['name' => 'Admin']);
        Role::create(['name' => 'Karyawan']);

        $superAdmin = User::create([
            'role_id' => $superAdminRole->id,
            'employee_number' => 'superadmin',
            'name' => 'Super Admin',
            'department' => 'IT',
            'position' => 'Super Admin',
            'email' => 'superadmin@example.com',
            'password' => Hash::make('superadmin'),
        ]);

        Sanctum::actingAs($superAdmin);

        $response = $this->postJson('/api/users', [
            'employee_number' => 'andi123',
            'name' => 'Andi Saputra',
            'department' => 'Farmasi',
            'role' => 'Karyawan',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.userId', 'andi123')
            ->assertJsonPath('data.user', 'Andi Saputra');

        $this->assertDatabaseHas('users', [
            'employee_number' => 'andi123',
            'name' => 'Andi Saputra',
            'department' => 'Farmasi',
        ]);
    }

    public function test_updating_username_resets_password_to_new_username(): void
    {
        $superAdminRole = Role::create(['name' => 'Super Admin']);
        $employeeRole = Role::create(['name' => 'Karyawan']);
        Role::create(['name' => 'Admin']);

        $superAdmin = User::create([
            'role_id' => $superAdminRole->id,
            'employee_number' => 'superadmin',
            'name' => 'Super Admin',
            'department' => 'IT',
            'position' => 'Super Admin',
            'email' => 'superadmin@example.com',
            'password' => Hash::make('superadmin'),
        ]);

        $employee = User::create([
            'role_id' => $employeeRole->id,
            'employee_number' => 'andi123',
            'name' => 'Andi Saputra',
            'department' => 'Farmasi',
            'position' => 'Karyawan',
            'email' => null,
            'password' => Hash::make('password-lama'),
        ]);

        Sanctum::actingAs($superAdmin);

        $response = $this->putJson("/api/users/{$employee->id}", [
            'employee_number' => 'andi456',
            'name' => 'Andi Saputra',
            'department' => 'Farmasi',
            'role' => 'Karyawan',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.userId', 'andi456');

        $employee->refresh();

        $this->assertSame('andi456', $employee->employee_number);
        $this->assertTrue(Hash::check('andi456', $employee->password));
        $this->assertFalse(Hash::check('password-lama', $employee->password));
    }

    public function test_super_admin_can_create_student_user_with_department(): void
    {
        $superAdminRole = Role::create(['name' => 'Super Admin']);
        Role::create(['name' => 'Admin']);
        Role::create(['name' => 'Karyawan']);
        $studentRole = Role::where('name', 'Mahasiswa/Pelajar')->firstOrFail();
        $superAdmin = User::create([
            'role_id' => $superAdminRole->id,
            'employee_number' => 'superadmin',
            'name' => 'Super Admin',
            'department' => 'IT',
            'position' => 'Super Admin',
            'email' => 'superadmin@example.com',
            'password' => Hash::make('superadmin'),
        ]);

        Sanctum::actingAs($superAdmin);

        $this->postJson('/api/users', [
            'employee_number' => 'student01',
            'name' => 'Mahasiswa Satu',
            'department' => 'Mahasiswa/Pelajar',
            'role' => 'Mahasiswa/Pelajar',
        ])->assertCreated()
            ->assertJsonPath('data.role', 'Mahasiswa/Pelajar')
            ->assertJsonPath('data.department', 'Mahasiswa/Pelajar');

        $this->assertDatabaseHas('users', [
            'employee_number' => 'student01',
            'role_id' => $studentRole->id,
            'department' => 'Mahasiswa/Pelajar',
        ]);
    }

    public function test_admin_cannot_access_user_management(): void
    {
        $adminRole = Role::create(['name' => 'Admin']);
        $admin = User::create([
            'role_id' => $adminRole->id,
            'employee_number' => 'admin',
            'name' => 'Admin',
            'department' => 'IT',
            'position' => 'Admin',
            'email' => 'admin@example.com',
            'password' => Hash::make('admin'),
        ]);

        Sanctum::actingAs($admin);

        $this->getJson('/api/users')->assertForbidden();
        $this->getJson('/api/users/options')->assertForbidden();
    }

    public function test_super_admin_can_deactivate_and_reactivate_user_without_deleting_data(): void
    {
        $superAdminRole = Role::create(['name' => 'Super Admin']);
        $employeeRole = Role::create(['name' => 'Karyawan']);
        $superAdmin = User::create(['role_id' => $superAdminRole->id, 'employee_number' => 'superadmin', 'name' => 'Super Admin', 'department' => 'IT', 'position' => 'Super Admin', 'email' => null, 'password' => 'superadmin']);
        $employee = User::create(['role_id' => $employeeRole->id, 'employee_number' => 'alex', 'name' => 'Alex', 'department' => 'IGD', 'position' => 'Karyawan', 'email' => null, 'password' => 'alex']);

        Sanctum::actingAs($superAdmin);

        $this->patchJson("/api/users/{$employee->id}/status", ['is_active' => false])
            ->assertOk()
            ->assertJsonPath('data.isActive', false);

        $this->assertDatabaseHas('users', ['id' => $employee->id, 'is_active' => false]);
        $this->deleteJson("/api/users/{$employee->id}")->assertMethodNotAllowed();

        $this->postJson('/api/login', ['employee_number' => 'alex', 'password' => 'alex'])
            ->assertForbidden()
            ->assertJsonPath('message', 'Akun Anda telah dinonaktifkan. Hubungi administrator.');

        $this->patchJson("/api/users/{$employee->id}/status", ['is_active' => true])
            ->assertOk()
            ->assertJsonPath('data.isActive', true);

        $this->postJson('/api/login', ['employee_number' => 'alex', 'password' => 'alex'])
            ->assertOk();
    }

    public function test_protected_super_admin_cannot_be_edited_or_deactivated(): void
    {
        $superAdminRole = Role::create(['name' => 'Super Admin']);
        Role::create(['name' => 'Admin']);
        $superAdmin = User::create(['role_id' => $superAdminRole->id, 'employee_number' => 'rennysarah', 'name' => 'Renny Sarah', 'department' => 'IT', 'position' => 'Super Admin', 'email' => null, 'password' => 'rennysarah', 'is_protected_superadmin' => true]);
        Sanctum::actingAs($superAdmin);

        $this->putJson("/api/users/{$superAdmin->id}", [
            'employee_number' => 'rennysarah',
            'name' => 'Renny Baru',
            'department' => 'IT',
            'role' => 'Admin',
        ])->assertForbidden();

        $this->patchJson("/api/users/{$superAdmin->id}/status", ['is_active' => false])
            ->assertForbidden();

        $this->assertDatabaseHas('users', [
            'id' => $superAdmin->id,
            'name' => 'Renny Sarah',
            'role_id' => $superAdminRole->id,
            'is_active' => true,
        ]);
    }

    public function test_unprotected_super_admin_can_be_changed_to_admin_and_deactivated(): void
    {
        $superAdminRole = Role::create(['name' => 'Super Admin']);
        $adminRole = Role::create(['name' => 'Admin']);
        $renny = User::create(['role_id' => $superAdminRole->id, 'employee_number' => 'rennysarah', 'name' => 'Renny Sarah', 'department' => 'IT', 'position' => 'Super Admin', 'email' => null, 'password' => 'rennysarah', 'is_protected_superadmin' => true]);
        $ammin = User::create(['role_id' => $superAdminRole->id, 'employee_number' => 'amminnainggolan', 'name' => 'Ammin Nainggolan', 'department' => 'IT', 'position' => 'Super Admin', 'email' => null, 'password' => 'amminnainggolan']);
        Sanctum::actingAs($renny);

        $this->putJson("/api/users/{$ammin->id}", [
            'employee_number' => 'amminnainggolan',
            'name' => 'Ammin Nainggolan',
            'department' => 'IT',
            'role' => 'Admin',
        ])->assertOk();

        $this->patchJson("/api/users/{$ammin->id}/status", ['is_active' => false])
            ->assertOk();

        $this->assertDatabaseHas('users', [
            'id' => $ammin->id,
            'role_id' => $adminRole->id,
            'is_active' => false,
            'is_protected_superadmin' => false,
        ]);
    }
}
