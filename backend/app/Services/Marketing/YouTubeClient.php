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

    /**
     * Video terbaru milik channel Livora, lengkap dengan statistik nyata.
     * Dipakai sebagai "sumber" di Content Inspiration (pilih video → cari yang serupa).
     *
     * @return list<array<string, mixed>>
     */
    public function channelVideos(int $max = 12): array
    {
        if (! $this->isConfigured()) {
            throw MarketingApiException::notConfigured('YouTube belum dikonfigurasi. Isi YOUTUBE_API_KEY dan YOUTUBE_CHANNEL_ID di backend/.env.');
        }

        $search = $this->get('/search', [
            'part' => 'id',
            'channelId' => (string) config('services.youtube.channel_id'),
            'type' => 'video',
            'order' => 'date',
            'maxResults' => max(1, min($max, 50)),
        ]);

        $ids = array_values(array_filter(array_map(fn ($i) => $i['id']['videoId'] ?? null, $search['items'] ?? [])));

        return $ids === [] ? [] : $this->hydrate($ids);
    }

    /**
     * Cari video publik yang mirip dengan sebuah topik/judul. Hanya data asli
     * dari YouTube Data API — tidak ada satupun angka yang dikarang.
     *
     * @return list<array<string, mixed>>
     */
    public function searchSimilar(string $query, int $max = 12): array
    {
        if (! $this->isConfigured()) {
            throw MarketingApiException::notConfigured('YouTube belum dikonfigurasi. Isi YOUTUBE_API_KEY di backend/.env.');
        }

        $search = $this->get('/search', [
            'part' => 'id',
            'q' => $query,
            'type' => 'video',
            'order' => 'relevance',
            'maxResults' => max(1, min($max, 25)),
        ]);

        $ids = array_values(array_filter(array_map(fn ($i) => $i['id']['videoId'] ?? null, $search['items'] ?? [])));
        if ($ids === []) {
            return [];
        }

        $ownChannel = (string) config('services.youtube.channel_id');
        $videos = array_values(array_filter(
            $this->hydrate($ids),
            fn ($v) => $v['channelId'] !== $ownChannel,
        ));

        usort($videos, fn ($a, $b) => $b['views'] <=> $a['views']);

        return $videos;
    }

    /**
     * @param  list<string>  $ids
     * @return list<array<string, mixed>>
     */
    private function hydrate(array $ids): array
    {
        $res = $this->get('/videos', ['part' => 'snippet,statistics,contentDetails', 'id' => implode(',', $ids)]);

        $out = [];
        foreach ($res['items'] ?? [] as $v) {
            $s = $v['statistics'] ?? [];
            $sn = $v['snippet'] ?? [];
            $views = (int) ($s['viewCount'] ?? 0);
            $eng = (int) ($s['likeCount'] ?? 0) + (int) ($s['commentCount'] ?? 0);
            $out[] = [
                'platform' => 'youtube',
                'id' => (string) ($v['id'] ?? ''),
                'title' => (string) ($sn['title'] ?? ''),
                'channel' => (string) ($sn['channelTitle'] ?? ''),
                'channelId' => (string) ($sn['channelId'] ?? ''),
                'thumbnail' => (string) ($sn['thumbnails']['medium']['url'] ?? $sn['thumbnails']['default']['url'] ?? ''),
                'publishedAt' => (string) ($sn['publishedAt'] ?? ''),
                'url' => 'https://www.youtube.com/watch?v='.($v['id'] ?? ''),
                'durationSeconds' => self::parseDuration((string) ($v['contentDetails']['duration'] ?? '')),
                'views' => $views,
                'likes' => (int) ($s['likeCount'] ?? 0),
                'comments' => (int) ($s['commentCount'] ?? 0),
                'engagementRate' => $views > 0 ? round($eng / $views * 100, 2) : null,
            ];
        }

        return $out;
    }

    /** ISO-8601 duration (PT4M13S) → detik. null kalau tidak dilaporkan API. */
    private static function parseDuration(string $iso): ?int
    {
        if ($iso === '' || ! preg_match('/^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/', $iso, $m)) {
            return null;
        }

        return ((int) ($m[1] ?? 0)) * 86400 + ((int) ($m[2] ?? 0)) * 3600 + ((int) ($m[3] ?? 0)) * 60 + (int) ($m[4] ?? 0);
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
