<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Harga terkonfirmasi: bot hanya boleh menyebut harga bila kolom ini terisi.
 * Kosong = harga belum dikonfirmasi tim → bot menjawab "dikonfirmasi tim dulu".
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('items', function (Blueprint $t) {
            if (!Schema::hasColumn('items', 'price_confirmed_at')) $t->timestamp('price_confirmed_at')->nullable();
            if (!Schema::hasColumn('items', 'weight_kg')) $t->decimal('weight_kg', 8, 2)->nullable();
            if (!Schema::hasColumn('items', 'volume_m3')) $t->decimal('volume_m3', 8, 3)->nullable();
        });
    }

    public function down(): void
    {
        // Additive-only: kolom dibiarkan, cukup berhenti dipakai.
    }
};
