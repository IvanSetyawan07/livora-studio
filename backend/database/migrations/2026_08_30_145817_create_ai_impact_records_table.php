<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_impact_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('recommendation_id')->nullable()->constrained('ai_recommendations')->nullOnDelete();
            $table->string('title');
            $table->string('agent_key')->index();
            $table->timestamp('approved_at');
            $table->string('metric_label');
            $table->string('before_value');
            $table->json('after'); // {7: "...", 14: "...", 30: "..."}
            $table->json('change_pct'); // {7: n, 14: n, 30: n}
            $table->string('result'); // positive|negative|neutral|monitoring
            $table->text('ai_conclusion');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_impact_records');
    }
};