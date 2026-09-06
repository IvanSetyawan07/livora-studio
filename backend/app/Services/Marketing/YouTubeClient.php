<?php

namespace App\Services\Marketing;

use Illuminate\Support\Facades\Http;

/**
 * YouTube Data API v3 (API key). Statistik channel + agregat video yang terbit di periode.
 * Deret harian TIDAK tersedia lewat API key (butuh YouTube Analytics OAuth) → series dikembalikan kosong
 * dengan seriesAvailable=false, bukan diisi angka rekaan.
 */
class YouTubeClient
{
    private const BASE = 'https://www.googleapis.com/youtube/v3';

    public function isConfigured(): bool
    {
        return filled(config('services.youtube.api_key')) && filled(config('services.youtube.channel_id'));
    }

    /**
     * @return array{title: string, subscribers: int, total_views: int, videos_in_period: int, views_in_period: int, engagements: int, seriesAvailable: bool, daily: list<array{date: string, views: int, engagements: int}>}
     */
    public function summary(MarketingPeriod $period): array
    {
        if (! $this->isConfigured()) {
            throw MarketingApiException::notConfigured('YouTube belum dikonfigurasi. Isi YOUTUBE_API_KEY dan YOUTUBE_CHANNEL_ID di backend/.env.');
        }

        $channelId = (string) config('services.youtube.channel_id');

        $channel = $this->get('/channels', ['part' => 'snippet,statistics', 'id' => $channelId]);
        $item = $channel['items'][0] ?? [];
        $stats = $item['statistics'] ?? [];

        $search = $this->get('/search', [
            'part' => 'id',
            'channelId' => $channelId,
            'type' => 'video',
            'order' => 'date',
            'maxResults' => 50,
            'publishedAfter' => $period->from->toIso8601ZuluString(),
            'publishedBefore' => $period->to->addDay()->toIso8601ZuluString(),
        ]);
        $ids = array_values(array_filter(array_map(fn ($i) => $i['id']['videoId'] ?? null, $search['items'] ?? [])));

        $views = 0;
        $eng = 0;
        if ($ids !== []) {
            $videos = $this->get('/videos', ['part' => 'statistics', 'id' => implode(',', $ids)]);
            foreach ($videos['items'] ?? [] as $v) {
                $s = $v['statistics'] ?? [];
                $views += (int) ($s['viewCount'] ?? 0);
                $eng += (int) ($s['likeCount'] ?? 0) + (int) ($s['commentCount'] ?? 0);
            }
        }

        return [
            'title' => (string) ($item['snippet']['title'] ?? ''),
            'subscribers' => (int) ($stats['subscriberCount'] ?? 0),
            'total_views' => (int) ($stats['viewCount'] ?? 0),
            'videos_in_period' => count($ids),
            'views_in_period' => $views,
            'engagements' => $eng,
            'seriesAvailable' => false,
            'daily' => [],
        ];
    }

    private function get(string $path, array $params): array
    {
        $res = Http::timeout(20)->get(self::BASE.$path, $params + ['key' => (string) config('services.youtube.api_key')]);
        if ($res->failed()) {
            throw MarketingApiException::fromHttp('YouTube', $res->status(), $res->body());
        }

        return (array) $res->json();
    }
}
