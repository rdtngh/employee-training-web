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
            $table->boolean('is_testing_certificate')->default(false)->after('is_active');
        });

        DB::table('trainings')
            ->whereRaw('LOWER(title) = ?', ['pelatihan sosialisasi pendidikan dalam pelayanan'])
            ->update(['is_testing_certificate' => true]);
    }

    public function down(): void
    {
        Schema::table('trainings', function (Blueprint $table) {
            $table->dropColumn('is_testing_certificate');
        });
    }
};
