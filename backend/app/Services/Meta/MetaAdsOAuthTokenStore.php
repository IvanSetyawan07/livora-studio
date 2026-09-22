<?php

namespace App\Services\Meta;

use App\Models\AiSetting;
use Carbon\Carbon;

/**
 * Penyimpanan token OAuth Meta Ads lewat tabel ai_settings yang sudah ada
 * (key/value) — pola sama seperti GoogleOAuthTokenStore. Key-nya sengaja
 * diprefix `meta_oauth_` supaya otomatis ikut terenkripsi at-rest lewat
 * AiSetting::SENSITIVE_PREFIXES (lihat app/Models/AiSetting.php — prefix
 * ini sudah didaftarkan di sana dari awal, tinggal dipakai).
 *
 * Beda dengan Google: Meta tidak memberi refresh_token. Yang disimpan di
 * sini adalah long-lived user access token (umur ~60 hari) hasil tukar
 * short-lived token dari authorization code. Kalau sudah kedaluwarsa,
 * satu-satunya jalan adalah Connect ulang — tidak ada refresh diam-diam
 * seperti Google, jadi getValidAccessToken() sengaja return null begitu
 * lewat masa berlaku (bukan mencoba refresh).
 */
class MetaAdsOAuthTokenStore
{
    private const SETTING_KEY = 'meta_oauth_ads_connection';
    private const EXPIRY_BUFFER_SECONDS = 60;

    public function connectionInfo(): ?array
    {
        $data = $this->read();

        if ($data === null) {
            return null;
        }

        return [
            'accountId' => $data['account_id'] ?? null,
            'accountName' => $data['account_name'] ?? null,
            'expiresAt' => $data['expires_at'] ?? null,
            'connectedAt' => $data['connected_at'] ?? null,
        ];
    }

    /**
     * Simpan long-lived access token hasil exchange di callback.
     */
    public function save(string $accessToken, int $expiresInSeconds, ?string $accountId, ?string $accountName): void
    {
        $existing = $this->read();

        $payload = [
            'access_token' => $accessToken,
            'expires_at' => now()->addSeconds($expiresInSeconds)->toIso8601String(),
            'account_id' => $accountId ?? ($existing['account_id'] ?? null),
            'account_name' => $accountName ?? ($existing['account_name'] ?? null),
            'connected_at' => $existing['connected_at'] ?? now()->toIso8601String(),
        ];

        AiSetting::set(self::SETTING_KEY, json_encode($payload));
    }

    public function clear(): void
    {
        AiSetting::set(self::SETTING_KEY, null);
    }

    /**
     * Access token yang masih berlaku, atau null kalau belum pernah connect
     * ATAU sudah kedaluwarsa — caller (MetaAdsClient) WAJIB menganggap null
     * sebagai "butuh connect ulang lewat Settings", bukan dipaksa lanjut.
     */
    public function getValidAccessToken(): ?string
    {
        $data = $this->read();

        if ($data === null || empty($data['access_token']) || empty($data['expires_at'])) {
            return null;
        }

        $expiresAt = Carbon::parse($data['expires_at']);

        if ($expiresAt->subSeconds(self::EXPIRY_BUFFER_SECONDS)->isPast()) {
            return null;
        }

        return $data['access_token'];
    }

    private function read(): ?array
    {
        $raw = AiSetting::get(self::SETTING_KEY);

        if (!$raw) {
            return null;
        }

        $decoded = json_decode($raw, true);

        return is_array($decoded) ? $decoded : null;
    }
}