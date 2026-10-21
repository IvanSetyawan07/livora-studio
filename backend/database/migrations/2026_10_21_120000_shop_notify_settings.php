<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Penerima notifikasi admin per kategori (diatur owner lewat Pengaturan Toko). */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('shop_notify_settings', function (Blueprint $t) {
            $t->id();
            $t->string('category', 40)->unique(); // pricing | finance | ops | system | marketing
            $t->json('phones');                   // ["62812..."]
            $t->timestamps();
        });
    }

    public function down(): void
    {
        // Additive-only: tabel dibiarkan, cukup berhenti dipakai.
    }
};
