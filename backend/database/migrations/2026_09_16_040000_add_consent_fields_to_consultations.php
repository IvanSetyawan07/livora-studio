<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('consultations', function (Blueprint $table) {
            if (!Schema::hasColumn('consultations', 'terms_accepted')) {
                $table->boolean('terms_accepted')->default(false);
            }
            if (!Schema::hasColumn('consultations', 'privacy_accepted')) {
                $table->boolean('privacy_accepted')->default(false);
            }
            if (!Schema::hasColumn('consultations', 'terms_version')) {
                $table->string('terms_version', 20)->nullable();
            }
            if (!Schema::hasColumn('consultations', 'privacy_version')) {
                $table->string('privacy_version', 20)->nullable();
            }
            if (!Schema::hasColumn('consultations', 'consent_accepted_at')) {
                $table->timestamp('consent_accepted_at')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('consultations', function (Blueprint $table) {
            $table->dropColumn([
                'terms_accepted',
                'privacy_accepted',
                'terms_version',
                'privacy_version',
                'consent_accepted_at',
            ]);
        });
    }
};
