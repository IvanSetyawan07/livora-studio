<?php

namespace App\Services\Meta;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Meta Conversions API (CAPI) sender (server-side).
 * Aktif hanya bila META_PIXEL_ID & META_CAPI_ACCESS_TOKEN diisi di .env.
 */
class MetaCapiService
{
    public function isConfigured(): bool
    {
        return filled(config('services.meta_pixel.pixel_id'))
            && filled(config('services.meta_pixel.capi_access_token'));
    }

    /**
     * Kirim event server-side non-blocking (gagal hanya dicatat ke log).
     *
     * @param array<string, mixed> $userData
     * @param array<string, mixed> $customData
     */
    public function sendEvent(
        string $eventName,
        ?Request $request = null,
        array $userData = [],
        array $customData = [],
        ?string $sourceUrl = null,
    ): bool {
        if (! $this->isConfigured()) {
            return false;
        }

        $pixelId = (string) config('services.meta_pixel.pixel_id');
        $token = (string) config('services.meta_pixel.capi_access_token');
        $version = (string) config('services.meta_ads.api_version', 'v21.0');
        $testCode = config('services.meta_pixel.test_event_code');

        $hashedUser = [];
        if (! empty($userData['email'])) {
            $hashedUser['em'] = [hash('sha256', strtolower(trim((string) $userData['email'])))];
        }
        if (! empty($userData['phone'])) {
            $digits = preg_replace('/\D+/', '', (string) $userData['phone']);
            if ($digits !== '') {
                $hashedUser['ph'] = [hash('sha256', $digits)];
            }
        }
        if ($request) {
            if ($ip = $request->ip()) {
                $hashedUser['client_ip_address'] = $ip;
            }
            if ($ua = $request->userAgent()) {
                $hashedUser['client_user_agent'] = $ua;
            }
        }

        $event = [
            'event_name' => $eventName,
            'event_time' => now()->timestamp,
            'action_source' => 'website',
            'event_source_url' => $sourceUrl ?: rtrim((string) config('app.frontend_url', 'https://livoralcr.com'), '/'),
            'user_data' => $hashedUser,
        ];

        if (! empty($customData)) {
            $event['custom_data'] = $customData;
        }

        $payload = ['data' => [$event]];
        if (filled($testCode)) {
            $payload['test_event_code'] = $testCode;
        }

        try {
            $res = Http::timeout(6)->post(
                "https://graph.facebook.com/{$version}/{$pixelId}/events?access_token={$token}",
                $payload
            );

            if (! $res->successful()) {
                Log::warning('Meta CAPI event warning', [
                    'event' => $eventName,
                    'status' => $res->status(),
                    'body' => $res->body(),
                ]);

                return false;
            }

            return true;
        } catch (\Throwable $e) {
            Log::warning('Meta CAPI request failed: '.$e->getMessage());

            return false;
        }
    }
}
