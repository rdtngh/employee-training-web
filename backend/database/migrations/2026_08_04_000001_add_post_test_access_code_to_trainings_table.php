<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('trainings', function (Blueprint $table) {
            $table->string('post_test_access_code_hash')->nullable()->after('is_active');
            $table->timestamp('post_test_access_code_updated_at')->nullable()->after('post_test_access_code_hash');
        });

        Schema::create('post_test_accesses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('training_id')->constrained()->cascadeOnDelete();
            $table->timestamp('verified_at');
            $table->timestamps();

            $table->unique(['user_id', 'training_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('post_test_accesses');

        Schema::table('trainings', function (Blueprint $table) {
            $table->dropColumn([
                'post_test_access_code_hash',
                'post_test_access_code_updated_at',
            ]);
        });
    }
};
