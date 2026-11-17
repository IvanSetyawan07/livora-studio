<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('ai_impact_records')) {
            Schema::table('ai_impact_records', function (Blueprint $table) {
                if (!Schema::hasColumn('ai_impact_records', 'metric_key')) {
                    $table->string('metric_key', 60)->nullable()->after('metric_label');
                }
                if (!Schema::hasColumn('ai_impact_records', 'target_type')) {
                    $table->string('target_type', 40)->nullable()->after('metric_key');
                }
                if (!Schema::hasColumn('ai_impact_records', 'target_id')) {
                    $table->unsignedBigInteger('target_id')->nullable()->after('target_type');
                }
                if (!Schema::hasColumn('ai_impact_records', 'before_numeric')) {
                    $table->decimal('before_numeric', 16, 4)->nullable()->after('before_value');
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('ai_impact_records')) {
            Schema::table('ai_impact_records', function (Blueprint $table) {
                foreach (['metric_key', 'target_type', 'target_id', 'before_numeric'] as $col) {
                    if (Schema::hasColumn('ai_impact_records', $col)) {
                        $table->dropColumn($col);
                    }
                }
            });
        }
    }
};
