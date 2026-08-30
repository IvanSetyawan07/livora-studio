<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_insights', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('description');
            $table->string('type'); // opportunity|warning|trend|anomaly|recommendation|lead_intelligence
            $table->string('severity'); // low|medium|high|critical
            $table->unsignedTinyInteger('confidence'); // 0-100
            $table->json('source'); // AISource[]
            $table->string('agent_key')->index();
            $table->text('reasoning');
            $table->text('what_happened');
            $table->text('why_it_matters');
            $table->text('expected_impact');
            $table->json('metrics')->nullable(); // [{label, value, delta}]
            $table->string('analytics_href')->nullable();
            // Soft reference: recommendation dibuat dari insight ini, tapi
            // tabel ai_recommendations belum ada saat migration ini jalan,
            // jadi sengaja tanpa FK constraint (di-set lewat kode, bukan DB).
            $table->unsignedBigInteger('recommendation_id')->nullable()->index();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_insights');
    }
};