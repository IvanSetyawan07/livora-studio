<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $owner = 'admin.bagusivan@gmail.com';
        // Akun ini menjadi Owner (general admin). Bila belum terdaftar, akan
        // dijadikan Owner otomatis saat pertama kali masuk (lihat AuthController/me).
        DB::table('users')->whereRaw('LOWER(email) = ?', [$owner])
            ->update(['role' => 'admin', 'admin_role' => 'owner']);

        // Admin lain yang belum punya peran tidak lagi otomatis Owner.
        if (DB::table('users')->whereRaw('LOWER(email) = ?', [$owner])->exists()) {
            DB::table('users')->where('role', 'admin')->whereNull('admin_role')
                ->whereRaw('LOWER(email) <> ?', [$owner])->update(['admin_role' => 'cs']);
        }
    }

    public function down(): void {}
};
