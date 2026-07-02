<?php

use Illuminate\Database\Migrations\Migration;
// use Illuminate\Database\Schema\Blueprint;
// use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
   public function up(): void
{
    // Schema::table('hotspots', function (Blueprint $table) {
    //     $table->string('scene_number')->after('catalog_id');
    //     $table->string('label')->after('scene_number');
    //     $table->decimal('x', 5, 2)->after('label');
    //     $table->decimal('y', 5, 2)->after('x');
    //     $table->string('item_slug')->nullable()->after('y');
    //     $table->text('description')->nullable()->after('item_slug');
    //     $table->string('image')->nullable()->after('description');
        
    //     $table->index(['catalog_id', 'scene_number']);
    // });
}

public function down(): void
{
    // Schema::table('hotspots', function (Blueprint $table) {
    //     $table->dropIndex(['catalog_id', 'scene_number']);
    //     $table->dropColumn(['scene_number', 'label', 'x', 'y', 'item_slug', 'description', 'image']);
    // });
}
};
