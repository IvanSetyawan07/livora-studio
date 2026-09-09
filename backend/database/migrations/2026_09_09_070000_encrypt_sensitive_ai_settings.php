<?php

use App\Models\AiSetting;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Data migration: enkripsi baris ai_settings sensitif yang masih plaintext.
 * Aman dijalankan berkali-kali (baris yang sudah terenkripsi dilewati).
 */
return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('ai_settings')) {
            return;
        }

        DB::table('ai_settings')->select('id', 'key', 'value')->get()->each(function ($row) {
            if (!AiSetting::isSensitiveKey($row->key) || empty($row->value)) {
                return;
            }

            if (AiSetting::isEncrypted($row->value)) {
                return;
            }

            DB::table('ai_settings')
                ->where('id', $row->id)
                ->update(['value' => Crypt::encryptString($row->value)]);
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('ai_settings')) {
            return;
        }

        DB::table('ai_settings')->select('id', 'key', 'value')->get()->each(function ($row) {
            if (!AiSetting::isSensitiveKey($row->key) || empty($row->value)) {
                return;
            }

            if (!AiSetting::isEncrypted($row->value)) {
                return;
            }

            DB::table('ai_settings')
                ->where('id', $row->id)
                ->update(['value' => Crypt::decryptString($row->value)]);
        });
    }
};
