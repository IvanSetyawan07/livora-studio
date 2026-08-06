<?php
// database/migrations/2026_08_05_000000_add_ordering_to_hotspots_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('hotspots', function (Blueprint $table) {
            $table->unsignedInteger('display_order')->default(0)->after('scene_number');
            $table->boolean('is_featured')->default(false)->after('display_order');
        });
    }

    public function down(): void
    {
        Schema::table('hotspots', function (Blueprint $table) {
            $table->dropColumn(['display_order', 'is_featured']);
        });
    }
};