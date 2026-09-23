<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('consultations', function (Blueprint $table) {
            if (!Schema::hasColumn('consultations', 'agreement_content')) {
                $table->longText('agreement_content')->nullable();
            }
            if (!Schema::hasColumn('consultations', 'agreement_generated_at')) {
                $table->timestamp('agreement_generated_at')->nullable();
            }
            if (!Schema::hasColumn('consultations', 'meterai_serial')) {
                $table->string('meterai_serial')->nullable();
            }
            if (!Schema::hasColumn('consultations', 'meterai_applied_at')) {
                $table->timestamp('meterai_applied_at')->nullable();
            }
            if (!Schema::hasColumn('consultations', 'meterai_mode')) {
                $table->string('meterai_mode', 30)->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('consultations', function (Blueprint $table) {
            $table->dropColumn([
                'agreement_content',
                'agreement_generated_at',
                'meterai_serial',
                'meterai_applied_at',
                'meterai_mode',
            ]);
        });
    }
};
