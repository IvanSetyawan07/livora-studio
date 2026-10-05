<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tahap 3–4 sistem pesanan: review MTO + SLA, produksi, pengiriman & BAST,
 * klaim/garansi, refund, change order, inbox handoff WhatsApp, observabilitas
 * (log webhook, antrean pesan gagal), funnel, dan tautan ke Proyek.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('shop_orders', function (Blueprint $t) {
            if (!Schema::hasColumn('shop_orders', 'sla_due_at')) $t->timestamp('sla_due_at')->nullable();
            if (!Schema::hasColumn('shop_orders', 'spec_reviewed_by')) $t->foreignId('spec_reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            if (!Schema::hasColumn('shop_orders', 'spec_approved_at')) $t->timestamp('spec_approved_at')->nullable();
            if (!Schema::hasColumn('shop_orders', 'spec_revised')) $t->boolean('spec_revised')->default(false);
            if (!Schema::hasColumn('shop_orders', 'production_started_at')) $t->timestamp('production_started_at')->nullable();
            if (!Schema::hasColumn('shop_orders', 'project_id')) $t->unsignedBigInteger('project_id')->nullable()->index();
        });

        Schema::create('shop_deliveries', function (Blueprint $t) {
            $t->id();
            $t->foreignId('order_id')->constrained('shop_orders')->cascadeOnDelete();
            $t->date('scheduled_date')->nullable();
            $t->string('courier', 80)->nullable();
            $t->string('tracking_number', 80)->nullable();
            $t->json('bast_photos')->nullable();          // path privat
            $t->string('bast_signature_path')->nullable(); // foto tanda terima / TTD
            $t->string('receiver_name', 120)->nullable();
            $t->timestamp('received_at')->nullable();
            $t->text('notes')->nullable();
            $t->timestamps();
        });

        Schema::create('shop_claims', function (Blueprint $t) {
            $t->id();
            $t->foreignId('order_id')->constrained('shop_orders')->cascadeOnDelete();
            $t->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $t->string('type', 30);            // kerusakan|salah_ukuran|garansi|lainnya
            $t->text('description');
            $t->json('photos')->nullable();
            $t->string('status', 20)->default('diajukan'); // diajukan|ditinjau|disetujui|ditolak|selesai
            $t->text('resolution')->nullable();
            $t->foreignId('handled_by')->nullable()->constrained('users')->nullOnDelete();
            $t->timestamps();
        });

        Schema::create('shop_refunds', function (Blueprint $t) {
            $t->id();
            $t->foreignId('order_id')->constrained('shop_orders')->cascadeOnDelete();
            $t->foreignId('payment_id')->nullable()->constrained('shop_payments')->nullOnDelete();
            $t->bigInteger('amount')->default(0);
            $t->text('reason');
            $t->string('status', 20)->default('diajukan'); // diajukan|disetujui|dikirim|selesai|ditolak
            $t->string('bank_name', 60)->nullable();
            $t->text('account_number')->nullable();        // terenkripsi (Crypt)
            $t->string('account_holder', 120)->nullable();
            $t->string('transfer_proof_path')->nullable();
            $t->text('admin_note')->nullable();
            $t->foreignId('requested_by')->nullable()->constrained('users')->nullOnDelete();
            $t->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $t->timestamp('approved_at')->nullable();
            $t->timestamp('sent_at')->nullable();
            $t->timestamps();
        });

        Schema::create('shop_order_changes', function (Blueprint $t) {
            $t->id();
            $t->foreignId('order_id')->constrained('shop_orders')->cascadeOnDelete();
            $t->text('description');
            $t->bigInteger('price_delta')->default(0);     // DPP selisih (sebelum PPN)
            $t->bigInteger('ppn')->default(0);
            $t->bigInteger('total')->default(0);
            $t->string('status', 20)->default('dikirim');  // dikirim|disetujui|ditolak|dibayar|batal
            $t->foreignId('payment_id')->nullable()->constrained('shop_payments')->nullOnDelete();
            $t->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $t->timestamp('responded_at')->nullable();
            $t->timestamps();
        });

        Schema::create('wa_sessions', function (Blueprint $t) {
            $t->id();
            $t->string('phone', 30)->unique();
            $t->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $t->foreignId('order_id')->nullable()->constrained('shop_orders')->nullOnDelete();
            $t->string('status', 20)->default('bot');      // bot|menunggu_cs|aktif|selesai
            $t->string('trigger', 40)->nullable();
            $t->unsignedTinyInteger('fail_count')->default(0);
            $t->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();
            $t->timestamp('last_inbound_at')->nullable();
            $t->timestamp('handoff_at')->nullable();
            $t->timestamps();
        });

        Schema::table('wa_messages', function (Blueprint $t) {
            if (!Schema::hasColumn('wa_messages', 'is_note')) $t->boolean('is_note')->default(false);
            if (!Schema::hasColumn('wa_messages', 'sent_by')) $t->unsignedBigInteger('sent_by')->nullable();
            if (!Schema::hasColumn('wa_messages', 'status')) $t->string('status', 20)->nullable();
        });

        Schema::create('wa_failed_messages', function (Blueprint $t) {
            $t->id();
            $t->string('phone', 30);
            $t->text('body');
            $t->unsignedBigInteger('order_id')->nullable();
            $t->text('error')->nullable();
            $t->unsignedSmallInteger('attempts')->default(1);
            $t->timestamp('resolved_at')->nullable();
            $t->timestamps();
        });

        Schema::create('webhook_logs', function (Blueprint $t) {
            $t->id();
            $t->string('source', 20)->index();             // midtrans|whatsapp
            $t->string('event_id')->nullable();
            $t->string('status', 20);                      // ok|rejected|error
            $t->text('error')->nullable();
            $t->json('payload')->nullable();
            $t->timestamp('created_at')->useCurrent()->index();
        });

        Schema::create('funnel_events', function (Blueprint $t) {
            $t->id();
            $t->string('event', 40)->index();
            $t->unsignedBigInteger('order_id')->nullable();
            $t->unsignedBigInteger('user_id')->nullable();
            $t->string('session_id', 64)->nullable();
            $t->json('meta')->nullable();
            $t->timestamp('created_at')->useCurrent()->index();
        });
    }

    public function down(): void
    {
        foreach (['funnel_events', 'webhook_logs', 'wa_failed_messages', 'wa_sessions', 'shop_order_changes', 'shop_refunds', 'shop_claims', 'shop_deliveries'] as $table) {
            Schema::dropIfExists($table);
        }
    }
};
