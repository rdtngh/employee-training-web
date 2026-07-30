<?php

namespace Tests\Feature;

use App\Models\Material;
use App\Models\MaterialFile;
use App\Models\Role;
use App\Models\Training;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MaterialManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_updating_material_with_new_upload_replaces_previous_file(): void
    {
        Storage::fake('local');

        $adminRole = Role::create(['name' => 'Admin']);
        Role::create(['name' => 'Super Admin']);
        Role::create(['name' => 'Karyawan']);

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
            'title' => 'Pelatihan Mutu',
        ]);

        $material = Material::create([
            'training_id' => $training->id,
            'title' => 'Materi Lama',
            'description' => null,
            'speaker' => '',
            'order_number' => 1,
        ]);

        Storage::disk('local')->put('materials/old.pdf', 'old content');

        MaterialFile::create([
            'material_id' => $material->id,
            'file_name' => 'old.pdf',
            'file_path' => 'materials/old.pdf',
            'file_type' => 'application/pdf',
        ]);

        Sanctum::actingAs($admin);

        $response = $this->post("/api/materials/{$material->id}", [
            '_method' => 'PUT',
            'training_id' => $training->id,
            'title' => 'Materi Baru',
            'files' => [
                UploadedFile::fake()->create('new.pdf', 10, 'application/pdf'),
            ],
        ], [
            'Accept' => 'application/json',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.title', 'Materi Baru')
            ->assertJsonPath('data.files.0.file_name', 'new.pdf');

        $this->assertDatabaseMissing('material_files', [
            'material_id' => $material->id,
            'file_name' => 'old.pdf',
        ]);

        $this->assertDatabaseHas('material_files', [
            'material_id' => $material->id,
            'file_name' => 'new.pdf',
        ]);

        $this->assertSame(1, MaterialFile::where('material_id', $material->id)->count());
        Storage::disk('local')->assertMissing('materials/old.pdf');

        $newFile = MaterialFile::where('material_id', $material->id)->firstOrFail();
        Storage::disk('local')->assertExists($newFile->file_path);
    }
}
