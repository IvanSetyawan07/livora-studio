<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Jejak rollback: {before: {...}, after: {...}} untuk eksekusi yang menulis ke database. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ai_activity_log', function (Blueprint $table) {
            $table->json('payload')->nullable()->after('message');
        });
    }

    public function down(): void
    {
        Schema::table('ai_activity_log', function (Blueprint $table) {
            $table->dropColumn('payload');
        });
    }
};
