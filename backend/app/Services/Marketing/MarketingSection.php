<?php

namespace App\Services\Marketing;

use App\Services\Meta\MetaGraphException;
use Illuminate\Support\Facades\Cache;

/**
 * Bungkus satu blok data platform jadi envelope seragam untuk UI:
 *   { status: 'ok'|'not_configured'|'invalid_credentials'|'permission_required'|'rate_limited'|'api_error', message?, ...data }
 * Hasil 'ok' di-cache 10 menit per rentang; kegagalan tidak di-cache supaya retry langsung nyata.
 */
class MarketingSection
{
    public const TTL = 600;

    public static function attempt(string $cacheKey, callable $producer): array
    {
        $cached = Cache::get($cacheKey);
        if (is_array($cached)) {
            return $cached + ['cached' => true];
        }

        try {
            $data = ['status' => 'ok'] + $producer();
            Cache::put($cacheKey, $data, self::TTL);

            return $data;
        } catch (MarketingApiException $e) {
            return ['status' => $e->status, 'message' => $e->getMessage()];
        } catch (MetaGraphException $e) {
            $status = $e->status === 'invalid_token' ? 'invalid_credentials' : $e->status;

            return ['status' => $status, 'message' => $e->getMessage()];
        } catch (\Throwable $e) {
            report($e);

            return ['status' => 'api_error', 'message' => 'Platform tidak merespons dengan benar.'];
        }
    }

    /** Delta % jujur; null kalau periode sebelumnya 0. */
    public static function delta(float|int $now, float|int $prev): ?float
    {
        if ((float) $prev === 0.0) {
            return null;
        }

        return round((($now - $prev) / $prev) * 100, 1);
    }
}
