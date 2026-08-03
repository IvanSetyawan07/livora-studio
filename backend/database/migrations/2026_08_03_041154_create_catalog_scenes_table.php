<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('catalog_scenes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('catalog_id')->constrained()->onDelete('cascade');
            $table->string('scene_key');
            $table->string('image');
            $table->string('alt')->nullable();
            $table->unsignedInteger('order')->default(0);
            $table->timestamps();

            $table->unique(['catalog_id', 'scene_key']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('catalog_scenes');
    }
};