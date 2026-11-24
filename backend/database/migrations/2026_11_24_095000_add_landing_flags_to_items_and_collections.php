<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('items', 'is_new_arrival')) {
            Schema::table('items', function (Blueprint $table) {
                $table->boolean('is_new_arrival')->default(false)->after('is_on_promo')->index();
            });
        }

        if (!Schema::hasColumn('collections', 'is_featured')) {
            Schema::table('collections', function (Blueprint $table) {
                $table->boolean('is_featured')->default(false)->after('status')->index();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('items', 'is_new_arrival')) {
            Schema::table('items', function (Blueprint $table) {
                $table->dropColumn('is_new_arrival');
            });
        }

        if (Schema::hasColumn('collections', 'is_featured')) {
            Schema::table('collections', function (Blueprint $table) {
                $table->dropColumn('is_featured');
            });
        }
    }
};
