<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_approvals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('recommendation_id')->constrained('ai_recommendations')->cascadeOnDelete();
            $table->string('title');
            $table->text('summary');
            $table->string('agent_key')->index();
            $table->string('risk');
            $table->string('status')->default('pending'); // pending|approved|rejected|executed|failed
            $table->timestamp('requested_at');
            $table->string('decided_by')->nullable();
            $table->timestamp('decided_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_approvals');
    }
};