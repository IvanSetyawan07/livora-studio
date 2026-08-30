<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_activity_log', function (Blueprint $table) {
            $table->id();
            $table->string('actor'); // "AI", "You", nama user, dst.
            $table->string('agent_key')->nullable()->index();
            $table->text('message');
            $table->string('kind'); // analysis|insight|recommendation|approval|execution|system
            // Soft reference, sengaja tanpa FK constraint supaya log tetap
            // ada walau recommendation-nya sudah dihapus.
            $table->unsignedBigInteger('recommendation_id')->nullable()->index();
            $table->timestamp('next_review_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_activity_log');
    }
};