<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('consultation_messages', function (Blueprint $table) {
            $table->string('attachment_url')->nullable()->after('meeting_link');
            $table->string('attachment_type', 50)->nullable()->after('attachment_url');
            $table->string('attachment_name')->nullable()->after('attachment_type');
        });
    }

    public function down(): void
    {
        Schema::table('consultation_messages', function (Blueprint $table) {
            $table->dropColumn(['attachment_url', 'attachment_type', 'attachment_name']);
        });
    }
};
