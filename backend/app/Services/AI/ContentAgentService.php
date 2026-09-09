<?php

namespace App\Services\AI;

use App\Services\Marketing\MarketingPeriod;
use App\Services\Marketing\MarketingSection;
use App\Services\Marketing\TikTokClient;
use App\Services\Marketing\YouTubeClient;
use App\Services\Meta\MetaGraphClient;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Content Agent — menganalisis performa konten: halaman/katalog milik Livora
 * (klik item & project, wishlist) plus social media kalau platformnya sudah
 * tersambung (sumber yang sama dengan ContentController::summary()).
 *
 * Data on-site selalu ada tanpa integrasi eksternal, jadi agent ini bisa jalan
 * lebih dulu; social hanya ditambahkan ke snapshot kalau statusnya 'ok'.
 */
class ContentAgentService extends BaseAgentService
{
    private const WINDOW_DAYS = 30;

    /** Minimal interaksi on-site supaya analisis konten punya makna. */
    public const MIN_INTERACTIONS = 10;

    public function __construct(
        AIProviderManager $ai,
        private MetaGraphClient $meta,
        private TikTokClient $tiktok,
        private YouTubeClient $youtube,
    ) {
        parent::__construct($ai);
    }

    protected function agentKey(): string
    {
        return 'content';
    }

    protected function agentLabel(): string
    {
        return 'Content Agent';
    }

    protected function defaultActionType(): string
    {
        return 'content';
    }

    protected function sourceLabels(array $snapshot): array
    {
        return array_merge(['Website Content'], $snapshot['connected_social_platforms'] ?? []);
    }

    protected function emptyMessage(): string
    {
        return 'Interaksi konten pada 30 hari terakhir masih di bawah '.self::MIN_INTERACTIONS
            .' (klik item/project + wishlist) dan belum ada akun social yang tersambung. '
            .'Tidak ada insight yang dibuat.';
    }

    protected function roleBrief(): string
    {
        return 'Kamu adalah Content Performance Analyst untuk Livora Studio, platform interior '
            .'design & furniture custom di Indonesia. Tugasmu menganalisis konten mana yang '
            .'menarik perhatian (klik item/project, wishlist, engagement social) dan mana yang '
            .'diabaikan, lalu menemukan tema/kategori konten yang layak diperbanyak atau '
            .'diperbaiki.';
    }

    protected function buildSnapshot(): ?array
    {
        $period = MarketingPeriod::fromRequest(new Request(['days' => self::WINDOW_DAYS]), self::WINDOW_DAYS);
        $from = $period->fromDate().' 00:00:00';
        $to = $period->toDate().' 23:59:59';

        $clicksByType = DB::table('item_clicks')
            ->selectRaw('target_type, COUNT(*) as n')
            ->whereBetween('clicked_at', [$from, $to])
            ->groupBy('target_type')->pluck('n', 'target_type')->toArray();

        $topItems = DB::table('item_clicks')
            ->join('items', 'items.id', '=', 'item_clicks.target_id')
            ->where('item_clicks.target_type', 'item')
            ->whereBetween('item_clicks.clicked_at', [$from, $to])
            ->selectRaw('items.name as name, COUNT(*) as clicks')
            ->groupBy('items.name')->orderByDesc('clicks')->limit(15)->get()
            ->map(fn ($r) => ['name' => $r->name, 'clicks' => (int) $r->clicks])->all();

        $topProjects = DB::table('item_clicks')
            ->join('projects', 'projects.id', '=', 'item_clicks.target_id')
            ->where('item_clicks.target_type', 'project')
            ->whereBetween('item_clicks.clicked_at', [$from, $to])
            ->selectRaw('projects.title as name, COUNT(*) as clicks')
            ->groupBy('projects.title')->orderByDesc('clicks')->limit(15)->get()
            ->map(fn ($r) => ['name' => $r->name, 'clicks' => (int) $r->clicks])->all();

        $wishlistByType = DB::table('wishlists')
            ->selectRaw('wishlistable_type, COUNT(*) as n')
            ->whereBetween('created_at', [$from, $to])
            ->groupBy('wishlistable_type')->get()
            ->map(fn ($r) => [
                'type' => class_basename($r->wishlistable_type),
                'saves' => (int) $r->n,
            ])->all();

        $totalClicks = array_sum($clicksByType);
        $totalSaves = array_sum(array_column($wishlistByType, 'saves'));

        $social = $this->socialSnapshot($period);

        if (($totalClicks + $totalSaves) < self::MIN_INTERACTIONS && empty($social['platforms'])) {
            return null;
        }

        return [
            'window' => [
                'from' => $period->fromDate(),
                'to' => $period->toDate(),
                'days' => $period->days(),
            ],
            'onsite_content' => [
                'total_clicks' => (int) $totalClicks,
                'clicks_by_target_type' => $clicksByType,
                'total_wishlist_saves' => $totalSaves,
                'wishlist_saves_by_type' => $wishlistByType,
                'top_items_by_clicks' => $topItems,
                'top_projects_by_clicks' => $topProjects,
            ],
            'connected_social_platforms' => $social['platforms'],
            'social' => $social['data'],
        ];
    }

    /** Social hanya masuk snapshot kalau platformnya benar-benar merespons 'ok'. */
    private function socialSnapshot(MarketingPeriod $period): array
    {
        $sections = [
            'instagram' => MarketingSection::attempt($period->cacheKey('content:instagram'), function () use ($period) {
                $acc = $this->meta->getInstagramAccount();
                $ins = $this->meta->instagramInsights($period);

                return ['label' => 'Instagram', 'followers' => $acc['followers'],
                    'reach' => $ins['reach'], 'engagements' => $ins['engagements'], 'posts' => $ins['posts']];
            }),
            'facebook' => MarketingSection::attempt($period->cacheKey('content:facebook'), function () use ($period) {
                $page = $this->meta->getFacebookPage();
                $ins = $this->meta->facebookInsights($period);

                return ['label' => 'Facebook Page', 'followers' => $page['followers'],
                    'reach' => $ins['reach'], 'engagements' => $ins['engagements'], 'posts' => null];
            }),
            'tiktok' => MarketingSection::attempt($period->cacheKey('content:tiktok'), function () use ($period) {
                $s = $this->tiktok->summary($period);

                return ['label' => 'TikTok', 'followers' => $s['followers'],
                    'reach' => $s['views'], 'engagements' => $s['engagements'], 'posts' => null];
            }),
            'youtube' => MarketingSection::attempt($period->cacheKey('content:youtube'), function () use ($period) {
                $s = $this->youtube->summary($period);

                return ['label' => 'YouTube', 'followers' => $s['subscribers'],
                    'reach' => $s['views_in_period'], 'engagements' => $s['engagements'],
                    'posts' => $s['videos_in_period']];
            }),
        ];

        $platforms = [];
        $data = [];

        foreach ($sections as $section) {
            if (($section['status'] ?? null) !== 'ok') {
                continue;
            }

            $platforms[] = $section['label'];
            $data[] = [
                'platform' => $section['label'],
                'followers' => $section['followers'],
                'reach' => $section['reach'],
                'engagements' => $section['engagements'],
                'posts_in_period' => $section['posts'],
                'engagement_rate_percent' => ($section['reach'] ?? 0) > 0
                    ? round($section['engagements'] / $section['reach'] * 100, 2) : null,
            ];
        }

        return ['platforms' => $platforms, 'data' => $data];
    }
}
