<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('consultations', function (Blueprint $table) {
            $table->text('rejection_reason')->nullable()->after('admin_notes');
            $table->decimal('dp_amount', 14, 2)->nullable()->after('rejection_reason');
            $table->timestamp('dp_paid_at')->nullable()->after('dp_amount');
            $table->timestamp('agreement_signed_at')->nullable()->after('dp_paid_at');
            $table->string('agreement_signature_name')->nullable()->after('agreement_signed_at');
            $table->unsignedTinyInteger('project_progress')->default(0)->after('agreement_signature_name');
        });

        Schema::create('consultation_stage_files', function (Blueprint $table) {
            $table->id();
            $table->foreignId('consultation_id')->constrained('consultations')->cascadeOnDelete();
            $table->string('stage');                // e.g. dp_pending, project_paid, project_running
            $table->string('kind');                 // invoice | payment_proof | agreement | signed_agreement | progress_photo | other
            $table->string('file_path');
            $table->text('note')->nullable();
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('created_at')->useCurrent();
            $table->index(['consultation_id', 'stage']);
        });

        Schema::create('consultation_progress_updates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('consultation_id')->constrained('consultations')->cascadeOnDelete();
            $table->unsignedTinyInteger('percentage');
            $table->text('note')->nullable();
            $table->json('photos')->nullable(); // array of file paths
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('created_at')->useCurrent();
            $table->index('consultation_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('consultation_progress_updates');
        Schema::dropIfExists('consultation_stage_files');

        Schema::table('consultations', function (Blueprint $table) {
            $table->dropColumn([
                'rejection_reason',
                'dp_amount',
                'dp_paid_at',
                'agreement_signed_at',
                'agreement_signature_name',
                'project_progress',
            ]);
        });
    }
};
