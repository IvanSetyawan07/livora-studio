<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Catatan: ini BEDA dari `marketing_campaigns` (email blast yang sudah
        // ada). Ini konsep "workspace campaign" AI Marketing: channel/health/
        // goals/plan/experiment, bukan pengiriman email.
        Schema::create('ai_campaigns', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('channel');
            $table->string('health'); // Good|Fair|Needs Attention
            $table->string('status'); // Active|Paused|Draft|Ended
            $table->text('summary');
            $table->string('budget_daily')->nullable();
            $table->json('goals')->nullable();
            $table->json('plan')->nullable();
            $table->json('active_experiments')->nullable();
            $table->json('related_recommendation_ids')->nullable();
            $table->json('spark')->nullable();
            $table->json('metric')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_campaigns');
    }
};