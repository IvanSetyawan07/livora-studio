<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Kolom meta SEO yang benar-benar dipakai (dirender <Helmet> di frontend dan
 * ditulis otomatis oleh OnPageActionExecutor). Sengaja nullable: kalau kosong,
 * frontend fallback ke title/description biasa.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('items', function (Blueprint $table) {
            $table->string('meta_title')->nullable()->after('description');
            $table->string('meta_description', 500)->nullable()->after('meta_title');
        });

        Schema::table('projects', function (Blueprint $table) {
            $table->string('meta_title')->nullable()->after('description');
            $table->string('meta_description', 500)->nullable()->after('meta_title');
        });
    }

    public function down(): void
    {
        Schema::table('items', function (Blueprint $table) {
            $table->dropColumn(['meta_title', 'meta_description']);
        });

        Schema::table('projects', function (Blueprint $table) {
            $table->dropColumn(['meta_title', 'meta_description']);
        });
    }
};
