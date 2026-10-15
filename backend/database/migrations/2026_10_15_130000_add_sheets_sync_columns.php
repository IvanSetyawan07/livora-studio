<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/** Penanda "sudah terkirim ke Google Sheets" untuk order & dokumen, dipakai scheduler untuk coba ulang. */
return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('shop_orders', 'sheets_synced_at')) {
            Schema::table('shop_orders', fn (Blueprint $t) => $t->timestamp('sheets_synced_at')->nullable()->index());
        }
        if (!Schema::hasColumn('shop_documents', 'sheets_synced_at')) {
            Schema::table('shop_documents', fn (Blueprint $t) => $t->timestamp('sheets_synced_at')->nullable());
            // Dokumen yang sudah ada dianggap sudah ditangani (hindari baris dobel di Register Dokumen).
            // Mau kirim ulang semuanya: php artisan shop:sheets-sync --all --docs
            DB::table('shop_documents')->update(['sheets_synced_at' => now()]);
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('shop_documents', 'sheets_synced_at')) {
            Schema::table('shop_documents', fn (Blueprint $t) => $t->dropColumn('sheets_synced_at'));
        }
        if (Schema::hasColumn('shop_orders', 'sheets_synced_at')) {
            Schema::table('shop_orders', function (Blueprint $t) {
                $t->dropIndex(['sheets_synced_at']);
                $t->dropColumn('sheets_synced_at');
            });
        }
    }
};
