<?php

namespace App\Services\Meta;

use App\Services\Marketing\MarketingPeriod;
use Illuminate\Support\Facades\Http;

/**
 * Meta Graph API — Facebook Page + Instagram Business (read-only).
 * Token dibaca dari config('services.meta_graph.*') dan tidak pernah dikirim ke frontend.
 */
class MetaGraphClient
{
    private const BASE = 'https://graph.facebook.com';

    public function pageId(): ?string
    {
        $v = config('services.meta_graph.page_id');
        return filled($v) ? (string) $v : null;
    }

    public function instagramBusinessId(): ?string
    {
        $v = config('services.meta_graph.instagram_business_id');
        return filled($v) ? (string) $v : null;
    }

    public function accessToken(): ?string
    {
        $v = config('services.meta_graph.access_token');
        return filled($v) ? (string) $v : null;
    }

    private function version(): string
    {
        return (string) config('services.meta_ads.api_version', 'v21.0');
    }

    public function isConfigured(): bool
    {
        return $this->accessToken() !== null && ($this->pageId() !== null || $this->instagramBusinessId() !== null);
    }

    /** @return array{id: string, name: string, followers: int} */
    public function getFacebookPage(): array
    {
        $pageId = $this->pageId() ?? throw MetaGraphException::notConfigured('META_PAGE_ID belum diisi.');
        $data = $this->get("/{$pageId}", ['fields' => 'id,name,followers_count,fan_count']);

        return [
            'id' => (string) ($data['id'] ?? $pageId),
            'name' => (string) ($data['name'] ?? ''),
            'followers' => (int) ($data['followers_count'] ?? $data['fan_count'] ?? 0),
        ];
    }

    /** @return array{id: string, username: string, followers: int, media_count: int} */
    public function getInstagramAccount(): array
    {
        $igId = $this->instagramBusinessId() ?? throw MetaGraphException::notConfigured('META_INSTAGRAM_BUSINESS_ID belum diisi.');
        $data = $this->get("/{$igId}", ['fields' => 'id,username,followers_count,media_count']);

        return [
            'id' => (string) ($data['id'] ?? $igId),
            'username' => (string) ($data['username'] ?? ''),
            'followers' => (int) ($data['followers_count'] ?? 0),
            'media_count' => (int) ($data['media_count'] ?? 0),
        ];
    }

    /**
     * Reach + engagement harian Facebook Page.
     * Mencoba metrik Graph API v21+ (page_media_view / page_views_total) dan
     * fallback ke pembacaan engagement post langsung bila metrik lama ditolak (#100).
     *
     * @return array{reach: int, engagements: int, daily: list<array{date: string, reach: int, engagements: int}>}
     */
    public function facebookInsights(MarketingPeriod $period): array
    {
        $pageId = $this->pageId() ?? throw MetaGraphException::notConfigured('META_PAGE_ID belum diisi.');
        $since = $period->fromDate();
        $until = $period->to->addDay()->toDateString();

        $metricCandidates = [
            'page_media_view,page_post_engagements',
            'page_views_total,page_post_engagements',
            'page_post_engagements',
        ];

        $map = [
            'page_media_view' => 'reach',
            'page_views_total' => 'reach',
            'page_impressions_unique' => 'reach',
            'page_post_engagements' => 'engagements',
        ];

        $lastMetricException = null;
        foreach ($metricCandidates as $metricSet) {
            try {
                $data = $this->get("/{$pageId}/insights", [
                    'metric' => $metricSet,
                    'period' => 'day',
                    'since' => $since,
                    'until' => $until,
                ]);

                return $this->foldDaily($data['data'] ?? [], $map);
            } catch (MetaGraphException $e) {
                if ($e->status === 'invalid_token' || $e->status === 'permission_required') {
                    throw $e;
                }
                $lastMetricException = $e;
            }
        }

        // Fallback terakhir bila seluruh metrik Page Insights deprecated/ditolak di Page tipe baru:
        // baca engagement nyata dari daftar post di periode tersebut.
        try {
            $posts = $this->get("/{$pageId}/posts", [
                'fields' => 'id,created_time,likes.summary(true),comments.summary(true),shares',
                'since' => $period->from->timestamp,
                'until' => $period->to->addDay()->timestamp,
                'limit' => 50,
            ]);

            $rows = [];
            $totalEng = 0;
            foreach ($posts['data'] ?? [] as $post) {
                $date = substr((string) ($post['created_time'] ?? ''), 0, 10);
                if ($date === '') {
                    continue;
                }
                $eng = (int) ($post['likes']['summary']['total_count'] ?? 0)
                    + (int) ($post['comments']['summary']['total_count'] ?? 0)
                    + (int) ($post['shares']['count'] ?? 0);
                $totalEng += $eng;
                $rows[$date] ??= ['date' => $date, 'reach' => 0, 'engagements' => 0];
                $rows[$date]['engagements'] += $eng;
            }
            ksort($rows);

            return [
                'reach' => 0,
                'engagements' => $totalEng,
                'daily' => array_values($rows),
            ];
        } catch (\Throwable) {
            if ($lastMetricException) {
                throw $lastMetricException;
            }
            throw MetaGraphException::fromGraphResponse(['message' => 'Facebook Page insights tidak tersedia.'], 400);
        }
    }

    /**
     * Reach harian + agregat like/comment dari media yang terbit di periode.
     * @return array{reach: int, engagements: int, posts: int, daily: list<array{date: string, reach: int, engagements: int}>}
     */
    public function instagramInsights(MarketingPeriod $period): array
    {
        $igId = $this->instagramBusinessId() ?? throw MetaGraphException::notConfigured('META_INSTAGRAM_BUSINESS_ID belum diisi.');

        $insights = $this->get("/{$igId}/insights", [
            'metric' => 'reach',
            'period' => 'day',
            'since' => $period->fromDate(),
            'until' => $period->to->addDay()->toDateString(),
        ]);
        $folded = $this->foldDaily($insights['data'] ?? [], ['reach' => 'reach']);

        $media = $this->get("/{$igId}/media", [
            'fields' => 'id,timestamp,like_count,comments_count',
            'since' => $period->from->timestamp,
            'until' => $period->to->addDay()->timestamp,
            'limit' => 100,
        ]);

        $posts = 0;
        $engagements = 0;
        $byDate = [];
        foreach ($media['data'] ?? [] as $m) {
            $posts++;
            $e = (int) ($m['like_count'] ?? 0) + (int) ($m['comments_count'] ?? 0);
            $engagements += $e;
            $d = substr((string) ($m['timestamp'] ?? ''), 0, 10);
            $byDate[$d] = ($byDate[$d] ?? 0) + $e;
        }
        foreach ($folded['daily'] as &$row) {
            $row['engagements'] = $byDate[$row['date']] ?? 0;
        }
        unset($row);

        return [
            'reach' => $folded['reach'],
            'engagements' => $engagements,
            'posts' => $posts,
            'daily' => $folded['daily'],
        ];
    }

    /**
     * Daftar Instagram Reels / Video milik akun Business Livora + metrik nyata.
     *
     * @return list<array<string, mixed>>
     */
    public function instagramVideos(int $max = 12): array
    {
        $igId = $this->instagramBusinessId() ?? throw MetaGraphException::notConfigured('META_INSTAGRAM_BUSINESS_ID belum diisi.');

        $username = null;
        try {
            $acc = $this->getInstagramAccount();
            $username = $acc['username'] !== '' ? '@'.$acc['username'] : null;
        } catch (\Throwable) {
            // Username opsional; media list tetap bisa jalan.
        }

        $res = $this->get("/{$igId}/media", [
            'fields' => 'id,caption,media_type,media_product_type,permalink,thumbnail_url,media_url,timestamp,like_count,comments_count',
            'limit' => min(max($max * 3, 15), 50),
        ]);

        $videoMedia = [];
        foreach ($res['data'] ?? [] as $m) {
            $type = strtoupper((string) ($m['media_type'] ?? ''));
            $product = strtoupper((string) ($m['media_product_type'] ?? ''));
            if ($type !== 'VIDEO' && $product !== 'REELS') {
                continue;
            }
            $videoMedia[] = $m;
            if (count($videoMedia) >= $max) {
                break;
            }
        }

        $out = [];
        foreach ($videoMedia as $m) {
            $id = (string) ($m['id'] ?? '');
            if ($id === '') {
                continue;
            }
            $metrics = $this->fetchInstagramVideoMetrics($id);
            $likes = (int) ($m['like_count'] ?? 0);
            $comments = (int) ($m['comments_count'] ?? 0);
            $shares = $metrics['shares'];
            $saves = $metrics['saved'];
            $views = $metrics['views'] ?? $metrics['plays'] ?? $metrics['reach'];
            $denominator = ($views !== null && $views > 0)
                ? $views
                : (($metrics['reach'] ?? null) !== null && $metrics['reach'] > 0 ? $metrics['reach'] : null);

            $caption = trim((string) ($m['caption'] ?? ''));
            $firstLine = trim((string) strtok($caption, "\r\n"));
            $title = $firstLine !== '' ? mb_substr($firstLine, 0, 140) : ($caption !== '' ? mb_substr($caption, 0, 140) : 'Instagram Reel Livora');

            $engTotal = $likes + $comments + ($shares ?? 0) + ($saves ?? 0);

            $out[] = [
                'platform' => 'instagram',
                'id' => $id,
                'title' => $title,
                'channel' => $username ?? 'Instagram Livora',
                'thumbnail' => (string) ($m['thumbnail_url'] ?? $m['media_url'] ?? ''),
                'url' => (string) ($m['permalink'] ?? ''),
                'publishedAt' => isset($m['timestamp']) ? (string) $m['timestamp'] : null,
                'durationSeconds' => null,
                'views' => $views,
                'likes' => $likes,
                'comments' => $comments,
                'shares' => $shares,
                'saves' => $saves,
                'engagementRate' => $denominator ? round($engTotal / $denominator * 100, 2) : null,
                'metricsSource' => 'Instagram Graph API',
            ];
        }

        usort($out, fn ($a, $b) => ($b['views'] ?? $b['likes'] ?? 0) <=> ($a['views'] ?? $a['likes'] ?? 0));

        return $out;
    }

    /**
     * Ambil views/reach/saved/shares per Reel secara defensif supaya satu media
     * dengan metrik lama tidak menjatuhkan seluruh daftar video IG.
     *
     * @return array{views: ?int, plays: ?int, reach: ?int, saved: ?int, shares: ?int}
     */
    private function fetchInstagramVideoMetrics(string $mediaId): array
    {
        $metrics = ['views' => null, 'plays' => null, 'reach' => null, 'saved' => null, 'shares' => null];
        foreach (['views,reach,saved,shares', 'reach,saved,shares'] as $metricSet) {
            try {
                $res = $this->get("/{$mediaId}/insights", ['metric' => $metricSet]);
                foreach ($res['data'] ?? [] as $row) {
                    $name = (string) ($row['name'] ?? '');
                    if (array_key_exists($name, $metrics)) {
                        $val = $row['values'][0]['value'] ?? null;
                        $metrics[$name] = is_numeric($val) ? (int) $val : null;
                    }
                }
                break;
            } catch (\Throwable) {
                // Coba metric set fallback tanpa throws agar caption & permalink tetap tampil.
            }
        }

        return $metrics;
    }

    /** Lipat respons insights Graph (per metric → values[]) jadi baris per tanggal. */
    private function foldDaily(array $metrics, array $map): array
    {
        $rows = [];
        $totals = array_fill_keys(array_values($map), 0);

        foreach ($metrics as $metric) {
            $key = $map[$metric['name'] ?? ''] ?? null;
            if ($key === null) {
                continue;
            }
            foreach ($metric['values'] ?? [] as $v) {
                $date = substr((string) ($v['end_time'] ?? ''), 0, 10);
                $val = (int) ($v['value'] ?? 0);
                $rows[$date] ??= ['date' => $date] + array_fill_keys(array_values($map), 0);
                $rows[$date][$key] = $val;
                $totals[$key] += $val;
            }
        }
        ksort($rows);

        return $totals + ['daily' => array_values($rows)];
    }

    /** @return array<string, mixed> */
    private function get(string $path, array $params = []): array
    {
        $token = $this->accessToken() ?? throw MetaGraphException::notConfigured('META_GRAPH_ACCESS_TOKEN belum diisi.');

        $response = Http::timeout(20)
            ->acceptJson()
            ->get(self::BASE.'/'.$this->version().$path, $params + ['access_token' => $token]);

        $json = $response->json();

        if ($response->failed() || isset($json['error'])) {
            throw MetaGraphException::fromGraphResponse(
                is_array($json['error'] ?? null) ? $json['error'] : ['message' => $response->body()],
                $response->status(),
            );
        }

        return is_array($json) ? $json : [];
    }
}
