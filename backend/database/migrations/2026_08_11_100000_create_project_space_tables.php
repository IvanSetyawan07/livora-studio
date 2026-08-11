<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('projects', function (Blueprint $t) {
            if (!Schema::hasColumn('projects', 'hero_focus_x')) {
                $t->float('hero_focus_x')->default(50);
            }
            if (!Schema::hasColumn('projects', 'hero_focus_y')) {
                $t->float('hero_focus_y')->default(40);
            }
            if (!Schema::hasColumn('projects', 'hero_zoom')) {
                $t->float('hero_zoom')->default(100);
            }
        });

        Schema::create('project_layouts', function (Blueprint $t) {
            $t->id();
            $t->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
            $t->string('title');
            $t->string('subtitle')->nullable();
            $t->text('description')->nullable();
            $t->string('image')->nullable();
            $t->integer('sort_order')->default(0);
            $t->timestamps();
        });

        Schema::create('project_rooms', function (Blueprint $t) {
            $t->id();
            $t->foreignId('project_layout_id')->constrained('project_layouts')->cascadeOnDelete();
            $t->string('title');
            $t->string('area')->nullable();
            $t->text('description')->nullable();
            $t->json('specs')->nullable(); // [{label, value}]
            $t->string('image')->nullable();
            $t->integer('sort_order')->default(0);
            $t->timestamps();
        });

        Schema::create('project_room_hotspots', function (Blueprint $t) {
            $t->id();
            $t->foreignId('project_room_id')->constrained('project_rooms')->cascadeOnDelete();
            $t->string('label');
            $t->float('x')->default(50);
            $t->float('y')->default(50);
            $t->string('item_slug')->nullable();
            $t->text('description')->nullable();
            $t->string('image')->nullable();
            $t->integer('sort_order')->default(0);
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('project_room_hotspots');
        Schema::dropIfExists('project_rooms');
        Schema::dropIfExists('project_layouts');
        Schema::table('projects', function (Blueprint $t) {
            $t->dropColumn(['hero_focus_x', 'hero_focus_y', 'hero_zoom']);
        });
    }
};
