<?php

namespace App\Services\Marketing;

use App\Services\Google\GoogleOAuthTokenStore;
use Illuminate\Support\Facades\Http;

/**
 * Google Analytics 4 — Data API v1beta.
 *
 * Autentikasi memakai koneksi OAuth Google yang sama dengan Search Console
 * (lihat GoogleOAuthTokenStore). Tidak lagi memakai service account key,
 * karena organization policy Google Cloud memblokir pembuatan key tersebut.
 *
 * Kredensial (backend/.env):
 *   GA4_PROPERTY_ID → angka property, mis. 412345678
 *
 * Scope yang dibutuhkan: https://www.googleapis.com/auth/analytics.readonly
 * (sudah termasuk saat user connect Google lewat menu integrasi).
 */
class Ga4Client
{
    public function __construct(private GoogleOAuthTokenStore $tokens)
    {
    }

    public function propertyId(): ?string
    {
        $id = config('services.ga4.property_id');

        return filled($id) ? preg_replace('/\D/', '', (string) $id) : null;
    }

    public function isConfigured(): bool
    {
        return filled($this->propertyId()) && $this->tokens->getValidAccessToken() !== null;
    }

    /** Access token dari koneksi OAuth Google bersama. */
    private function accessToken(): string
    {
        $token = $this->tokens->getValidAccessToken();

        if ($token === null) {
            throw MarketingApiException::notConfigured(
                'Google belum terhubung. Silakan connect ulang lewat menu integrasi.'
            );
        }

        return $token;
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
