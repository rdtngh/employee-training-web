<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('trainings', function (Blueprint $table) {
            $table->boolean('is_general_orientation')->default(false)->after('is_active');
        });

        $orientation = DB::table('trainings')
            ->whereRaw('LOWER(title) = ?', ['orientasi umum'])
            ->first();

        if ($orientation) {
            DB::table('trainings')->where('id', $orientation->id)->update([
                'title' => 'Orientasi Umum',
                'is_active' => true,
                'is_general_orientation' => true,
                'updated_at' => now(),
            ]);
        } else {
            DB::table('trainings')->insert([
                'title' => 'Orientasi Umum',
                'description' => 'Orientasi umum tetap untuk karyawan baru dan mahasiswa/pelajar.',
                'is_active' => true,
                'is_general_orientation' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        Schema::table('trainings', function (Blueprint $table) {
            $table->dropColumn('is_general_orientation');
        });
    }
};
