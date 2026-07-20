<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('consultations', function (Blueprint $table) {
            $table->id();

            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();

            // Personal information
            $table->string('first_name');
            $table->string('last_name')->nullable();
            $table->string('email');
            $table->string('phone')->nullable();

            // Consultation information
            $table->string('contact_method')->nullable();      // WhatsApp | Email | Google Meet / Video Call | Phone Call
            $table->string('consultation_type')->nullable();   // showroom | virtual | at_space
            $table->string('location')->nullable();
            $table->string('service_type')->nullable();        // Inspiration & Styling | Product Selection | Room Design | Full Interior Project
            $table->string('project_type')->nullable();        // Residential | Apartment | Villa | Hospitality | Office | Retail
            $table->string('estimated_area')->nullable();
            $table->string('preferred_style')->nullable();
            $table->text('message')->nullable();
            $table->json('attachments')->nullable();

            // Status & workflow
            $table->string('status')->default('new_inquiry');
            $table->text('admin_notes')->nullable();
            $table->foreignId('assigned_admin_id')->nullable()->constrained('users')->nullOnDelete();

            // Meeting / follow-up scheduling
            $table->date('meeting_date')->nullable();
            $table->time('meeting_time')->nullable();
            $table->string('meeting_location')->nullable();
            $table->string('meeting_link')->nullable();
            $table->date('follow_up_date')->nullable();

            $table->timestamps();

            $table->index('status');
            $table->index('email');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('consultations');
    }
};
