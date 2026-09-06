<?php

namespace App\Services\Marketing;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

/**
 * Google Analytics 4 — Data API v1beta lewat service account.
 *
 * Kredensial (backend/.env):
 *   GA4_PROPERTY_ID         → angka property, mis. 412345678
 *   GA4_SERVICE_ACCOUNT_JSON→ path absolut ke file JSON service account,
 *                             ATAU isi JSON-nya langsung (satu baris).
 *
 * Tidak ada fallback data contoh: kalau kredensial kosong atau ditolak
 * Google, method di sini melempar MarketingApiException dan controller
 * meneruskan statusnya apa adanya ke UI.
 */
class Ga4Client
{
    private const TOKEN_URL = 'https://oauth2.googleapis.com/token';
    private const SCOPE = 'https://www.googleapis.com/auth/analytics.readonly';

    public function propertyId(): ?string
    {
        $id = config('services.ga4.property_id');

        return filled($id) ? preg_replace('/\D/', '', (string) $id) : null;
    }

    public function isConfigured(): bool
    {
        return filled($this->propertyId()) && $this->credentials() !== null;
    }

    /** Isi service account sebagai array, atau null kalau belum diisi/tidak valid. */
    private function credentials(): ?array
    {
        $raw = config('services.ga4.service_account_json');
        if (! filled($raw)) {
            return null;
        }

        $raw = (string) $raw;

        if (! str_starts_with(ltrim($raw), '{')) {
            $path = str_starts_with($raw, '/') ? $raw : base_path($raw);
            if (! is_readable($path)) {
                return null;
            }
            $raw = (string) file_get_contents($path);
        }

        $decoded = json_decode($raw, true);

        return is_array($decoded) && isset($decoded['client_email'], $decoded['private_key']) ? $decoded : null;
    }

    /** Access token OAuth2 hasil JWT bearer flow. Di-cache 50 menit (token berlaku 60). */
    private function accessToken(): string
    {
        $creds = $this->credentials();
        if ($creds === null) {
            throw MarketingApiException::notConfigured(
                'GA4 belum dikonfigurasi. Isi GA4_PROPERTY_ID dan GA4_SERVICE_ACCOUNT_JSON di backend/.env.'
            );
        }

        return Cache::remember('ga4:access_token:'.md5($creds['client_email']), 3000, function () use ($creds) {
            $now = time();
            $claim = [
                'iss' => $creds['client_email'],
                'scope' => self::SCOPE,
                'aud' => self::TOKEN_URL,
                'iat' => $now,
                'exp' => $now + 3600,
            ];

            $segments = [
                $this->base64Url(json_encode(['alg' => 'RS256', 'typ' => 'JWT'])),
                $this->base64Url(json_encode($claim)),
            ];

            $signature = '';
            $ok = openssl_sign(implode('.', $segments), $signature, $creds['private_key'], OPENSSL_ALGO_SHA256);
            if (! $ok) {
                throw new MarketingApiException(
                    'Private key GA4_SERVICE_ACCOUNT_JSON tidak bisa dipakai menandatangani token.',
                    'invalid_credentials'
                );
            }
            $segments[] = $this->base64Url($signature);

            $response = Http::asForm()->timeout(20)->post(self::TOKEN_URL, [
                'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                'assertion' => implode('.', $segments),
            ]);

            if (! $response->successful()) {
                throw MarketingApiException::fromHttp('GA4 (token)', $response->status(), $response->body());
            }

            return (string) $response->json('access_token');
        });
    }

    private function base64Url(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }

    /**
     * Panggilan mentah runReport.
     *
     * @param array<string, mixed> $body
     * @return array<string, mixed>
     */
    public function runReport(array $body): array
    {
        $property = $this->propertyId();
        if (! filled($property)) {
            throw MarketingApiException::notConfigured('GA4_PROPERTY_ID belum diisi di backend/.env.');
        }

        $response = Http::withToken($this->accessToken())
            ->timeout(30)
            ->post("https://analyticsdata.googleapis.com/v1beta/properties/{$property}:runReport", $body);

        if (! $response->successful()) {
            throw MarketingApiException::fromHttp('GA4 Data API', $response->status(), $response->body());
        }

        return $response->json() ?? [];
    }

    /**
     * Deret harian: sessions, users, pageviews, engagementRate, conversions.
     *
     * @return list<array{date: string, sessions: int, users: int, pageviews: int, engagementRate: float, conversions: float}>
     */
    public function dailySeries(MarketingPeriod $period): array
    {
        $report = $this->runReport([
            'dateRanges' => [['startDate' => $period->fromDate(), 'endDate' => $period->toDate()]],
            'dimensions' => [['name' => 'date']],
            'metrics' => [
                ['name' => 'sessions'],
                ['name' => 'totalUsers'],
                ['name' => 'screenPageViews'],
                ['name' => 'engagementRate'],
                ['name' => 'conversions'],
            ],
            'orderBys' => [['dimension' => ['dimensionName' => 'date']]],
            'limit' => 400,
        ]);

        $rows = [];
        foreach ($report['rows'] ?? [] as $row) {
            $raw = $row['dimensionValues'][0]['value'] ?? '';
            $date = strlen($raw) === 8
                ? substr($raw, 0, 4).'-'.substr($raw, 4, 2).'-'.substr($raw, 6, 2)
                : $raw;

            $m = $row['metricValues'] ?? [];
            $rows[] = [
                'date' => $date,
                'sessions' => (int) ($m[0]['value'] ?? 0),
                'users' => (int) ($m[1]['value'] ?? 0),
                'pageviews' => (int) ($m[2]['value'] ?? 0),
                'engagementRate' => round(((float) ($m[3]['value'] ?? 0)) * 100, 1),
                'conversions' => (float) ($m[4]['value'] ?? 0),
            ];
        }

        return $rows;
    }

    /**
     * Channel mix (Organic Search, Paid Social, Direct, dst).
     *
     * @return list<array{label: string, sessions: int, conversions: float}>
     */
    public function channelMix(MarketingPeriod $period): array
    {
        $report = $this->runReport([
            'dateRanges' => [['startDate' => $period->fromDate(), 'endDate' => $period->toDate()]],
            'dimensions' => [['name' => 'sessionDefaultChannelGroup']],
            'metrics' => [['name' => 'sessions'], ['name' => 'conversions']],
            'orderBys' => [['metric' => ['metricName' => 'sessions'], 'desc' => true]],
            'limit' => 10,
        ]);

        $rows = [];
        foreach ($report['rows'] ?? [] as $row) {
            $rows[] = [
                'label' => (string) ($row['dimensionValues'][0]['value'] ?? 'Unknown'),
                'sessions' => (int) ($row['metricValues'][0]['value'] ?? 0),
                'conversions' => (float) ($row['metricValues'][1]['value'] ?? 0),
            ];
        }

        return $rows;
    }

    /**
     * Total agregat satu periode (dipakai untuk KPI + delta vs periode sebelumnya).
     *
     * @return array{sessions: int, users: int, pageviews: int, engagementRate: float, conversions: float}
     */
    public function totals(MarketingPeriod $period): array
    {
        $report = $this->runReport([
            'dateRanges' => [['startDate' => $period->fromDate(), 'endDate' => $period->toDate()]],
            'metrics' => [
                ['name' => 'sessions'],
                ['name' => 'totalUsers'],
                ['name' => 'screenPageViews'],
                ['name' => 'engagementRate'],
                ['name' => 'conversions'],
            ],
        ]);

        $m = $report['rows'][0]['metricValues'] ?? [];

        return [
            'sessions' => (int) ($m[0]['value'] ?? 0),
            'users' => (int) ($m[1]['value'] ?? 0),
            'pageviews' => (int) ($m[2]['value'] ?? 0),
            'engagementRate' => round(((float) ($m[3]['value'] ?? 0)) * 100, 1),
            'conversions' => (float) ($m[4]['value'] ?? 0),
        ];
    }
}
