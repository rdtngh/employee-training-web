<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class UserImportTest extends TestCase
{
    use RefreshDatabase;

    public function test_super_admin_import_replaces_employee_data_from_no_rekening_column(): void
    {
        $superAdminRole = Role::create(['name' => 'Super Admin']);
        $employeeRole = Role::create(['name' => 'Karyawan']);

        $superAdmin = User::create([
            'role_id' => $superAdminRole->id,
            'employee_number' => '999',
            'name' => 'Super Admin',
            'department' => 'IT',
            'position' => 'Super Admin',
            'email' => 'superadmin@example.com',
            'password' => Hash::make('999'),
        ]);

        User::create([
            'role_id' => $employeeRole->id,
            'employee_number' => '1001',
            'name' => 'Nama Lama',
            'department' => 'HRD',
            'position' => 'Karyawan',
            'email' => null,
            'password' => Hash::make('1001'),
        ]);

        User::create([
            'role_id' => $employeeRole->id,
            'employee_number' => '2002',
            'name' => 'Karyawan Dihapus',
            'department' => 'HRD',
            'position' => 'Karyawan',
            'email' => null,
            'password' => Hash::make('2002'),
        ]);

        Sanctum::actingAs($superAdmin);

        $path = tempnam(sys_get_temp_dir(), 'employees');
        file_put_contents($path, "No Rekening,Nama\n1001,Nama Baru\n,Baris Tanpa Nomor\n3003,Karyawan Baru\n");

        $file = new UploadedFile($path, 'employees.csv', 'text/csv', null, true);

        $response = $this->postJson('/api/users/import', [
            'file' => $file,
        ]);

        $response->assertOk()
            ->assertJsonPath('data.created', 1)
            ->assertJsonPath('data.updated', 1)
            ->assertJsonPath('data.deleted', 1)
            ->assertJsonPath('data.skipped', 1);

        $this->assertDatabaseHas('users', [
            'employee_number' => '1001',
            'name' => 'Nama Baru',
            'role_id' => $employeeRole->id,
        ]);

        $this->assertDatabaseHas('users', [
            'employee_number' => '3003',
            'name' => 'Karyawan Baru',
            'role_id' => $employeeRole->id,
        ]);

        $this->assertDatabaseMissing('users', [
            'employee_number' => '2002',
        ]);

        $this->assertDatabaseMissing('users', [
            'name' => 'Baris Tanpa Nomor',
        ]);
    }

    public function test_imported_employee_uses_hashed_username_as_initial_password(): void
    {
        $superAdminRole = Role::create(['name' => 'Super Admin']);
        $employeeRole = Role::create(['name' => 'Karyawan']);

        $superAdmin = User::create([
            'role_id' => $superAdminRole->id,
            'employee_number' => '999',
            'name' => 'Super Admin',
            'department' => 'IT',
            'position' => 'Super Admin',
            'email' => 'superadmin@example.com',
            'password' => Hash::make('999'),
        ]);

        Sanctum::actingAs($superAdmin);

        $path = tempnam(sys_get_temp_dir(), 'employees');
        file_put_contents($path, "username,name,department\nardelia.gultom,Ardelia Gultom,Keuangan\n");

        $file = new UploadedFile($path, 'employees.csv', 'text/csv', null, true);

        $response = $this->postJson('/api/users/import', [
            'file' => $file,
        ]);

        $response->assertOk()
            ->assertJsonPath('data.created', 1)
            ->assertJsonPath('data.updated', 0)
            ->assertJsonPath('data.skipped', 0);

        $user = User::where('employee_number', 'ardelia.gultom')->firstOrFail();

        $this->assertSame('Ardelia Gultom', $user->name);
        $this->assertSame('Keuangan', $user->department);
        $this->assertSame($employeeRole->id, $user->role_id);
        $this->assertNotSame('ardelia.gultom', $user->password);
        $this->assertTrue(Hash::check('ardelia.gultom', $user->password));

        $loginResponse = $this->postJson('/api/login', [
            'employee_number' => 'ardelia.gultom',
            'password' => 'ardelia.gultom',
        ]);

        $loginResponse->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('user.name', 'Ardelia Gultom')
            ->assertJsonPath('user.role', 'Karyawan')
            ->assertJsonStructure(['token']);
    }

    public function test_import_does_not_reset_existing_employee_password(): void
    {
        $superAdminRole = Role::create(['name' => 'Super Admin']);
        $employeeRole = Role::create(['name' => 'Karyawan']);

        $superAdmin = User::create([
            'role_id' => $superAdminRole->id,
            'employee_number' => '999',
            'name' => 'Super Admin',
            'department' => 'IT',
            'position' => 'Super Admin',
            'email' => 'superadmin@example.com',
            'password' => Hash::make('999'),
        ]);

        $existingPassword = Hash::make('password-lama');
        User::create([
            'role_id' => $employeeRole->id,
            'employee_number' => 'ardy.putra',
            'name' => 'Ardy Lama',
            'department' => 'IT',
            'position' => 'Karyawan',
            'email' => null,
            'password' => $existingPassword,
        ]);

        Sanctum::actingAs($superAdmin);

        $path = tempnam(sys_get_temp_dir(), 'employees');
        file_put_contents($path, "username,name,department\nardy.putra,Ardy Putra,Keuangan\n");

        $file = new UploadedFile($path, 'employees.csv', 'text/csv', null, true);

        $response = $this->postJson('/api/users/import', [
            'file' => $file,
        ]);

        $response->assertOk()
            ->assertJsonPath('data.created', 0)
            ->assertJsonPath('data.updated', 1);

        $user = User::where('employee_number', 'ardy.putra')->firstOrFail();

        $this->assertTrue(Hash::check('password-lama', $user->password));
        $this->assertFalse(Hash::check('ardy.putra', $user->password));
    }
}
