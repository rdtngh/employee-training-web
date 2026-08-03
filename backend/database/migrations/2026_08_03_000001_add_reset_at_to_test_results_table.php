<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('test_results', 'reset_at')) {
            Schema::table('test_results', function (Blueprint $table) {
                $table->timestamp('reset_at')
                    ->nullable()
                    ->after('excluded_from_top_scores_at');
            });
        }

        $this->ensureIndex('test_results', 'test_results_user_id_index', ['user_id']);
        $this->ensureIndex('test_results', 'test_results_test_id_index', ['test_id']);

        if ($this->hasIndex('test_results', 'user_test_unique')) {
            Schema::table('test_results', function (Blueprint $table) {
                $table->dropUnique('user_test_unique');
            });
        }
    }

    public function down(): void
    {
        if (! $this->hasIndex('test_results', 'user_test_unique')) {
            Schema::table('test_results', function (Blueprint $table) {
                $table->unique(['user_id', 'test_id'], 'user_test_unique');
            });
        }

        if (Schema::hasColumn('test_results', 'reset_at')) {
            Schema::table('test_results', function (Blueprint $table) {
                $table->dropColumn('reset_at');
            });
        }
    }

    private function ensureIndex(string $tableName, string $indexName, array $columns): void
    {
        if ($this->hasIndex($tableName, $indexName)) {
            return;
        }

        Schema::table($tableName, function (Blueprint $table) use ($indexName, $columns) {
            $table->index($columns, $indexName);
        });
    }

    private function hasIndex(string $tableName, string $indexName): bool
    {
        $connection = DB::connection();
        $driver = $connection->getDriverName();

        if ($driver === 'mysql') {
            $database = $connection->getDatabaseName();
            $indexes = $connection->select(
                'select 1 from information_schema.statistics where table_schema = ? and table_name = ? and index_name = ? limit 1',
                [$database, $tableName, $indexName]
            );

            return ! empty($indexes);
        }

        if ($driver === 'sqlite') {
            $indexes = $connection->select("pragma index_list('{$tableName}')");

            foreach ($indexes as $index) {
                if (($index->name ?? null) === $indexName) {
                    return true;
                }
            }

            return false;
        }

        try {
            $indexes = Schema::getIndexes($tableName);

            foreach ($indexes as $index) {
                if (($index['name'] ?? null) === $indexName) {
                    return true;
                }
            }
        } catch (Throwable) {
            return false;
        }

        return false;
    }
};
