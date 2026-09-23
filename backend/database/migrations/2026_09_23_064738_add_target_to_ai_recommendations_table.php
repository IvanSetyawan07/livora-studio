<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Target konkret sebuah rekomendasi (record apa yang akan diubah).
 * Sengaja soft reference (tanpa FK) karena target bisa items ATAU projects.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ai_recommendations', function (Blueprint $table) {
            $table->string('target_type')->nullable()->after('action_type'); // item|project
            $table->unsignedBigInteger('target_id')->nullable()->after('target_type');
            $table->index(['target_type', 'target_id']);
        });
    }

    public function down(): void
    {
        Schema::table('ai_recommendations', function (Blueprint $table) {
            $table->dropIndex(['target_type', 'target_id']);
            $table->dropColumn(['target_type', 'target_id']);
        });
    }
};
