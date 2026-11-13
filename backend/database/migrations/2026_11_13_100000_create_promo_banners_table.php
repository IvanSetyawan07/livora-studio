<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('promo_banners')) {
            Schema::create('promo_banners', function (Blueprint $table) {
                $table->id();
                $table->string('title');
                $table->string('subtitle')->nullable();
                $table->string('label')->nullable()->default('PROMO SPESIAL');
                $table->text('description')->nullable();
                $table->string('image_url', 500);
                $table->string('cta_text', 100)->nullable()->default('Klaim Promo');
                $table->string('cta_link', 255)->default('/promo');
                $table->integer('order_index')->default(0);
                $table->boolean('is_active')->default(true);
                $table->dateTime('start_date')->nullable();
                $table->dateTime('end_date')->nullable();
                $table->timestamps();

                $table->index(['is_active', 'order_index']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('promo_banners');
    }
};
