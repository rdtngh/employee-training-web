<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $resetHivResultIds = DB::table('test_results')
            ->join('tests', 'tests.id', '=', 'test_results.test_id')
            ->join('trainings', 'trainings.id', '=', 'tests.training_id')
            ->whereNotNull('test_results.reset_at')
            ->where('tests.type', 'posttest')
            ->whereRaw("LOWER(trainings.title) LIKE '%hiv%'")
            ->pluck('test_results.id');

        DB::table('certificates')
            ->whereIn('test_result_id', $resetHivResultIds)
            ->delete();
    }

    public function down(): void
    {
        // Sertifikat lama dari hasil yang sudah di-reset tidak dipulihkan.
    }
};
