<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('catalogs', function (Blueprint $table) {
            // Add new fields after title
            $table->string('tagline')->nullable()->after('title');
            $table->string('about_title')->nullable()->after('tagline');
            
            // Update description column to be nullable
            // (in case old migration made it required)
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('catalogs', function (Blueprint $table) {
            $table->dropColumn(['tagline', 'about_title']);
        });
    }
};