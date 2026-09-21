<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('consultation_visits', function (Blueprint $table) {
            $table->id();
            $table->foreignId('consultation_id')->constrained('consultations')->cascadeOnDelete();
            $table->string('title');
            $table->date('visit_date')->nullable();
            $table->text('summary')->nullable();
            $table->json('photos')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->index(['consultation_id', 'visit_date']);
        });

        Schema::table('consultations', function (Blueprint $table) {
            $table->timestamp('handover_issued_at')->nullable()->after('meterai_completed_at');
            $table->timestamp('final_agreement_verified_at')->nullable()->after('handover_issued_at');
            $table->foreignId('final_agreement_verified_by')->nullable()->after('final_agreement_verified_at')
                ->constrained('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('consultations', function (Blueprint $table) {
            $table->dropConstrainedForeignId('final_agreement_verified_by');
            $table->dropColumn(['handover_issued_at', 'final_agreement_verified_at']);
        });
        Schema::dropIfExists('consultation_visits');
    }
};
