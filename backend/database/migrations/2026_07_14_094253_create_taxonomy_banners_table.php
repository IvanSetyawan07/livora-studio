<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('taxonomy_banners', function (Blueprint $table) {
            $table->id();
            $table->string('taxonomy_key');
            $table->text('image');
            $table->string('path')->nullable();
            $table->string('title')->nullable();
            $table->integer('position')->default(0);
            $table->timestamps();
            $table->index('taxonomy_key');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('taxonomy_banners');
    }
};
