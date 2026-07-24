<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('marketing_campaigns', function (Blueprint $table) {
            $table->id();
            $table->string('campaign_name')->nullable();
            $table->string('subject');
            $table->string('section_label')->default('LIVORA JOURNAL');
            $table->string('headline');
            $table->text('body');
            $table->string('hero_image')->nullable();
            $table->string('hero_image_alt')->nullable();
            $table->string('cta_label')->nullable();
            $table->string('cta_url')->nullable();
            $table->string('signature');
            $table->enum('target', ['all', 'selected', 'segment'])->default('all');
            $table->json('user_ids')->nullable();
            $table->string('segment')->nullable();
            $table->enum('status', ['draft', 'scheduled', 'sent'])->default('draft');
            $table->timestamp('scheduled_at')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->unsignedInteger('sent_count')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('marketing_campaigns');
    }
};