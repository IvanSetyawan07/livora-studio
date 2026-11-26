<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('furniture_types') && !Schema::hasColumn('furniture_types', 'image')) {
            Schema::table('furniture_types', function (Blueprint $table) {
                $table->text('image')->nullable()->after('slug');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('furniture_types') && Schema::hasColumn('furniture_types', 'image')) {
            Schema::table('furniture_types', function (Blueprint $table) {
                $table->dropColumn('image');
            });
        }
    }
};
