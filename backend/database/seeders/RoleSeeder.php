<?php

namespace Database\Seeders;

use App\Models\Role;
use Illuminate\Database\Seeder;

class RoleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $roles = [
            [
                'id' => 1,
                'name' => 'Super Admin',
            ],
            [
                'id' => 2,
                'name' => 'Admin',
            ],
            [
                'id' => 3,
                'name' => 'Karyawan',
            ],
            [
                'id' => 4,
                'name' => 'Mahasiswa/Pelajar',
            ],
        ];

        foreach ($roles as $role) {
            Role::updateOrCreate(['id' => $role['id']], ['name' => $role['name']]);
        }
    }
}
