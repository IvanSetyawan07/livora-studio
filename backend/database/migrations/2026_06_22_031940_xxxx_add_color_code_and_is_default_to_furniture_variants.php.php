<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('furniture_variants', function (Blueprint $table) {
            $table->string('color_code', 9)->nullable()->after('color_name'); // hex #RRGGBB
            $table->boolean('is_default')->default(false)->after('is_active');
        });
    }

    public function down(): void
    {
        Schema::table('furniture_variants', function (Blueprint $table) {
            $table->dropColumn(['color_code', 'is_default']);
        });
    }
};
