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
}
