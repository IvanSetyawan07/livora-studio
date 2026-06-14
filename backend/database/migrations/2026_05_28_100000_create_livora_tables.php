<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('scopes', function (Blueprint $t) {
            $t->id();
            $t->string('name');
            $t->string('slug')->unique();
            $t->timestamps();
        });

        Schema::create('furniture_types', function (Blueprint $t) {
            $t->id();
            $t->string('name');
            $t->string('slug')->unique();
            $t->timestamps();
        });

        Schema::create('themes', function (Blueprint $t) {
            $t->id();
            $t->string('name');
            $t->string('slug')->unique();
            $t->timestamps();
        });

        Schema::create('categories', function (Blueprint $t) {
            $t->id();
            $t->string('name');
            $t->string('slug')->unique();
            $t->timestamps();
        });

        Schema::create('projects', function (Blueprint $t) {
            $t->id();
            $t->string('title');
            $t->string('slug')->unique();
            $t->string('subtitle')->nullable();    // mis. "Batam"
            $t->text('description')->nullable();
            $t->string('location')->nullable();
            $t->string('year')->nullable();
            $t->string('hero_image')->nullable();
            $t->foreignId('scope_id')->nullable()->constrained('scopes')->nullOnDelete();
            $t->boolean('is_highlighted')->default(false);
            $t->integer('sort_order')->default(0);
            $t->timestamps();
        });

        Schema::create('project_photos', function (Blueprint $t) {
            $t->id();
            $t->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
            $t->string('title')->nullable();      // "Lobby", "Lounge", etc.
            $t->string('image');
            $t->text('caption')->nullable();
            $t->integer('sort_order')->default(0);
            $t->timestamps();
        });

        Schema::create('items', function (Blueprint $t) {
            $t->id();
            $t->foreignId('type_id')->nullable()->constrained('furniture_types')->nullOnDelete();
            $t->string('title');
            $t->string('slug')->unique();
            $t->string('code')->nullable();
            $t->string('texture')->nullable();
            $t->string('finish')->nullable();
            $t->string('availability')->default('available');
            $t->string('image')->nullable();
            $t->text('description')->nullable();
            $t->timestamps();
        });

        Schema::create('item_theme', function (Blueprint $t) {
            $t->id();
            $t->foreignId('item_id')->constrained('items')->cascadeOnDelete();
            $t->foreignId('theme_id')->constrained('themes')->cascadeOnDelete();
            $t->unique(['item_id', 'theme_id']);
        });

        Schema::create('category_item', function (Blueprint $t) {
            $t->id();
            $t->foreignId('item_id')->constrained('items')->cascadeOnDelete();
            $t->foreignId('category_id')->constrained('categories')->cascadeOnDelete();
            $t->unique(['item_id', 'category_id']);
        });

        Schema::create('photo_items', function (Blueprint $t) {
            $t->id();
            $t->foreignId('project_photo_id')->constrained('project_photos')->cascadeOnDelete();
            $t->foreignId('item_id')->constrained('items')->cascadeOnDelete();
            $t->unique(['project_photo_id', 'item_id']);
        });

        Schema::create('item_views', function (Blueprint $t) {
            $t->id();
            $t->string('target_type'); // 'item' | 'project'
            $t->unsignedBigInteger('target_id');
            $t->unsignedBigInteger('user_id')->nullable();
            $t->integer('duration_seconds')->default(0);
            $t->timestamp('viewed_at')->useCurrent();
            $t->index(['target_type', 'target_id']);
        });

        Schema::create('item_clicks', function (Blueprint $t) {
            $t->id();
            $t->string('target_type'); // 'item' | 'project'
            $t->unsignedBigInteger('target_id');
            $t->unsignedBigInteger('user_id')->nullable();
            $t->timestamp('clicked_at')->useCurrent();
            $t->index(['target_type', 'target_id']);
        });

        // Track last activity for "active user" counter
        Schema::table('furniture_types', fn(Blueprint $t) => $t->string('image')->nullable());
    }

    public function down(): void
    {
        Schema::table('users', fn(Blueprint $t) => $t->dropColumn('last_seen_at'));
        Schema::dropIfExists('item_clicks');
        Schema::dropIfExists('item_views');
        Schema::dropIfExists('photo_items');
        Schema::dropIfExists('category_item');
        Schema::dropIfExists('item_theme');
        Schema::dropIfExists('items');
        Schema::dropIfExists('project_photos');
        Schema::dropIfExists('projects');
        Schema::dropIfExists('categories');
        Schema::dropIfExists('themes');
        Schema::dropIfExists('furniture_types');
        Schema::dropIfExists('scopes');
    }
};
