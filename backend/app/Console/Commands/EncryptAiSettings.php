<?php

namespace App\Console\Commands;

use App\Models\AiSetting;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;

/**
 * Satu kali jalan: enkripsi ulang baris ai_settings sensitif yang masih
 * plaintext (token Google lama di production). Idempoten — baris yang sudah
 * terenkripsi dilewati.
 */
class EncryptAiSettings extends Command
{
    protected $signature = 'ai:encrypt-settings';

    protected $description = 'Enkripsi kredensial sensitif di tabel ai_settings yang masih tersimpan plaintext';

    public function handle(): int
    {
        $updated = 0;
        $skipped = 0;

        $rows = DB::table('ai_settings')->select('id', 'key', 'value')->get();

        foreach ($rows as $row) {
            if (!AiSetting::isSensitiveKey($row->key) || $row->value === null || $row->value === '') {
                continue;
            }

            if (AiSetting::isEncrypted($row->value)) {
                $skipped++;
                continue;
            }

            DB::table('ai_settings')
                ->where('id', $row->id)
                ->update(['value' => Crypt::encryptString($row->value)]);

            $updated++;
        }

        $this->info("{$updated} baris dienkripsi, {$skipped} sudah terenkripsi.");

        return self::SUCCESS;
    }
}
