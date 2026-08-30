<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_providers', function (Blueprint $table) {
            $table->id();
            $table->string('provider')->unique(); // anthropic, dst.
            $table->string('model');
            $table->string('status')->default('not_connected'); // connected|not_connected|degraded
            $table->unsignedInteger('latency_ms')->nullable();
            $table->decimal('success_rate', 5, 2)->nullable();
            $table->timestamps();
            // usage_share & cost sengaja TIDAK disimpan di sini — dihitung live
            // dari agregasi ai_usage_logs supaya tidak pernah basi/tidak sinkron.
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_providers');
    }
};