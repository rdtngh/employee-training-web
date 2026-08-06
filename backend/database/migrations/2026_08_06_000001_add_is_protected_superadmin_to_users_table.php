<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('is_protected_superadmin')->default(false)->after('is_active');
        });

        $superAdminRoleId = DB::table('roles')
            ->where('name', 'Super Admin')
            ->value('id');

        if ($superAdminRoleId) {
            DB::table('users')
                ->whereRaw('LOWER(employee_number) = ?', ['rennysarah'])
                ->update([
                    'role_id' => $superAdminRoleId,
                    'position' => 'Super Admin',
                    'is_active' => true,
                    'is_protected_superadmin' => true,
                ]);
        }

        $adminRoleId = DB::table('roles')
            ->where('name', 'Admin')
            ->value('id');

        if ($adminRoleId) {
            DB::table('users')
                ->whereRaw('LOWER(employee_number) = ?', ['amminnainggolan'])
                ->update([
                    'role_id' => $adminRoleId,
                    'position' => 'Admin',
                    'is_protected_superadmin' => false,
                ]);
        }
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('is_protected_superadmin');
        });
    }
};
