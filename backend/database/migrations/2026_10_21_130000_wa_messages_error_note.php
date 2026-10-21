<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Ringkasan penyebab gagal kirim WA (kode + pesan error Meta). MariaDB-safe.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('wa_messages', function (Blueprint $t) {
            if (!Schema::hasColumn('wa_messages', 'error_note')) $t->string('error_note', 500)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('wa_messages', function (Blueprint $t) {
            if (Schema::hasColumn('wa_messages', 'error_note')) $t->dropColumn('error_note');
        });
    }
};
