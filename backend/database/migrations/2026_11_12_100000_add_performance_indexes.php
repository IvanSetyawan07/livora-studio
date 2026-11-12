<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Index tambahan untuk mempercepat query analitik, pelacakan sesi support,
 * dan daftar pengguna aktif tanpa full table scan.
 */
return new class extends Migration
{
    /** @var array<int, array{table: string, column: string}> */
    private array $targets = [
        ['table' => 'item_views', 'column' => 'viewed_at'],
        ['table' => 'support_sessions', 'column' => 'last_message_at'],
        ['table' => 'support_sessions', 'column' => 'ip_address'],
        ['table' => 'users', 'column' => 'last_seen_at'],
    ];

    public function up(): void
    {
        foreach ($this->targets as $target) {
            $table = $target['table'];
            $column = $target['column'];

            if (! Schema::hasTable($table) || ! Schema::hasColumn($table, $column)) {
                continue;
            }

            $index = "{$table}_{$column}_idx";

            try {
                Schema::table($table, function (Blueprint $t) use ($column, $index) {
                    $t->index($column, $index);
                });
            } catch (\Throwable $e) {
                // Abaikan jika index sudah ada
            }
        }
    }

    public function down(): void
    {
        foreach ($this->targets as $target) {
            $table = $target['table'];
            $column = $target['column'];

            if (! Schema::hasTable($table)) {
                continue;
            }

            try {
                Schema::table($table, function (Blueprint $t) use ($table, $column) {
                    $t->dropIndex("{$table}_{$column}_idx");
                });
            } catch (\Throwable $e) {
                // Abaikan jika index belum ada
            }
        }
    }
};
