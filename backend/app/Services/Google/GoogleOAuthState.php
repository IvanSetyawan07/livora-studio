<?php

namespace App\Services\Google;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

/**
 * State CSRF token untuk OAuth redirect flow — dibuat saat generate authorize
 * URL, diverifikasi (lalu langsung dibuang, sekali pakai) saat Google
 * redirect balik ke callback. Kalau state tidak match / sudah dipakai /
 * kadaluarsa, callback WAJIB menolak dan tidak menyimpan apapun.
 */
class GoogleOAuthState
{
    private const PREFIX = 'google_oauth_state:';
    private const TTL_MINUTES = 10;

    public static function generate(): string
    {
        $state = Str::random(40);
        Cache::put(self::PREFIX.$state, true, now()->addMinutes(self::TTL_MINUTES));

        return $state;
    }

    public static function verify(?string $state): bool
    {
        if (!$state) {
            return false;
        }

        return Cache::pull(self::PREFIX.$state, false) === true;
    }
}