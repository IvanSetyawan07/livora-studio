<?php

namespace App\Http\Controllers\Api\Ai;

use App\Http\Controllers\Controller;
use App\Services\Marketing\MarketingPeriod;
use App\Services\Marketing\MarketingSection;
use App\Services\Marketing\TikTokClient;
use App\Services\Marketing\YouTubeClient;
use App\Services\Meta\MetaGraphClient;
use Illuminate\Http\Request;

class ContentController extends Controller
{
    public function __construct(
        private MetaGraphClient $meta,
        private TikTokClient $tiktok,
        private YouTubeClient $youtube,
    ) {
    }

    /** GET /api/ai/content/summary?from&to|days */
    public function summary(Request $request)
    {
        $period = MarketingPeriod::fromRequest($request, 30);

        $platforms = [
            'instagram' => MarketingSection::attempt($period->cacheKey('content:instagram'), function () use ($period) {
                $acc = $this->meta->getInstagramAccount();
                $ins = $this->meta->instagramInsights($period);

                return [
                    'label' => 'Instagram', 'handle' => '@'.$acc['username'],
                    'followers' => $acc['followers'], 'reach' => $ins['reach'],
                    'engagements' => $ins['engagements'], 'posts' => $ins['posts'],
                    'daily' => $ins['daily'],
                ];
            }),
            'facebook' => MarketingSection::attempt($period->cacheKey('content:facebook'), function () use ($period) {
                $page = $this->meta->getFacebookPage();
                $ins = $this->meta->facebookInsights($period);

                return [
                    'label' => 'Facebook Page', 'handle' => $page['name'],
                    'followers' => $page['followers'], 'reach' => $ins['reach'],
                    'engagements' => $ins['engagements'], 'posts' => null,
                    'daily' => $ins['daily'],
                ];
            }),
            'tiktok' => MarketingSection::attempt($period->cacheKey('content:tiktok'), function () use ($period) {
                $s = $this->tiktok->summary($period);

                return [
                    'label' => 'TikTok', 'handle' => null,
                    'followers' => $s['followers'], 'reach' => $s['views'],
                    'engagements' => $s['engagements'], 'posts' => null,
                    'daily' => array_map(fn ($d) => ['date' => $d['date'], 'reach' => $d['views'], 'engagements' => $d['engagements']], $s['daily']),
                ];
            }),
            'youtube' => MarketingSection::attempt($period->cacheKey('content:youtube'), function () use ($period) {
                $s = $this->youtube->summary($period);

                return [
                    'label' => 'YouTube', 'handle' => $s['title'],
                    'followers' => $s['subscribers'], 'reach' => $s['views_in_period'],
                    'engagements' => $s['engagements'], 'posts' => $s['videos_in_period'],
                    'daily' => [], 'seriesAvailable' => false,
                ];
            }),
        ];

        $followers = 0;
        $reach = 0;
        $eng = 0;
        $posts = 0;
        $byDate = [];
        foreach ($platforms as $key => $p) {
            if (($p['status'] ?? null) !== 'ok') {
                continue;
            }
            $followers += $p['followers'];
            $reach += $p['reach'];
            $eng += $p['engagements'];
            $posts += (int) ($p['posts'] ?? 0);
            foreach ($p['daily'] as $row) {
                $byDate[$row['date']] ??= ['date' => $row['date']];
                $byDate[$row['date']][$key] = (int) ($row['engagements'] ?? 0);
            }
        }
        ksort($byDate);

        $anyOk = collect($platforms)->contains(fn ($p) => ($p['status'] ?? null) === 'ok');
        $weeks = max(1, $period->days() / 7);

        return response()->json([
            'status' => $anyOk ? 'ok' : 'not_configured',
            'period' => $period->toArray(),
            'generatedAt' => now()->toIso8601String(),
            'kpis' => [
                'followers' => $followers,
                'engagementRate' => $reach > 0 ? round($eng / $reach * 100, 2) : null,
                'postsPerWeek' => $anyOk ? round($posts / $weeks, 1) : null,
                'reach' => $reach,
            ],
            'engagementSeries' => array_values($byDate),
            'platforms' => collect($platforms)->map(fn ($p) => collect($p)->except(['daily'])->all())->all(),
        ]);
    }
}
