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
        Schema::create('catalogs', function (Blueprint $table) {
    $table->id();
    $table->string('title')->unique();
    $table->string('slug')->unique();
    $table->string('category'); // living-rooms, dining-rooms, etc
    $table->string('taxonomy');  // Modern, Minimalist, Luxury, etc
    $table->text('description');
    $table->string('cover_image')->nullable();
    $table->boolean('featured')->default(false);
    $table->timestamps();
    $table->softDeletes(); // soft delete
    
    $table->index('category');
    $table->index('taxonomy');
    $table->index('featured');
});
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('catalogs');
    }
};
