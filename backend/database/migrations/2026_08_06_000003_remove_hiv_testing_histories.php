<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (! DB::table('users')->exists()) {
            return;
        }

        $targetNamePrefixes = ['raditya%', 'bening apni%', 'najlatika%'];
        $users = collect();

        foreach ($targetNamePrefixes as $namePrefix) {
            $matches = DB::table('users')
                ->whereRaw('LOWER(TRIM(name)) LIKE ?', [$namePrefix])
                ->get(['id', 'name']);

            if ($matches->count() !== 1) {
                throw new RuntimeException(
                    'Pembersihan riwayat HIV dibatalkan: setiap target Raditya, Bening Apni, dan Najlatika harus ditemukan tepat satu kali.'
                );
            }

            $users->push($matches->first());
        }

        if ($users->isEmpty()) {
            return;
        }

        $trainings = DB::table('trainings')
            ->whereRaw("LOWER(title) LIKE '%hiv%'")
            ->get(['id', 'title']);

        if ($trainings->count() !== 1) {
            throw new RuntimeException(
                'Pembersihan riwayat HIV dibatalkan: pelatihan HIV tidak ditemukan secara unik.'
            );
        }

        DB::transaction(function () use ($users, $trainings) {
            $userIds = $users->pluck('id');
            $trainingIds = $trainings->pluck('id');
            $testIds = DB::table('tests')->whereIn('training_id', $trainingIds)->pluck('id');
            $questionIds = DB::table('questions')->whereIn('test_id', $testIds)->pluck('id');
            $materialIds = DB::table('materials')->whereIn('training_id', $trainingIds)->pluck('id');
            $testResultIds = DB::table('test_results')
                ->whereIn('user_id', $userIds)
                ->whereIn('test_id', $testIds)
                ->pluck('id');

            DB::table('user_answers')
                ->whereIn('user_id', $userIds)
                ->whereIn('question_id', $questionIds)
                ->delete();
            DB::table('user_materials')
                ->whereIn('user_id', $userIds)
                ->whereIn('material_id', $materialIds)
                ->delete();
            DB::table('post_test_accesses')
                ->whereIn('user_id', $userIds)
                ->whereIn('training_id', $trainingIds)
                ->delete();
            DB::table('training_participants')
                ->whereIn('user_id', $userIds)
                ->whereIn('training_id', $trainingIds)
                ->delete();
            DB::table('certificates')->whereIn('test_result_id', $testResultIds)->delete();
            DB::table('test_results')->whereIn('id', $testResultIds)->delete();
        });
    }

    public function down(): void
    {
        // Data testing yang dihapus tidak dapat direkonstruksi secara aman.
    }
};
