<?php

namespace App\Services\AI;

use App\Services\Marketing\MarketingPeriod;
use App\Services\Marketing\MarketingSection;
use App\Services\Marketing\TikTokClient;
use App\Services\Marketing\YouTubeClient;
use App\Services\Meta\MetaGraphClient;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Content Agent — menganalisis performa produk, proyek, promo banner,
 * wishlist, email marketing, serta akun social (IG/FB/TikTok/YouTube),
 * lalu menghasilkan rekomendasi konten + draft visual di Content Queue.
 */
class ContentAgentService extends BaseAgentService
{
    private const WINDOW_DAYS = 30;

    public const MIN_INTERACTIONS = 3;

    public function __construct(
        AIProviderManager $ai,
        private MetaGraphClient $meta,
        private TikTokClient $tiktok,
        private YouTubeClient $youtube,
        private ?MarketIntelligenceService $market = null,
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
        return array_merge(['Website Content', 'Market Trends'], $snapshot['connected_social_platforms'] ?? []);
    }

    protected function emptyMessage(): string
    {
        return 'Interaksi katalog & data konten masih terlalu sedikit dan belum ada akun sosial yang tersambung.';
    }

    protected function roleBrief(): string
    {
        return 'Kamu adalah Creative, Market & Content Strategist untuk Livora Studio (interior design & furniture premium di Jakarta). '
            .'Analisis: (1) tren pasar interior luxury eksternal & format konten yang sedang efektif di industri (di luar akun kita sendiri), '
            .'(2) produk & proyek yang paling banyak dilihat/di-wishlist, promo aktif, dan performa sosial media, '
            .'serta (3) daftar draft terakhir agar kamu TIDAK mengulang ide yang sama persis. '
            .'Rekomendasikan kombinasi konten baru — termasuk ide segar terinspirasi pasar luar (IG Reels/Carousel, TikTok, YouTube, Email Newsletter). '
            .'Sertakan `"target_type"` ("item", "project", atau "promo_banner") dan `"target_id"` (angka ID nyata dari snapshot bila merujuk aset spesifik, atau null bila kampanye edukasi/brand), '
            .'serta `"channel"` ("instagram"|"facebook"|"email"|"tiktok"|"youtube"), `"headline"`, dan `"caption"` di dalam `recommendation`.';
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
            ->selectRaw('items.id, items.title as name, items.slug, COUNT(*) as clicks')
            ->groupBy('items.id', 'items.title', 'items.slug')
            ->orderByDesc('clicks')->limit(12)->get()
            ->map(fn ($r) => ['target_type' => 'item', 'target_id' => (int) $r->id, 'name' => $r->name, 'slug' => $r->slug, 'clicks' => (int) $r->clicks])->all();

        $topProjects = DB::table('item_clicks')
            ->join('projects', 'projects.id', '=', 'item_clicks.target_id')
            ->where('item_clicks.target_type', 'project')
            ->whereBetween('item_clicks.clicked_at', [$from, $to])
            ->selectRaw('projects.id, projects.title as name, projects.slug, COUNT(*) as clicks')
            ->groupBy('projects.id', 'projects.title', 'projects.slug')
            ->orderByDesc('clicks')->limit(12)->get()
            ->map(fn ($r) => ['target_type' => 'project', 'target_id' => (int) $r->id, 'name' => $r->name, 'slug' => $r->slug, 'clicks' => (int) $r->clicks])->all();

        // Jika klik belum banyak, tetap ambil sample produk & project aktif sebagai bahan editorial.
        if (empty($topItems) && Schema::hasTable('items')) {
            $topItems = DB::table('items')
                ->orderByDesc('id')->limit(6)->get(['id', 'title', 'slug'])
                ->map(fn ($r) => ['target_type' => 'item', 'target_id' => (int) $r->id, 'name' => $r->title, 'slug' => $r->slug, 'clicks' => 0])->all();
        }
        if (empty($topProjects) && Schema::hasTable('projects')) {
            $topProjects = DB::table('projects')
                ->orderByDesc('is_highlighted')->orderBy('sort_order')->limit(6)->get(['id', 'title', 'slug'])
                ->map(fn ($r) => ['target_type' => 'project', 'target_id' => (int) $r->id, 'name' => $r->title, 'slug' => $r->slug, 'clicks' => 0])->all();
        }

        $promoItems = Schema::hasTable('items') && Schema::hasColumn('items', 'is_on_promo')
            ? DB::table('items')->where('is_on_promo', true)->limit(8)->get(['id', 'title', 'promo_badge_text'])
                ->map(fn ($r) => ['target_type' => 'item', 'target_id' => (int) $r->id, 'title' => $r->title, 'badge' => $r->promo_badge_text])->all()
            : [];

        $promoBanners = Schema::hasTable('promo_banners')
            ? DB::table('promo_banners')->where('is_active', true)->limit(5)->get(['id', 'title', 'subtitle', 'label'])
                ->map(fn ($r) => ['target_type' => 'promo_banner', 'target_id' => (int) $r->id, 'title' => $r->title, 'label' => $r->label])->all()
            : [];

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

        $hasCatalog = ! empty($topItems) || ! empty($topProjects) || ! empty($promoBanners);
        if (($totalClicks + $totalSaves) < self::MIN_INTERACTIONS && empty($social['platforms']) && ! $hasCatalog) {
            return null;
        }

        $recentDrafts = Schema::hasTable('ai_content_drafts')
            ? DB::table('ai_content_drafts')->orderByDesc('id')->limit(10)->pluck('title')->all()
            : [];

        return [
            'window' => [
                'from' => $period->fromDate(),
                'to' => $period->toDate(),
                'days' => $period->days(),
            ],
            'market_brief' => $this->market?->compactBrief(),
            'recent_draft_titles_avoid_duplicate' => $recentDrafts,
            'onsite_content' => [
                'total_clicks' => (int) $totalClicks,
                'clicks_by_target_type' => $clicksByType,
                'total_wishlist_saves' => $totalSaves,
                'wishlist_saves_by_type' => $wishlistByType,
                'top_items' => $topItems,
                'top_projects' => $topProjects,
                'active_promo_items' => $promoItems,
                'active_promo_banners' => $promoBanners,
            ],
            'connected_social_platforms' => $social['platforms'],
            'social' => $social['data'],
        ];
    }

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
                    'reach' => $s['views_in_period'], 'engagements' => $s['engagements'], 'posts' => $s['videos_in_period']];
            }),
        ];

        $platforms = [];
        $data = [];
        foreach ($sections as $key => $s) {
            if (($s['status'] ?? null) === 'ok') {
                $platforms[] = $s['label'];
                $data[$key] = $s;
            }
        }

        return ['platforms' => $platforms, 'data' => $data];
    }
}
