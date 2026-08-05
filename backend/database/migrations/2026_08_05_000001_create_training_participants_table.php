<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('training_participants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('training_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('department');
            $table->timestamps();
            $table->unique(['training_id', 'user_id']);
        });

        $pairs = collect()
            ->merge(DB::table('test_results')->join('tests', 'tests.id', '=', 'test_results.test_id')->get(['tests.training_id', 'test_results.user_id']))
            ->merge(DB::table('user_materials')->join('materials', 'materials.id', '=', 'user_materials.material_id')->get(['materials.training_id', 'user_materials.user_id']))
            ->merge(DB::table('post_test_accesses')->get(['training_id', 'user_id']))
            ->unique(fn ($pair) => $pair->training_id.'-'.$pair->user_id);

        $departments = DB::table('users')->whereIn('id', $pairs->pluck('user_id'))->pluck('department', 'id');
        $now = now();

        $pairs->each(function ($pair) use ($departments, $now) {
            DB::table('training_participants')->insertOrIgnore([
                'training_id' => $pair->training_id,
                'user_id' => $pair->user_id,
                'department' => $departments[$pair->user_id] ?? '',
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('training_participants');
    }
};
