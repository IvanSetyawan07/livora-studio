<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Sistem pesanan furnitur (jalur terpisah dari My Consultation).
 * Tahap 1 + 2: keranjang, order berkode, penawaran, tahan stok, pembayaran
 * (transfer BCA + QRIS Midtrans), dokumen Tagihan/Invoice bernomor,
 * pengiriman, peran admin, audit log, sesi WhatsApp.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $t) {
            if (!Schema::hasColumn('users', 'admin_role')) $t->string('admin_role', 20)->nullable()->after('role'); // owner|cs|finance|production
            if (!Schema::hasColumn('users', 'phone_verified_at')) $t->timestamp('phone_verified_at')->nullable();
            if (!Schema::hasColumn('users', 'wa_opt_in')) $t->boolean('wa_opt_in')->default(false);
            if (!Schema::hasColumn('users', 'wa_opt_out_at')) $t->timestamp('wa_opt_out_at')->nullable();
        });

        Schema::table('items', function (Blueprint $t) {
            if (!Schema::hasColumn('items', 'fulfillment_type')) $t->string('fulfillment_type', 20)->default('ready_stock'); // ready_stock|made_to_order
            if (!Schema::hasColumn('items', 'discount_type')) $t->string('discount_type', 10)->nullable(); // percent|amount
            if (!Schema::hasColumn('items', 'discount_value')) $t->decimal('discount_value', 14, 2)->nullable();
        });

        Schema::create('cart_items', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->foreignId('item_id')->constrained('items')->cascadeOnDelete();
            $t->foreignId('variant_id')->nullable()->constrained('furniture_variants')->nullOnDelete();
            $t->unsignedInteger('quantity')->default(1);
            $t->string('note', 500)->nullable();
            $t->boolean('selected')->default(true);
            $t->timestamps();
            $t->unique(['user_id', 'item_id', 'variant_id']);
        });

        Schema::create('shop_orders', function (Blueprint $t) {
            $t->id();
            $t->string('code', 20)->unique();             // LVR-K7Q2M9, acak
            $t->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $t->string('status', 30)->default('menunggu_wa')->index();
            $t->string('order_type', 20)->default('ready_stock'); // ready_stock|made_to_order|mixed
            $t->string('source', 10)->default('web');       // web|manual
            $t->string('customer_name')->nullable();
            $t->string('customer_phone', 30)->nullable()->index();
            $t->string('customer_email')->nullable();
            $t->text('note')->nullable();
            $t->boolean('wa_consent')->default(false);
            $t->string('idempotency_key', 80)->nullable()->unique();
            $t->string('form_token', 64)->nullable()->unique();
            $t->timestamp('form_token_expires_at')->nullable();
            $t->json('shipping')->nullable();               // data form pengiriman
            $t->json('custom_spec')->nullable();            // MTO
            // Penawaran (snapshot, integer rupiah)
            $t->unsignedInteger('quote_version')->default(0);
            $t->bigInteger('subtotal')->default(0);
            $t->bigInteger('product_discount')->default(0);
            $t->string('extra_discount_type', 10)->nullable();
            $t->decimal('extra_discount_value', 14, 2)->nullable();
            $t->string('extra_discount_reason')->nullable();
            $t->bigInteger('extra_discount')->default(0);
            $t->bigInteger('dpp')->default(0);
            $t->bigInteger('ppn')->default(0);
            $t->bigInteger('shipping_fee')->default(0);
            $t->bigInteger('installation_fee')->default(0);
            $t->bigInteger('other_fee')->default(0);
            $t->bigInteger('grand_total')->default(0);
            $t->timestamp('quote_sent_at')->nullable();
            $t->timestamp('quote_expires_at')->nullable();
            $t->timestamp('quote_approved_at')->nullable();
            $t->timestamp('paid_at')->nullable();
            // Pengiriman
            $t->string('courier')->nullable();
            $t->string('tracking_number')->nullable();
            $t->date('delivery_date')->nullable();
            $t->timestamp('shipped_at')->nullable();
            $t->timestamp('received_at')->nullable();
            $t->timestamp('expires_at')->nullable();
            $t->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $t->timestamps();
        });

        Schema::create('shop_order_items', function (Blueprint $t) {
            $t->id();
            $t->foreignId('order_id')->constrained('shop_orders')->cascadeOnDelete();
            $t->foreignId('item_id')->nullable()->constrained('items')->nullOnDelete();
            $t->foreignId('variant_id')->nullable()->constrained('furniture_variants')->nullOnDelete();
            $t->string('title');
            $t->string('code')->nullable();
            $t->string('variant_name')->nullable();
            $t->string('image')->nullable();
            $t->string('fulfillment_type', 20)->default('ready_stock');
            $t->unsignedInteger('quantity')->default(1);
            $t->string('note', 500)->nullable();
            $t->bigInteger('unit_price')->default(0);
            $t->bigInteger('unit_discount')->default(0);
            $t->string('discount_label')->nullable();
            $t->timestamps();
        });

        Schema::create('stock_holds', function (Blueprint $t) {
            $t->id();
            $t->foreignId('order_id')->constrained('shop_orders')->cascadeOnDelete();
            $t->foreignId('item_id')->constrained('items')->cascadeOnDelete();
            $t->unsignedInteger('quantity');
            $t->string('status', 20)->default('held'); // held|reserved|released
            $t->timestamp('expires_at')->nullable();
            $t->timestamps();
            $t->index(['item_id', 'status']);
        });

        Schema::create('shop_payments', function (Blueprint $t) {
            $t->id();
            $t->foreignId('order_id')->constrained('shop_orders')->cascadeOnDelete();
            $t->string('kind', 20)->default('full');
            $t->string('method', 20)->nullable();           // bca_transfer|qris
            $t->bigInteger('amount');
            $t->string('status', 30)->default('pending');   // pending|menunggu_verifikasi|paid|expired|failed|void
            $t->string('gateway_ref')->nullable()->unique();
            $t->text('qr_payload')->nullable();
            $t->string('qr_url')->nullable();
            $t->string('webhook_event_id')->nullable()->unique();
            $t->timestamp('expires_at')->nullable();
            $t->timestamp('paid_at')->nullable();
            $t->foreignId('verified_by')->nullable()->constrained('users')->nullOnDelete();
            $t->timestamps();
        });

        Schema::create('shop_payment_proofs', function (Blueprint $t) {
            $t->id();
            $t->foreignId('payment_id')->constrained('shop_payments')->cascadeOnDelete();
            $t->string('file_path');
            $t->bigInteger('amount')->nullable();
            $t->string('status', 20)->default('menunggu'); // menunggu|acc|tolak
            $t->string('reason')->nullable();
            $t->foreignId('verified_by')->nullable()->constrained('users')->nullOnDelete();
            $t->timestamp('verified_at')->nullable();
            $t->timestamps();
        });

        Schema::create('document_counters', function (Blueprint $t) {
            $t->id();
            $t->string('type', 10);
            $t->unsignedSmallInteger('year');
            $t->unsignedTinyInteger('month');
            $t->unsignedInteger('last_value')->default(0);
            $t->unique(['type', 'year', 'month']);
        });

        Schema::create('shop_documents', function (Blueprint $t) {
            $t->id();
            $t->string('number')->index();
            $t->string('type', 10)->default('INV');
            $t->string('title', 20)->default('Tagihan'); // Tagihan|Invoice
            $t->string('status', 20)->default('belum_dibayar'); // belum_dibayar|lunas|kedaluwarsa|batal
            $t->foreignId('order_id')->constrained('shop_orders')->cascadeOnDelete();
            $t->foreignId('payment_id')->nullable()->constrained('shop_payments')->nullOnDelete();
            $t->json('snapshot');
            $t->string('pdf_path')->nullable();
            $t->unsignedInteger('version')->default(1);
            $t->timestamp('issued_at');
            $t->timestamp('paid_at')->nullable();
            $t->timestamps();
            $t->unique(['number', 'version']);
        });

        Schema::create('audit_logs', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $t->string('action', 80)->index();
            $t->string('object_type', 60)->nullable();
            $t->unsignedBigInteger('object_id')->nullable();
            $t->json('before')->nullable();
            $t->json('after')->nullable();
            $t->string('ip_address', 45)->nullable();
            $t->timestamp('created_at')->useCurrent();
            $t->index(['object_type', 'object_id']);
        });

        Schema::create('wa_messages', function (Blueprint $t) {
            $t->id();
            $t->string('message_id')->nullable()->unique();
            $t->string('phone', 30)->index();
            $t->foreignId('order_id')->nullable()->constrained('shop_orders')->nullOnDelete();
            $t->string('direction', 5); // in|out
            $t->string('type', 20)->default('text');
            $t->text('body')->nullable();
            $t->json('raw')->nullable();
            $t->timestamps();
        });

        Schema::create('shop_settings', function (Blueprint $t) {
            $t->id();
            $t->string('key')->unique();
            $t->text('value')->nullable();
            $t->timestamps();
        });
    }

    public function down(): void
    {
        foreach (['shop_settings', 'wa_messages', 'audit_logs', 'shop_documents', 'document_counters',
            'shop_payment_proofs', 'shop_payments', 'stock_holds', 'shop_order_items', 'shop_orders', 'cart_items'] as $table) {
            Schema::dropIfExists($table);
        }
    }
};
