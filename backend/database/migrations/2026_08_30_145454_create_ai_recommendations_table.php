<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_recommendations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('insight_id')->nullable()->constrained('ai_insights')->nullOnDelete();
            $table->string('title');
            $table->text('description');
            $table->string('action_type');
            $table->string('risk'); // low|medium|high
            $table->string('status')->default('pending'); // pending|approved|rejected|executed|failed
            $table->text('expected_impact');
            $table->unsignedTinyInteger('confidence');
            $table->string('agent_key')->index();
            $table->string('priority')->nullable(); // low|medium|high
            $table->text('why')->nullable();
            $table->text('suggested_action')->nullable();
            $table->string('change_from')->nullable();
            $table->string('change_to')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_recommendations');
    }
};