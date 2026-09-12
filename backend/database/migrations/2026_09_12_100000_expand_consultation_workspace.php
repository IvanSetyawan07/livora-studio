<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('consultations', function (Blueprint $table) {
            $table->string('meeting_type', 32)->nullable()->after('meeting_link');
            $table->decimal('final_payment_amount', 14, 2)->nullable()->after('dp_paid_at');
            $table->timestamp('final_payment_requested_at')->nullable()->after('final_payment_amount');
            $table->timestamp('final_payment_paid_at')->nullable()->after('final_payment_requested_at');
            $table->string('agreement_signature_path')->nullable()->after('agreement_signature_name');
            $table->string('agreement_document_path')->nullable()->after('agreement_signature_path');
            $table->string('agreement_document_hash', 64)->nullable()->after('agreement_document_path');
            $table->string('agreement_signer_ip', 64)->nullable()->after('agreement_document_hash');
            $table->text('agreement_signer_device')->nullable()->after('agreement_signer_ip');
            $table->timestamp('livora_countersigned_at')->nullable()->after('agreement_signer_device');
            $table->string('livora_countersigner_name')->nullable()->after('livora_countersigned_at');
            $table->string('livora_signature_path')->nullable()->after('livora_countersigner_name');
            $table->string('final_agreement_path')->nullable()->after('livora_signature_path');
            $table->string('meterai_status', 24)->default('not_requested')->after('final_agreement_path');
            $table->string('meterai_reference')->nullable()->after('meterai_status');
            $table->text('meterai_error')->nullable()->after('meterai_reference');
            $table->timestamp('meterai_completed_at')->nullable()->after('meterai_error');
            $table->index(['status', 'project_progress']);
        });

        Schema::table('consultation_stage_files', function (Blueprint $table) {
            $table->string('review_status', 24)->nullable()->after('file_path');
            $table->foreignId('reviewed_by')->nullable()->after('uploaded_by')->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable()->after('reviewed_by');
            $table->text('rejection_reason')->nullable()->after('reviewed_at');
            $table->index(['consultation_id', 'kind', 'review_status'], 'consultation_files_review_idx');
        });

        Schema::create('consultation_activities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('consultation_id')->constrained('consultations')->cascadeOnDelete();
            $table->string('audience', 16)->default('both');
            $table->string('type', 64);
            $table->string('title');
            $table->text('body')->nullable();
            $table->json('data')->nullable();
            $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('user_read_at')->nullable();
            $table->timestamp('admin_read_at')->nullable();
            $table->timestamps();
            $table->index(['consultation_id', 'created_at']);
            $table->index(['audience', 'user_read_at']);
            $table->index(['audience', 'admin_read_at']);
        });

        Schema::create('consultation_progress_comments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('progress_update_id')->constrained('consultation_progress_updates')->cascadeOnDelete();
            $table->foreignId('consultation_id')->constrained('consultations')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('author_type', 16);
            $table->text('body');
            $table->timestamps();
            $table->index(['consultation_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('consultation_progress_comments');
        Schema::dropIfExists('consultation_activities');

        Schema::table('consultation_stage_files', function (Blueprint $table) {
            $table->dropIndex('consultation_files_review_idx');
            $table->dropConstrainedForeignId('reviewed_by');
            $table->dropColumn(['review_status', 'reviewed_at', 'rejection_reason']);
        });

        Schema::table('consultations', function (Blueprint $table) {
            $table->dropIndex(['status', 'project_progress']);
            $table->dropColumn([
                'meeting_type', 'final_payment_amount', 'final_payment_requested_at',
                'final_payment_paid_at', 'agreement_signature_path', 'agreement_document_path',
                'agreement_document_hash', 'agreement_signer_ip', 'agreement_signer_device',
                'livora_countersigned_at', 'livora_countersigner_name', 'livora_signature_path',
                'final_agreement_path', 'meterai_status', 'meterai_reference', 'meterai_error',
                'meterai_completed_at',
            ]);
        });
    }
};