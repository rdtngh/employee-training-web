<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('test_results', function (Blueprint $table) {
            $table->timestamp('reset_at')
                ->nullable()
                ->after('excluded_from_top_scores_at');

            $table->dropUnique('user_test_unique');
        });
    }

    public function down(): void
    {
        Schema::table('test_results', function (Blueprint $table) {
            $table->dropColumn('reset_at');
            $table->unique(['user_id', 'test_id'], 'user_test_unique');
        });
    }
};
