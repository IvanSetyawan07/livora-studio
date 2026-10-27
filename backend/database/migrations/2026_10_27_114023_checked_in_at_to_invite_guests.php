<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Sebar Undangan: catatan kedatangan tamu di hari acara (check-in). */
return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('invite_guests', 'checked_in_at')) {
            Schema::table('invite_guests', function (Blueprint $t) {
                $t->timestamp('checked_in_at')->nullable()->after('rsvp_at');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('invite_guests', 'checked_in_at')) {
            Schema::table('invite_guests', function (Blueprint $t) {
                $t->dropColumn('checked_in_at');
            });
        }
    }
};