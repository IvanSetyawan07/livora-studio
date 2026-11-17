<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('ai_content_drafts')) {
            Schema::create('ai_content_drafts', function (Blueprint $table) {
                $table->id();
                $table->foreignId('recommendation_id')->nullable()->constrained('ai_recommendations')->nullOnDelete();
                $table->unsignedBigInteger('marketing_campaign_id')->nullable()->index();
                $table->string('title');
                $table->string('channel', 40)->default('instagram')->index(); // instagram|facebook|email|tiktok|youtube|website
                $table->string('headline', 255)->nullable();
                $table->text('caption')->nullable();
                $table->longText('body')->nullable();
                $table->string('media_url', 500)->nullable();
                $table->string('cta_label', 80)->nullable();
                $table->string('cta_url', 500)->nullable();
                $table->string('target_type', 40)->nullable(); // item|project|promo_banner
                $table->unsignedBigInteger('target_id')->nullable();
                $table->string('status', 30)->default('needs_review')->index(); // needs_review|approved|scheduled|published|draft
                $table->timestamp('scheduled_for')->nullable();
                $table->timestamp('published_at')->nullable();
                $table->string('external_id', 120)->nullable();
                $table->json('meta')->nullable();
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_content_drafts');
    }
};
