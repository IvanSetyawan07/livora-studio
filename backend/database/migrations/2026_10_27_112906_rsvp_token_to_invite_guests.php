<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/** Sebar Undangan: token unik per tamu untuk tautan konfirmasi hadir/tidak (/rsvp/{token}). */
return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('invite_guests', 'rsvp_token')) {
            Schema::table('invite_guests', function (Blueprint $t) {
                $t->string('rsvp_token', 40)->nullable()->unique()->after('phone');
            });
        }

        // Tamu yang sudah ada ikut diberi token.
        foreach (DB::table('invite_guests')->whereNull('rsvp_token')->pluck('id') as $id) {
            DB::table('invite_guests')->where('id', $id)->update(['rsvp_token' => Str::random(32)]);
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('invite_guests', 'rsvp_token')) {
            Schema::table('invite_guests', function (Blueprint $t) {
                $t->dropUnique(['rsvp_token']);
                $t->dropColumn('rsvp_token');
            });
        }
    }
};