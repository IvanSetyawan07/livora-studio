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

    /**
     * Daftar video milik akun sendiri + metriknya (/business/video/list/).
     * TikTok TIDAK menyediakan pencarian video publik lewat token Business ini,
     * jadi inspirasi lintas-kreator hanya bisa dari YouTube — di sini kita cuma
     * membaca performa video Livora sendiri, apa adanya.
     *
     * @return list<array<string, mixed>>
     */
    public function videos(int $max = 20): array
    {
        if (! $this->isConfigured()) {
            throw MarketingApiException::notConfigured('TikTok belum dikonfigurasi. Isi TIKTOK_ACCESS_TOKEN dan TIKTOK_BUSINESS_ID di backend/.env.');
        }

        $res = Http::withHeaders(['Access-Token' => (string) config('services.tiktok.access_token')])
            ->timeout(20)
            ->get(self::BASE.'/business/video/list/', [
                'business_id' => (string) config('services.tiktok.business_id'),
                'max_count' => max(1, min($max, 20)),
                'fields' => json_encode([
                    'item_id', 'create_time', 'thumbnail_url', 'share_url', 'caption',
                    'video_views', 'likes', 'comments', 'shares', 'reach', 'full_video_watched_rate',
                ]),
            ]);

        if ($res->failed()) {
            throw MarketingApiException::fromHttp('TikTok', $res->status(), $res->body());
        }

        $json = $res->json();
        $code = (int) ($json['code'] ?? 0);
        if ($code !== 0) {
            $msg = (string) ($json['message'] ?? 'TikTok API error');
            throw new MarketingApiException("TikTok: {$msg} (code {$code})", match (true) {
                in_array($code, [40100, 40101, 40102, 40104, 40105], true) => 'invalid_credentials',
                $code === 40103 => 'permission_required',
                default => 'api_error',
            });
        }

        $out = [];
        foreach ($json['data']['videos'] ?? [] as $v) {
            $views = (int) ($v['video_views'] ?? 0);
            $eng = (int) ($v['likes'] ?? 0) + (int) ($v['comments'] ?? 0) + (int) ($v['shares'] ?? 0);
            $ts = $v['create_time'] ?? null;
            $out[] = [
                'platform' => 'tiktok',
                'id' => (string) ($v['item_id'] ?? ''),
                'title' => (string) ($v['caption'] ?? ''),
                'thumbnail' => (string) ($v['thumbnail_url'] ?? ''),
                'url' => (string) ($v['share_url'] ?? ''),
                'publishedAt' => is_numeric($ts) ? date(DATE_ATOM, (int) $ts) : null,
                'views' => $views,
                'likes' => (int) ($v['likes'] ?? 0),
                'comments' => (int) ($v['comments'] ?? 0),
                'shares' => (int) ($v['shares'] ?? 0),
                'engagementRate' => $views > 0 ? round($eng / $views * 100, 2) : null,
                'completionRate' => isset($v['full_video_watched_rate']) ? round(((float) $v['full_video_watched_rate']) * 100, 2) : null,
            ];
        }

        usort($out, fn ($a, $b) => $b['views'] <=> $a['views']);

        return $out;
    }
}
