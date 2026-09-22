<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('consultations', function (Blueprint $table) {
            $table->string('agreement_pdf_url')->nullable()->after('status');
            $table->timestamp('user_signed_at')->nullable()->after('agreement_pdf_url');
            $table->timestamp('admin_signed_at')->nullable()->after('user_signed_at');
            $table->enum('emeterai_status', ['pending', 'processing', 'success', 'failed'])->nullable()->after('admin_signed_at');
        });
    }

    public function down()
    {
        Schema::table('consultations', function (Blueprint $table) {
            $table->dropColumn(['agreement_pdf_url', 'user_signed_at', 'admin_signed_at', 'emeterai_status']);
        });
    }
};