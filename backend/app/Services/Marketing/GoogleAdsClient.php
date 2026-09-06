<?php

namespace App\Services\Marketing;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

/**
 * Google Ads API (REST, v18) — customers/{id}/googleAds:search.
 *
 * .env: GOOGLE_ADS_DEVELOPER_TOKEN, GOOGLE_ADS_CUSTOMER_ID (tanpa "-"),
 *       GOOGLE_ADS_REFRESH_TOKEN, opsional GOOGLE_ADS_LOGIN_CUSTOMER_ID (akun manager).
 * OAuth client memakai GOOGLE_MARKETING_CLIENT_ID/SECRET (fallback GOOGLE_ADS_CLIENT_ID/SECRET).
 */
class GoogleAdsClient
{
    private const VERSION = 'v18';
    private const TOKEN_URL = 'https://oauth2.googleapis.com/token';

    public function customerId(): ?string
    {
        $id = config('services.google_ads.customer_id');
        return filled($id) ? preg_replace('/\D/', '', (string) $id) : null;
    }

    public function isConfigured(): bool
    {
        return filled(config('services.google_ads.developer_token'))
            && $this->customerId() !== null
            && filled(config('services.google_ads.refresh_token'))
            && filled($this->clientId())
            && filled($this->clientSecret());
    }

    private function clientId(): ?string
    {
        return config('services.google_ads.client_id') ?: config('services.google_marketing.client_id');
    }

    private function clientSecret(): ?string
    {
        return config('services.google_ads.client_secret') ?: config('services.google_marketing.client_secret');
    }

    private function accessToken(): string
    {
        if (! $this->isConfigured()) {
            throw MarketingApiException::notConfigured(
                'Google Ads belum dikonfigurasi. Isi GOOGLE_ADS_DEVELOPER_TOKEN, GOOGLE_ADS_CUSTOMER_ID, GOOGLE_ADS_REFRESH_TOKEN dan OAuth client di backend/.env.'
            );
        }

        $refresh = (string) config('services.google_ads.refresh_token');

        return Cache::remember('google_ads:access_token:'.md5($refresh), 3000, function () use ($refresh) {
            $res = Http::asForm()->timeout(20)->post(self::TOKEN_URL, [
                'client_id' => $this->clientId(),
                'client_secret' => $this->clientSecret(),
                'refresh_token' => $refresh,
                'grant_type' => 'refresh_token',
            ]);

            if ($res->failed()) {
                throw new MarketingApiException('Google Ads refresh token ditolak: '.mb_substr($res->body(), 0, 300), 'invalid_credentials');
            }

            return (string) $res->json('access_token');
        });
    }

    /** @return list<array<string, mixed>> */
    public function search(string $gaql): array
    {
        $cid = $this->customerId();
        $headers = [
            'developer-token' => (string) config('services.google_ads.developer_token'),
            'Authorization' => 'Bearer '.$this->accessToken(),
        ];
        if (filled(config('services.google_ads.login_customer_id'))) {
            $headers['login-customer-id'] = preg_replace('/\D/', '', (string) config('services.google_ads.login_customer_id'));
        }

        $results = [];
        $pageToken = null;
        do {
            $res = Http::withHeaders($headers)->timeout(30)->post(
                'https://googleads.googleapis.com/'.self::VERSION."/customers/{$cid}/googleAds:search",
                array_filter(['query' => $gaql, 'pageSize' => 1000, 'pageToken' => $pageToken]),
            );

            if ($res->failed()) {
                throw MarketingApiException::fromHttp('Google Ads', $res->status(), $res->body());
            }

            $json = $res->json();
            foreach ($json['results'] ?? [] as $row) {
                $results[] = $row;
            }
            $pageToken = $json['nextPageToken'] ?? null;
        } while ($pageToken);

        return $results;
    }

    /** @return list<array{date: string, spend: float, leads: float, impressions: int, clicks: int, revenue: float}> */
    public function dailySeries(MarketingPeriod $period): array
    {
        $rows = $this->search(
            'SELECT segments.date, metrics.cost_micros, metrics.clicks, metrics.impressions, metrics.conversions, metrics.conversions_value '
            ."FROM customer WHERE segments.date BETWEEN '{$period->fromDate()}' AND '{$period->toDate()}' ORDER BY segments.date"
        );

        $out = [];
        foreach ($rows as $r) {
            $m = $r['metrics'] ?? [];
            $out[] = [
                'date' => (string) ($r['segments']['date'] ?? ''),
                'spend' => round(((float) ($m['costMicros'] ?? 0)) / 1_000_000, 2),
                'leads' => (float) ($m['conversions'] ?? 0),
                'impressions' => (int) ($m['impressions'] ?? 0),
                'clicks' => (int) ($m['clicks'] ?? 0),
                'revenue' => round((float) ($m['conversionsValue'] ?? 0), 2),
            ];
        }

        return $out;
    }

    /** @return list<array{id: string, name: string, status: string, spend: float, leads: float, impressions: int, clicks: int, revenue: float}> */
    public function campaigns(MarketingPeriod $period): array
    {
        $rows = $this->search(
            'SELECT campaign.id, campaign.name, campaign.status, metrics.cost_micros, metrics.clicks, metrics.impressions, metrics.conversions, metrics.conversions_value '
            ."FROM campaign WHERE segments.date BETWEEN '{$period->fromDate()}' AND '{$period->toDate()}' AND campaign.status != 'REMOVED' ORDER BY metrics.cost_micros DESC"
        );

        $out = [];
        foreach ($rows as $r) {
            $m = $r['metrics'] ?? [];
            $out[] = [
                'id' => (string) ($r['campaign']['id'] ?? ''),
                'name' => (string) ($r['campaign']['name'] ?? 'Untitled campaign'),
                'status' => strtolower((string) ($r['campaign']['status'] ?? 'unknown')),
                'spend' => round(((float) ($m['costMicros'] ?? 0)) / 1_000_000, 2),
                'leads' => (float) ($m['conversions'] ?? 0),
                'impressions' => (int) ($m['impressions'] ?? 0),
                'clicks' => (int) ($m['clicks'] ?? 0),
                'revenue' => round((float) ($m['conversionsValue'] ?? 0), 2),
            ];
        }

        return $out;
    }
}
