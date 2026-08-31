<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ai_providers', function (Blueprint $table) {
            $table->unsignedInteger('rl_requests_limit')->nullable()->after('success_rate');
            $table->unsignedInteger('rl_requests_remaining')->nullable()->after('rl_requests_limit');
            $table->unsignedInteger('rl_tokens_limit')->nullable()->after('rl_requests_remaining');
            $table->unsignedInteger('rl_tokens_remaining')->nullable()->after('rl_tokens_limit');
            $table->timestamp('rl_requests_reset_at')->nullable()->after('rl_tokens_remaining');
            $table->timestamp('rl_tokens_reset_at')->nullable()->after('rl_requests_reset_at');
            // Dipakai Gemini (dan provider lain yang tidak kirim header quota)
            // supaya UI menampilkan alasan jujur, bukan diam-diam nol.
            $table->string('rl_note')->nullable()->after('rl_tokens_reset_at');
        });
    }

    public function down(): void
    {
        Schema::table('ai_providers', function (Blueprint $table) {
            $table->dropColumn([
                'rl_requests_limit', 'rl_requests_remaining',
                'rl_tokens_limit', 'rl_tokens_remaining',
                'rl_requests_reset_at', 'rl_tokens_reset_at', 'rl_note',
            ]);
        });
    }
};