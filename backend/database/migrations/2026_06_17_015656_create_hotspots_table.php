<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('hotspots', function (Blueprint $table) {
    $table->id();
    $table->foreignId('catalog_id')->constrained()->onDelete('cascade');
    $table->string('scene_number');  // scene-1, scene-2
    $table->string('label');          // Lounge Chair, Side Table, etc
    $table->decimal('x', 5, 2);      // 28.5 (percentage)
    $table->decimal('y', 5, 2);      // 55.0 (percentage)
    $table->string('item_slug')->nullable(); // reference ke items table
    $table->text('description')->nullable();
    $table->string('image')->nullable(); // preview image
    $table->timestamps();
    
    $table->unique(['catalog_id', 'scene_number', 'label']);
    $table->index(['catalog_id', 'scene_number']);
    $table->foreign('item_slug')->references('slug')->on('items')->onDelete('set null');
});
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('hotspots');
    }
};
