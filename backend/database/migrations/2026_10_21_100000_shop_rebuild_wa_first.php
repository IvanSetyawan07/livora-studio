<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * ROMBAK TOTAL sistem order furniture → alur WhatsApp-first (bot AI + admin web).
 * - Keranjang anonim berkode CRT-XXXX (pintu masuk dari web ke WA).
 * - Percakapan bot: state machine + log AI + registri template Meta.
 * - Notifikasi admin N1–N16 (dedup, per peran, batas waktu, eskalasi).
 * - Halaman bertoken (konfirmasi & pembayaran) tanpa login.
 * - Pemetaan status lama → status baru (data lama tidak hilang, nomor dokumen tetap).
 * Semua additive; tidak ada DROP. Kolom lama yang tidak dipakai lagi ditandai
 * DEPRECATED lewat komentar PHP, bukan dihapus.
 */
return new class extends Migration
{
    public function up(): void
    {
        // ===== Keranjang anonim berkode pendek =====
        Schema::create('shop_carts', function (Blueprint $t) {
            $t->id();
            $t->string('code', 12)->unique();            // CRT-4F9K
            $t->json('items');                           // [{item_id, variant_id, quantity, note, title, code}]
            $t->string('claimed_phone', 30)->nullable(); // nomor WA yang mengklaim
            $t->timestamp('claimed_at')->nullable();
            $t->foreignId('order_id')->nullable()->constrained('shop_orders')->nullOnDelete();
            $t->string('session_id', 64)->nullable();
            $t->timestamps();
            $t->index('claimed_phone');
        });

        // ===== Percakapan bot (state machine tersimpan) =====
        Schema::create('wa_conversations', function (Blueprint $t) {
            $t->id();
            $t->string('phone', 30)->unique();
            $t->string('state', 30)->default('sapaan');  // sapaan|menu|tanya_jawab|kumpul_data|konfirmasi_data|pilih_kirim|pesanan_dibuat|menunggu_penawaran
            $t->string('mode', 20)->default('bot');      // bot|menunggu_admin|dipegang_admin
            $t->foreignId('cart_id')->nullable()->constrained('shop_carts')->nullOnDelete();
            $t->foreignId('order_id')->nullable()->constrained('shop_orders')->nullOnDelete();
            $t->json('collected')->nullable();           // data pengiriman yang sudah terkumpul
            $t->string('last_intent', 40)->nullable();
            $t->unsignedTinyInteger('fail_count')->default(0);
            $t->foreignId('handled_by')->nullable()->constrained('users')->nullOnDelete();
            $t->timestamp('handled_at')->nullable();
            $t->timestamp('last_inbound_at')->nullable();
            $t->timestamp('last_outbound_at')->nullable();
            $t->timestamps();
        });

        // Kolom tambahan wa_messages untuk media & pengiriman kaya
        Schema::table('wa_messages', function (Blueprint $t) {
            if (!Schema::hasColumn('wa_messages', 'media_path')) $t->string('media_path')->nullable();
            if (!Schema::hasColumn('wa_messages', 'wa_message_id')) $t->string('wa_message_id')->nullable()->index();
            if (!Schema::hasColumn('wa_messages', 'conversation_id')) $t->unsignedBigInteger('conversation_id')->nullable()->index();
            if (!Schema::hasColumn('wa_messages', 'payload')) $t->json('payload')->nullable(); // tombol/list yang dirender
        });

        // ===== Log AI per giliran =====
        Schema::create('wa_ai_logs', function (Blueprint $t) {
            $t->id();
            $t->string('phone', 30)->index();
            $t->unsignedBigInteger('conversation_id')->nullable()->index();
            $t->text('input')->nullable();
            $t->string('intent', 40)->nullable();
            $t->string('state_before', 30)->nullable();
            $t->string('state_after', 30)->nullable();
            $t->json('tool_calls')->nullable();
            $t->text('output')->nullable();
            $t->string('model', 60)->nullable();
            $t->unsignedInteger('latency_ms')->nullable();
            $t->string('flag', 30)->default('ok');       // ok|fallback|handoff|guardrail_blocked
            $t->text('note')->nullable();                // catatan "jawaban buruk" dari admin
            $t->boolean('marked_bad')->default(false);
            $t->timestamp('created_at')->useCurrent()->index();
        });

        // ===== Registri template Meta (pesan di luar jendela 24 jam) =====
        Schema::create('wa_templates', function (Blueprint $t) {
            $t->id();
            $t->string('key', 40)->unique();             // quote_sent|pay_reminder|proof_received|paid_invoice|shipping_status|shipping_reminder|review_request
            $t->string('meta_name')->nullable();         // nama template di Meta
            $t->string('language', 10)->default('id');
            $t->string('category', 20)->default('UTILITY');
            $t->text('body');
            $t->string('status', 20)->default('draft');  // draft|pending|approved|rejected
            $t->timestamps();
        });

        // ===== Notifikasi admin N1–N16 =====
        Schema::create('admin_notifications', function (Blueprint $t) {
            $t->id();
            $t->string('event_key', 120)->unique();      // dedup: jenis+order+versi
            $t->string('type', 10);                      // N1..N16
            $t->string('kind', 20)->default('info');     // perlu_tindakan|info|sistem
            $t->string('priority', 20)->default('normal'); // mendesak|tinggi|normal
            $t->string('title');
            $t->text('body')->nullable();
            $t->string('link')->nullable();              // tautan langsung ke pesanan/chat/bukti/klaim
            $t->json('roles');                           // penerima per peran: ["cs","finance"]
            $t->unsignedBigInteger('order_id')->nullable()->index();
            $t->unsignedBigInteger('conversation_id')->nullable();
            $t->string('status', 20)->default('open')->index(); // open|done|expired
            $t->unsignedInteger('reminder_count')->default(0);
            $t->timestamp('due_at')->nullable();
            $t->timestamp('escalated_at')->nullable();
            $t->foreignId('done_by')->nullable()->constrained('users')->nullOnDelete();
            $t->timestamp('done_at')->nullable();
            $t->json('read_by')->nullable();             // {user_id: timestamp}
            $t->timestamps();
        });

        // ===== Linimasa pesanan (semua kejadian) =====
        Schema::create('shop_order_events', function (Blueprint $t) {
            $t->id();
            $t->foreignId('order_id')->constrained('shop_orders')->cascadeOnDelete();
            $t->string('event', 60)->index();            // status_change|chat|quote|payment|document|notification|admin_action
            $t->string('label');
            $t->json('meta')->nullable();
            $t->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $t->timestamp('created_at')->useCurrent()->index();
        });

        // ===== Skenario uji bot =====
        Schema::create('bot_scenarios', function (Blueprint $t) {
            $t->id();
            $t->string('name');
            $t->json('transcript');                      // [{from: 'customer'|'bot', text}]
            $t->json('expectations')->nullable();        // [{rule: 'no_price'|'handoff'|'state', value}]
            $t->boolean('active')->default(true);
            $t->timestamps();
        });

        // ===== Kolom baru pesanan =====
        Schema::table('shop_orders', function (Blueprint $t) {
            if (!Schema::hasColumn('shop_orders', 'confirm_token')) $t->string('confirm_token', 64)->nullable()->unique();
            if (!Schema::hasColumn('shop_orders', 'payment_token')) $t->string('payment_token', 64)->nullable()->unique();
            if (!Schema::hasColumn('shop_orders', 'ai_summary')) $t->text('ai_summary')->nullable();
            if (!Schema::hasColumn('shop_orders', 'shipping_method')) $t->string('shipping_method', 30)->nullable(); // showroom|armada|kargo|kurir_instan
            if (!Schema::hasColumn('shop_orders', 'review_note')) $t->text('review_note')->nullable(); // catatan Minta Revisi/Nego
            if (!Schema::hasColumn('shop_orders', 'confirmed_ip')) $t->string('confirmed_ip', 45)->nullable();
            if (!Schema::hasColumn('shop_orders', 'unique_code')) $t->unsignedSmallInteger('unique_code')->nullable(); // kode unik 3 digit
            if (!Schema::hasColumn('shop_orders', 'payment_due_at')) $t->timestamp('payment_due_at')->nullable();
        });

        // Bukti transfer: hasil baca AI + tautan langsung ke order
        Schema::table('shop_payment_proofs', function (Blueprint $t) {
            if (!Schema::hasColumn('shop_payment_proofs', 'order_id')) $t->unsignedBigInteger('order_id')->nullable()->index();
            if (!Schema::hasColumn('shop_payment_proofs', 'ai_read')) $t->json('ai_read')->nullable(); // nominal, tanggal, bank, pengirim, keyakinan
            if (!Schema::hasColumn('shop_payment_proofs', 'source')) $t->string('source', 10)->default('web'); // web|whatsapp
        });

        // ===== Pemetaan status lama → baru (data tetap, hanya nilai status) =====
        $map = [
            'menunggu_wa' => 'menunggu_harga',
            'wa_terhubung' => 'menunggu_harga',
            'menunggu_data' => 'menunggu_harga',
            'data_lengkap' => 'menunggu_harga',
            'menunggu_review_admin' => 'menunggu_harga',
            'penawaran' => 'penawaran',
            'menunggu_bayar' => 'menunggu_bayar',
            'dibayar' => 'diproses',
            'diproses' => 'diproses',
            'siap_kirim' => 'siap_kirim',
            'dikirim' => 'dikirim',
            'diterima' => 'diterima',
            'selesai' => 'selesai',
            'perlu_tindakan' => 'bermasalah',
            'kedaluwarsa' => 'kedaluwarsa',
            'dibatalkan' => 'dibatalkan',
        ];
        foreach ($map as $old => $new) {
            if ($old !== $new) DB::table('shop_orders')->where('status', $old)->update(['status' => $new]);
        }

        // Pembayaran dengan bukti menunggu → status order menunggu_verifikasi
        DB::statement("UPDATE shop_orders o SET status = 'menunggu_verifikasi'
            WHERE o.status = 'menunggu_bayar' AND EXISTS (
                SELECT 1 FROM shop_payments p JOIN shop_payment_proofs pr ON pr.payment_id = p.id
                WHERE p.order_id = o.id AND pr.status = 'menunggu')");

        // DEPRECATED: shop_orders.form_token diganti confirm_token/payment_token (rombak WA-first).
        // DEPRECATED: shop_orders.form_token_expires_at diganti confirm_token/payment_token.
    }

    public function down(): void
    {
        // Kembalikan status lama (pemetaan terbalik, terbaik-usaha)
        $reverse = [
            'menunggu_harga' => 'menunggu_review_admin',
            'bermasalah' => 'perlu_tindakan',
        ];
        foreach ($reverse as $new => $old) {
            DB::table('shop_orders')->where('status', $new)->update(['status' => $old]);
        }

        Schema::dropIfExists('bot_scenarios');
        Schema::dropIfExists('shop_order_events');
        Schema::dropIfExists('admin_notifications');
        Schema::dropIfExists('wa_templates');
        Schema::dropIfExists('wa_ai_logs');
        Schema::dropIfExists('wa_conversations');
        Schema::dropIfExists('shop_carts');
    }
};
