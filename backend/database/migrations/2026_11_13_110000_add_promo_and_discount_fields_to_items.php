<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('items', function (Blueprint $table) {
            if (!Schema::hasColumn('items', 'original_price')) {
                $table->decimal('original_price', 14, 2)->nullable()->after('price');
            }
            if (!Schema::hasColumn('items', 'discount_type')) {
                $table->string('discount_type', 20)->nullable()->after('original_price'); // PERCENTAGE | FIXED_AMOUNT
            }
            if (!Schema::hasColumn('items', 'discount_value')) {
                $table->decimal('discount_value', 14, 2)->default(0)->after('discount_type');
            }
            if (!Schema::hasColumn('items', 'final_price')) {
                $table->decimal('final_price', 14, 2)->nullable()->after('discount_value');
            }
            if (!Schema::hasColumn('items', 'is_on_promo')) {
                $table->boolean('is_on_promo')->default(false)->after('final_price');
            }
            if (!Schema::hasColumn('items', 'promo_badge_text')) {
                $table->string('promo_badge_text', 100)->nullable()->after('is_on_promo');
            }
            if (!Schema::hasColumn('items', 'promo_start_date')) {
                $table->dateTime('promo_start_date')->nullable()->after('promo_badge_text');
            }
            if (!Schema::hasColumn('items', 'promo_end_date')) {
                $table->dateTime('promo_end_date')->nullable()->after('promo_start_date');
            }
        });
    }

    public function down(): void
    {
        Schema::table('items', function (Blueprint $table) {
            $table->dropColumn([
                'original_price',
                'discount_type',
                'discount_value',
                'final_price',
                'is_on_promo',
                'promo_badge_text',
                'promo_start_date',
                'promo_end_date',
            ]);
        });
    }
};
