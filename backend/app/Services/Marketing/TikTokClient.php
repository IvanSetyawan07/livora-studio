<?php

namespace App\Services\Marketing;

use Illuminate\Support\Facades\Http;

/**
 * TikTok Business API v1.3 — /business/get/ (profil + metrik harian akun).
 * .env: TIKTOK_ACCESS_TOKEN, TIKTOK_BUSINESS_ID.
 * TikTok membalas HTTP 200 dengan `code` != 0 saat gagal — dipetakan manual di bawah.
 */
class TikTokClient
{
    private const BASE = 'https://business-api.tiktok.com/open_api/v1.3';

    public function isConfigured(): bool
    {
        return filled(config('services.tiktok.access_token')) && filled(config('services.tiktok.business_id'));
    }

    /**
     * @return array{followers: int, views: int, engagements: int, profile_views: int, daily: list<array{date: string, views: int, engagements: int}>}
     */
    public function summary(MarketingPeriod $period): array
    {
        if (! $this->isConfigured()) {
            throw MarketingApiException::notConfigured('TikTok belum dikonfigurasi. Isi TIKTOK_ACCESS_TOKEN dan TIKTOK_BUSINESS_ID di backend/.env.');
        }

        $res = Http::withHeaders(['Access-Token' => (string) config('services.tiktok.access_token')])
            ->timeout(20)
            ->get(self::BASE.'/business/get/', [
                'business_id' => (string) config('services.tiktok.business_id'),
                'fields' => json_encode(['followers_count', 'video_views', 'likes', 'comments', 'shares', 'profile_views']),
                'start_date' => $period->fromDate(),
                'end_date' => $period->toDate(),
            ]);

        if ($res->failed()) {
            throw MarketingApiException::fromHttp('TikTok', $res->status(), $res->body());
        }

        $json = $res->json();
        $code = (int) ($json['code'] ?? 0);
        if ($code !== 0) {
            $msg = (string) ($json['message'] ?? 'TikTok API error');
            $status = match (true) {
                in_array($code, [40100, 40101, 40102, 40104, 40105], true) => 'invalid_credentials',
                $code === 40103 => 'permission_required',
                str_contains(strtolower($msg), 'rate') => 'rate_limited',
                default => 'api_error',
            };
            throw new MarketingApiException("TikTok: {$msg} (code {$code})", $status);
        }

        $data = $json['data'] ?? [];
        $daily = [];
        $views = 0;
        $eng = 0;
        foreach ($data['metrics'] ?? [] as $m) {
            $v = (int) ($m['video_views'] ?? 0);
            $e = (int) ($m['likes'] ?? 0) + (int) ($m['comments'] ?? 0) + (int) ($m['shares'] ?? 0);
            $views += $v;
            $eng += $e;
            $daily[] = ['date' => (string) ($m['date'] ?? ''), 'views' => $v, 'engagements' => $e];
        }

        return [
            'followers' => (int) ($data['followers_count'] ?? 0),
            'views' => $views ?: (int) ($data['video_views'] ?? 0),
            'engagements' => $eng ?: ((int) ($data['likes'] ?? 0) + (int) ($data['comments'] ?? 0) + (int) ($data['shares'] ?? 0)),
            'profile_views' => (int) ($data['profile_views'] ?? 0),
            'daily' => $daily,
        ];
    }
}
