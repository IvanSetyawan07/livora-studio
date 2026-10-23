<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Cek harga lewat admin (info saja, BUKAN penawaran/pesanan).
 * Livi menahan pertanyaan harga customer, admin mengisi harga manual di inbox,
 * lalu Livi meneruskannya ke customer dengan bahasa natural + foto produk.
 * Harga di sini tidak menyentuh items.price / price_confirmed_at.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('wa_price_inquiries', function (Blueprint $t) {
            $t->id();
            $t->unsignedBigInteger('conversation_id')->index();
            $t->string('phone', 30)->index();
            $t->unsignedBigInteger('cart_id')->nullable();
            $t->json('items');                      // [{item_id, title, code, quantity}]
            $t->string('status', 20)->default('pending')->index(); // pending|answered|cancelled
            $t->json('answers')->nullable();        // [{item_id, price, discount_type, discount_value, final_price, note}]
            $t->text('admin_note')->nullable();     // catatan umum admin (mis. promo, syarat)
            $t->string('customer_question', 300)->nullable();
            $t->unsignedBigInteger('answered_by')->nullable();
            $t->timestamp('answered_at')->nullable();
            $t->timestamp('relayed_at')->nullable();
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wa_price_inquiries');
    }
};
