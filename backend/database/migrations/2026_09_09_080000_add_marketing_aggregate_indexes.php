<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Index untuk kolom yang dipakai filter/groupBy di query agregat berat
 * (DashboardMetricsService, LeadsController::funnel, dashboard AI Marketing).
 * Tanpa ini setiap pemuatan Overview memaksa full table scan.
 */
return new class extends Migration
{
    /** @var array<string, string> */
    private array $targets = [
        'item_clicks' => 'clicked_at',
        'consultations' => 'created_at',
        'wishlists' => 'created_at',
        'ai_recommendations' => 'status',
        'ai_campaigns' => 'status',
    ];

    public function up(): void
    {
        foreach ($this->targets as $table => $column) {
            if (! Schema::hasTable($table) || ! Schema::hasColumn($table, $column)) {
                continue;
            }

            $index = "{$table}_{$column}_idx";

            Schema::table($table, function (Blueprint $t) use ($column, $index) {
                $t->index($column, $index);
            });
        }
    }

    public function down(): void
    {
        foreach ($this->targets as $table => $column) {
            if (! Schema::hasTable($table)) {
                continue;
            }

            Schema::table($table, function (Blueprint $t) use ($table, $column) {
                $t->dropIndex("{$table}_{$column}_idx");
            });
        }
    }
};
