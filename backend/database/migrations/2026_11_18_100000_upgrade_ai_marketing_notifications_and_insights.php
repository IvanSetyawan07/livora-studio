<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('ai_activity_log')) {
            Schema::table('ai_activity_log', function (Blueprint $table) {
                if (! Schema::hasColumn('ai_activity_log', 'title')) {
                    $table->string('title', 180)->nullable()->after('agent_key');
                }
                if (! Schema::hasColumn('ai_activity_log', 'href')) {
                    $table->string('href', 255)->nullable()->after('recommendation_id');
                }
                if (! Schema::hasColumn('ai_activity_log', 'read_at')) {
                    $table->timestamp('read_at')->nullable()->index()->after('next_review_at');
                }
            });
        }

        if (Schema::hasTable('ai_insights')) {
            Schema::table('ai_insights', function (Blueprint $table) {
                if (! Schema::hasColumn('ai_insights', 'dismissed_at')) {
                    $table->timestamp('dismissed_at')->nullable()->index()->after('recommendation_id');
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('ai_activity_log')) {
            Schema::table('ai_activity_log', function (Blueprint $table) {
                foreach (['read_at', 'href', 'title'] as $col) {
                    if (Schema::hasColumn('ai_activity_log', $col)) {
                        $table->dropColumn($col);
                    }
                }
            });
        }

        if (Schema::hasTable('ai_insights')) {
            Schema::table('ai_insights', function (Blueprint $table) {
                if (Schema::hasColumn('ai_insights', 'dismissed_at')) {
                    $table->dropColumn('dismissed_at');
                }
            });
        }
    }
};
