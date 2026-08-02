<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Data rincian internal (admin-only) untuk setiap item furniture.
 * Dipakai oleh halaman Admin > Item Detail yang dibuka lewat QR scanner admin.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('items', function (Blueprint $table) {
            if (!Schema::hasColumn('items', 'stock'))            $table->integer('stock')->nullable();
            if (!Schema::hasColumn('items', 'price'))            $table->decimal('price', 14, 2)->nullable();
            if (!Schema::hasColumn('items', 'weight_kg'))        $table->decimal('weight_kg', 8, 2)->nullable();
            if (!Schema::hasColumn('items', 'width_cm'))         $table->decimal('width_cm', 8, 2)->nullable();
            if (!Schema::hasColumn('items', 'depth_cm'))         $table->decimal('depth_cm', 8, 2)->nullable();
            if (!Schema::hasColumn('items', 'height_cm'))        $table->decimal('height_cm', 8, 2)->nullable();
            if (!Schema::hasColumn('items', 'material_detail'))  $table->text('material_detail')->nullable();
            if (!Schema::hasColumn('items', 'warehouse_note'))   $table->text('warehouse_note')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('items', function (Blueprint $table) {
            $table->dropColumn([
                'stock', 'price', 'weight_kg', 'width_cm', 'depth_cm',
                'height_cm', 'material_detail', 'warehouse_note',
            ]);
        });
    }
};
