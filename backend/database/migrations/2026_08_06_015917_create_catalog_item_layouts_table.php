<?php
// database/migrations/2026_08_06_000000_create_catalog_item_layouts_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('catalog_item_layouts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('catalog_id')->constrained()->cascadeOnDelete();
            $table->string('item_slug');
            $table->unsignedInteger('pos_x')->default(0);
            $table->unsignedInteger('pos_y')->default(0);
            $table->unsignedInteger('width')->default(1);
            $table->unsignedInteger('height')->default(1);
            $table->timestamps();

            $table->unique(['catalog_id', 'item_slug']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('catalog_item_layouts');
    }
};