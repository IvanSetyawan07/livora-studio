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
     * @return array{reach: int, engagements: int, daily: list<array{date: string, reach: int, engagements: int}>}
     */
    public function facebookInsights(MarketingPeriod $period): array
    {
        $pageId = $this->pageId() ?? throw MetaGraphException::notConfigured('META_PAGE_ID belum diisi.');
        $data = $this->get("/{$pageId}/insights", [
            'metric' => 'page_impressions_unique,page_post_engagements',
            'period' => 'day',
            'since' => $period->fromDate(),
            'until' => $period->to->addDay()->toDateString(),
        ]);

        return $this->foldDaily($data['data'] ?? [], [
            'page_impressions_unique' => 'reach',
            'page_post_engagements' => 'engagements',
        ]);
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
