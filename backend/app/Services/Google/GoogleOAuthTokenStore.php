<?php

namespace App\Services\Google;

use App\Models\AiSetting;
use Carbon\Carbon;
use Google_Client;

/**
 * Penyimpanan token OAuth Google lewat tabel ai_settings yang sudah ada
 * (key/value) — tidak bikin tabel baru. Satu koneksi Google untuk seluruh
 * aplikasi (bukan per-admin-user), karena datanya milik bisnis Livora,
 * bukan milik akun admin yang kebetulan menyambungkannya. Dipakai bareng
 * nanti oleh GA4/Ads kalau scope-nya ditambahkan di kemudian hari.
 */
class GoogleOAuthTokenStore
{
    private const SETTING_KEY = 'google_oauth_connection';
    private const REFRESH_BUFFER_SECONDS = 60;

    public function connectionInfo(): ?array
    {
        $data = $this->read();

        if ($data === null) {
            return null;
        }

        return [
            'email' => $data['email'] ?? null,
            'scope' => $data['scope'] ?? null,
            'connectedAt' => $data['connected_at'] ?? null,
        ];
    }

    /**
     * Simpan hasil token exchange (dari fetchAccessTokenWithAuthCode).
     */
    public function save(array $tokenResponse, ?string $email): void
    {
        $existing = $this->read();

        $payload = [
            'access_token' => $tokenResponse['access_token'] ?? null,
            'refresh_token' => $tokenResponse['refresh_token'] ?? ($existing['refresh_token'] ?? null),
            'expires_at' => now()->addSeconds((int) ($tokenResponse['expires_in'] ?? 3600))->toIso8601String(),
            'scope' => $tokenResponse['scope'] ?? null,
            'email' => $email ?? ($existing['email'] ?? null),
            'connected_at' => $existing['connected_at'] ?? now()->toIso8601String(),
        ];

        AiSetting::set(self::SETTING_KEY, json_encode($payload));
    }

    public function clear(): void
    {
        AiSetting::set(self::SETTING_KEY, null);
    }

    /**
     * Access token yang sudah pasti valid (auto-refresh kalau mendekati
     * expired). Return null kalau belum pernah connect ATAU refresh gagal
     * (mis. token dicabut manual dari Google Account) — caller WAJIB
     * menganggap null sebagai "butuh connect ulang", jangan dipaksa lanjut.
     */
    public function getValidAccessToken(): ?string
    {
        $data = $this->read();

        if ($data === null || empty($data['refresh_token'])) {
            return null;
        }

        $expiresAt = Carbon::parse($data['expires_at']);

        if ($expiresAt->subSeconds(self::REFRESH_BUFFER_SECONDS)->isFuture()) {
            return $data['access_token'];
        }

        $client = new Google_Client();
        $client->setClientId(config('services.google_marketing.client_id'));
        $client->setClientSecret(config('services.google_marketing.client_secret'));

        $refreshed = $client->fetchAccessTokenWithRefreshToken($data['refresh_token']);

        if (isset($refreshed['error'])) {
            return null;
        }

        $data['access_token'] = $refreshed['access_token'];
        $data['expires_at'] = now()->addSeconds((int) ($refreshed['expires_in'] ?? 3600))->toIso8601String();

        AiSetting::set(self::SETTING_KEY, json_encode($data));

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