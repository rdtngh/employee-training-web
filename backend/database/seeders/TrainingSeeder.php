<?php

namespace Database\Seeders;

use App\Models\Training;
use Illuminate\Database\Seeder;

class TrainingSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        Training::updateOrCreate(
            ['id' => 1],
            [
                'title' => 'Pelatihan Karyawan',
                'description' => 'Pelatihan default untuk materi karyawan.',
                'start_date' => null,
                'end_date' => null,
                'is_active' => true,
            ]
        );

        Training::updateOrCreate(
            ['is_general_orientation' => true],
            [
                'title' => 'Orientasi Umum',
                'description' => 'Orientasi umum tetap untuk karyawan baru dan mahasiswa/pelajar.',
                'start_date' => null,
                'end_date' => null,
                'is_active' => true,
            ]
        );
    }
}
