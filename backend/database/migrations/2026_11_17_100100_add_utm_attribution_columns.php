<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        foreach (['consultations', 'shop_carts', 'shop_orders'] as $tableName) {
            if (!Schema::hasTable($tableName)) {
                continue;
            }

            Schema::table($tableName, function (Blueprint $table) use ($tableName) {
                if (!Schema::hasColumn($tableName, 'utm_source')) {
                    $table->string('utm_source', 100)->nullable()->index();
                }
                if (!Schema::hasColumn($tableName, 'utm_medium')) {
                    $table->string('utm_medium', 100)->nullable();
                }
                if (!Schema::hasColumn($tableName, 'utm_campaign')) {
                    $table->string('utm_campaign', 150)->nullable()->index();
                }
                if (!Schema::hasColumn($tableName, 'utm_content')) {
                    $table->string('utm_content', 150)->nullable();
                }
                if (!Schema::hasColumn($tableName, 'utm_term')) {
                    $table->string('utm_term', 150)->nullable();
                }
            });
        }
    }

    public function down(): void
    {
        foreach (['consultations', 'shop_carts', 'shop_orders'] as $tableName) {
            if (!Schema::hasTable($tableName)) {
                continue;
            }

            Schema::table($tableName, function (Blueprint $table) use ($tableName) {
                foreach (['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as $col) {
                    if (Schema::hasColumn($tableName, $col)) {
                        $table->dropColumn($col);
                    }
                }
            });
        }
    }
};
