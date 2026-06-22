<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('furniture_variants', function (Blueprint $t) {
            $t->string('furniture_image')->nullable()->after('preview_image');
        });
    }

    public function down(): void
    {
        Schema::table('furniture_variants', function (Blueprint $t) {
            $t->dropColumn('furniture_image');
        });
    }
};
