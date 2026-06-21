<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('collections', function (Blueprint $t) {
            $t->id();
            $t->string('name');
            $t->string('slug')->unique();
            $t->text('description')->nullable();
            $t->timestamps();
        });

        Schema::table('items', function (Blueprint $t) {
            $t->foreignId('collection_id')->nullable()->after('type_id')
                ->constrained('collections')->nullOnDelete();
        });

        Schema::create('furniture_variants', function (Blueprint $t) {
            $t->id();
            $t->foreignId('item_id')->constrained('items')->cascadeOnDelete();
            $t->string('variant_name');
            $t->string('category')->default('fabric'); // fabric|leather|wood|metal|marble|other
            $t->string('color_name')->nullable();
            $t->string('material_name')->nullable();
            $t->string('preview_image')->nullable();
            $t->text('description')->nullable();
            $t->integer('sort_order')->default(0);
            $t->boolean('is_active')->default(true);
            $t->timestamps();
            $t->index(['item_id', 'category']);
        });

        Schema::create('furniture_gallery', function (Blueprint $t) {
            $t->id();
            $t->foreignId('item_id')->constrained('items')->cascadeOnDelete();
            $t->foreignId('variant_id')->nullable()->constrained('furniture_variants')->nullOnDelete();
            $t->string('image');
            $t->string('title')->nullable();
            $t->string('alt_text')->nullable();
            $t->integer('sort_order')->default(0);
            $t->timestamps();
            $t->index('item_id');
        });

        Schema::create('furniture_lifestyle', function (Blueprint $t) {
            $t->id();
            $t->foreignId('item_id')->constrained('items')->cascadeOnDelete();
            $t->string('image');
            $t->text('caption')->nullable();
            $t->string('layout_type')->default('full'); // full|half|masonry|custom
            $t->unsignedSmallInteger('width_percentage')->default(100);
            $t->integer('sort_order')->default(0);
            $t->timestamps();
            $t->index('item_id');
        });

        Schema::create('furniture_stories', function (Blueprint $t) {
            $t->id();
            $t->foreignId('item_id')->unique()->constrained('items')->cascadeOnDelete();
            $t->string('title')->nullable();
            $t->text('description')->nullable();
            $t->string('feature_image')->nullable();
            $t->timestamps();
        });

        Schema::create('furniture_story_cards', function (Blueprint $t) {
            $t->id();
            $t->foreignId('story_id')->constrained('furniture_stories')->cascadeOnDelete();
            $t->string('title');
            $t->text('description')->nullable();
            $t->string('icon')->nullable();
            $t->integer('sort_order')->default(0);
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('furniture_story_cards');
        Schema::dropIfExists('furniture_stories');
        Schema::dropIfExists('furniture_lifestyle');
        Schema::dropIfExists('furniture_gallery');
        Schema::dropIfExists('furniture_variants');
        Schema::table('items', function (Blueprint $t) {
            $t->dropConstrainedForeignId('collection_id');
        });
        Schema::dropIfExists('collections');
    }
};
