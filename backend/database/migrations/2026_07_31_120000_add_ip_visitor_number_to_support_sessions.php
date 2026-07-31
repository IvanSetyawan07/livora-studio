<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('support_sessions', function (Blueprint $table) {
            $table->string('ip_address', 45)->nullable()->after('email');
            $table->unsignedInteger('visitor_number')->nullable()->after('ip_address');
        });
    }

    public function down(): void
    {
        Schema::table('support_sessions', function (Blueprint $table) {
            $table->dropColumn(['ip_address', 'visitor_number']);
        });
    }
};
