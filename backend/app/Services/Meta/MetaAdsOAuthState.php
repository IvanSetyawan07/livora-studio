<?php

namespace App\Services\Meta;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

/**
 * State CSRF token untuk Meta Ads OAuth redirect flow — sama persis polanya
 * dengan GoogleOAuthState (App\Services\Google\GoogleOAuthState), cuma
 * di-namespace terpisah karena provider-nya beda. Dibuat saat generate
 * authorize URL, diverifikasi (lalu langsung dibuang, sekali pakai) saat
 * Meta redirect balik ke callback.
 */
class MetaAdsOAuthState
{
    private const PREFIX = 'meta_ads_oauth_state:';
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