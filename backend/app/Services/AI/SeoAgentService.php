<?php

namespace App\Services\AI;

use App\Models\AiActivityLog;
use App\Models\AiAgent;
use App\Models\AiApproval;
use App\Models\AiInsight;
use App\Models\AiRecommendation;
use App\Models\Item;
use App\Models\Project;
use App\Services\Google\GoogleBusinessProfileClient;
use App\Services\Google\GoogleSearchConsoleClient;
use App\Services\Google\SearchConsoleSiteResolver;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Throwable;

/**
 * SEO Agent — menggabungkan data Google Search Console, Google Business Profile
 * (Local SEO showroom), dan Audit On-Page Katalog (`items` & `projects`) nyata
 * dari database Livora.
 *
 * Setiap rekomendasi `on_page` sekarang menyertakan `target_type` ('item'|'project')
 * dan `target_id` yang valid dari database, sehingga `OnPageActionExecutor` dapat
 * mengeksekusinya langsung saat admin mengklik Approve & Execute.
 */
class SeoAgentService
{
    private const AGENT_KEY = 'seo';

    private const WINDOW_DAYS = 28;

    private const MIN_IMPRESSIONS = 50;

    private const MIN_QUERY_ROWS = 3;

    public function __construct(
        private AIProviderManager $ai,
        private GoogleSearchConsoleClient $searchConsole,
        private SearchConsoleSiteResolver $siteResolver,
        private ?GoogleBusinessProfileClient $gbp = null,
    ) {
    }

    /**
     * @return array{status: string, message?: string, insights_created?: int, recommendations_created?: int, provider?: string, raw?: string}
     */
    public function run(int $limit = 5): array
    {
        $gsc = $this->buildSeoSnapshot();
        $catalog = $this->buildCatalogSeoSnapshot();
        $local = $this->buildLocalSnapshot();

        $hasGsc = ! isset($gsc['error']);
        $hasCatalog = ! empty($catalog['items_needing_meta']) || ! empty($catalog['projects_needing_meta']) || ! empty($catalog['top_viewed_catalog']);
        $hasLocal = $local !== null;

        if (! $hasGsc && ! $hasCatalog && ! $hasLocal) {
            return [
                'status' => 'empty',
                'message' => $gsc['error'] ?? 'Belum ada data Search Console, Local SEO, atau katalog yang cukup untuk dianalisis secara jujur.',
            ];
        }

        $snapshot = [
            'period_days' => self::WINDOW_DAYS,
            'search_console' => $hasGsc ? $gsc : ['connected' => false, 'note' => $gsc['error'] ?? 'Search Console belum siap / trafik masih kecil.'],
            'local_seo_gbp' => $local ?? ['connected' => false],
            'catalog_onpage' => $catalog,
        ];

        $allowedTargets = $this->allowedTargetMap($catalog);

        try {
            $result = $this->ai->ask(
                $this->systemPrompt($limit),
                $this->userPrompt($snapshot),
                self::AGENT_KEY
            );
        } catch (Throwable $e) {
            AiActivityLog::create([
                'actor' => 'AI',
                'agent_key' => self::AGENT_KEY,
                'message' => 'SEO Agent gagal generate insight: '.$e->getMessage(),
                'kind' => 'system',
            ]);

            return ['status' => 'error', 'message' => $e->getMessage()];
        }

        $items = $this->parseResponse($result['text']);

        if (empty($items)) {
            AiActivityLog::create([
                'actor' => 'AI',
                'agent_key' => self::AGENT_KEY,
                'message' => 'SEO Agent merespons tapi tidak menghasilkan insight yang valid (format JSON tidak sesuai skema). Tidak ada data yang ditulis.',
                'kind' => 'system',
            ]);

            return [
                'status' => 'error',
                'message' => 'Respons AI tidak bisa di-parse jadi insight yang valid.',
                'raw' => $result['text'],
            ];
        }

        $items = array_slice($items, 0, $limit);

        $sources = [];
        if ($hasGsc) {
            $sources[] = 'Google Search Console';
        }
        if ($hasLocal) {
            $sources[] = 'Google Business Profile';
        }
        if ($hasCatalog) {
            $sources[] = 'Catalog On-Page SEO';
        }

        $insightsCreated = 0;
        $recommendationsCreated = 0;
        $firstRecommendationId = null;

        DB::transaction(function () use ($items, $sources, $allowedTargets, &$insightsCreated, &$recommendationsCreated, &$firstRecommendationId) {
            foreach ($items as $item) {
                $insight = AiInsight::create([
                    'title' => $item['title'],
                    'description' => $item['description'],
                    'type' => $item['type'],
                    'severity' => $item['severity'],
                    'confidence' => $this->clampConfidence($item['confidence']),
                    'source' => $sources,
                    'agent_key' => self::AGENT_KEY,
                    'reasoning' => $item['reasoning'],
                    'what_happened' => $item['what_happened'],
                    'why_it_matters' => $item['why_it_matters'],
                    'expected_impact' => $item['expected_impact'],
                    'metrics' => null,
                    'analytics_href' => null,
                ]);
                $insightsCreated++;

                $recData = $item['recommendation'] ?? null;

                if (is_array($recData) && $this->isValidRecommendation($recData)) {
                    $targetType = isset($recData['target_type']) && is_string($recData['target_type'])
                        ? strtolower(trim($recData['target_type']))
                        : null;
                    $targetId = isset($recData['target_id']) && is_numeric($recData['target_id'])
                        ? (int) $recData['target_id']
                        : null;

                    $actionType = $recData['action_type'] ?? 'on_page';

                    if ($targetType && $targetId && isset($allowedTargets["{$targetType}:{$targetId}"])) {
                        // Valid target from AI output
                    } elseif ($actionType === 'on_page' && ! empty($allowedTargets)) {
                        $first = reset($allowedTargets);
                        $targetType = $first['target_type'];
                        $targetId = $first['target_id'];
                    } else {
                        $targetType = null;
                        $targetId = null;
                    }

                    $recommendation = AiRecommendation::create([
                        'insight_id' => $insight->id,
                        'title' => $recData['title'],
                        'description' => $recData['description'],
                        'action_type' => $actionType,
                        'target_type' => $targetType,
                        'target_id' => $targetId,
                        'risk' => in_array($recData['risk'] ?? null, ['low', 'medium', 'high'], true)
                            ? $recData['risk'] : 'low',
                        'status' => 'pending',
                        'expected_impact' => $recData['expected_impact'] ?? $item['expected_impact'],
                        'confidence' => $this->clampConfidence($recData['confidence'] ?? $item['confidence']),
                        'agent_key' => self::AGENT_KEY,
                        'priority' => in_array($recData['priority'] ?? null, ['low', 'medium', 'high'], true)
                            ? $recData['priority'] : 'medium',
                        'why' => $recData['why'] ?? null,
                        'suggested_action' => $recData['suggested_action'] ?? null,
                        'change_from' => isset($recData['change_from']) && is_string($recData['change_from'])
                            ? mb_substr($recData['change_from'], 0, 250) : null,
                        'change_to' => isset($recData['change_to']) && is_string($recData['change_to'])
                            ? mb_substr($recData['change_to'], 0, 250) : null,
                    ]);

                    AiApproval::ensureForRecommendation($recommendation);
                    $insight->update(['recommendation_id' => $recommendation->id]);
                    $firstRecommendationId ??= $recommendation->id;
                    $recommendationsCreated++;
                }
            }
        });

        AiAgent::where('key', self::AGENT_KEY)->update([
            'status' => 'active',
            'connection_state' => 'connected',
            'last_run_at' => now(),
        ]);

        if ($hasGsc) {
            AiAgent::setDependencyState(self::AGENT_KEY, 'Google Search Console', 'connected');
        }

        AiActivityLog::create([
            'actor' => 'AI',
            'agent_key' => self::AGENT_KEY,
            'title' => $recommendationsCreated > 0 ? 'SEO Agent · Rekomendasi Baru' : 'SEO Agent · Insight Baru',
            'message' => "SEO Agent menghasilkan {$insightsCreated} insight baru "
                ."({$recommendationsCreated} disertai rekomendasi) dari ".implode(', ', $sources).", via provider {$result['provider']}.",
            'kind' => $recommendationsCreated > 0 ? 'recommendation' : 'insight',
            'recommendation_id' => $firstRecommendationId,
            'href' => $recommendationsCreated > 0
                ? '/admin/ai-marketing/ai-center/recommendations'
                : '/admin/ai-marketing/seo',
        ]);

        return [
            'status' => 'ok',
            'insights_created' => $insightsCreated,
            'recommendations_created' => $recommendationsCreated,
            'provider' => $result['provider'],
        ];
    }

    public function buildSeoSnapshot(int $days = self::WINDOW_DAYS): array
    {
        $resolved = $this->siteResolver->resolve();

        if ($resolved['site'] === null) {
            return ['error' => $resolved['reason']
                ?? 'Google Search Console belum terhubung. Hubungkan dulu dari halaman SEO Agent.'];
        }

        $site = $resolved['site'];
        $end = now()->toDateString();
        $start = now()->subDays($days)->toDateString();

        try {
            $byQuery = $this->searchConsole->searchAnalytics($site, $start, $end, ['query'], 25);
            $byPage = $this->searchConsole->searchAnalytics($site, $start, $end, ['page'], 25);
        } catch (Throwable $e) {
            return ['error' => 'Gagal membaca data Search Console: '.$e->getMessage()];
        }

        $totals = $this->aggregate($byQuery);

        if ($totals['impressions'] < self::MIN_IMPRESSIONS || count($byQuery) < self::MIN_QUERY_ROWS) {
            return ['error' => 'Data Search Console masih terlalu kecil untuk dianalisis secara jujur '
                .'(butuh minimal '.self::MIN_IMPRESSIONS.' impression dan '.self::MIN_QUERY_ROWS." query dalam {$days} hari; "
                ."saat ini {$totals['impressions']} impression dari ".count($byQuery).' query).'];
        }

        return [
            'site_url' => $site,
            'period' => ['start' => $start, 'end' => $end, 'days' => $days],
            'totals' => $totals,
            'top_queries' => $this->flatten($byQuery),
            'top_pages' => $this->flatten($byPage),
        ];
    }

    private function buildCatalogSeoSnapshot(): array
    {
        $since = now()->subDays(self::WINDOW_DAYS);
        $clicksMap = [];
        $viewsMap = [];

        if (Schema::hasTable('item_clicks')) {
            $rows = DB::table('item_clicks')
                ->selectRaw('target_type, target_id, COUNT(*) as n')
                ->where('clicked_at', '>=', $since)
                ->groupBy('target_type', 'target_id')
                ->get();
            foreach ($rows as $r) {
                $clicksMap["{$r->target_type}:{$r->target_id}"] = (int) $r->n;
            }
        }

        if (Schema::hasTable('item_views')) {
            $rows = DB::table('item_views')
                ->selectRaw('target_type, target_id, COUNT(*) as n')
                ->where('viewed_at', '>=', $since)
                ->groupBy('target_type', 'target_id')
                ->get();
            foreach ($rows as $r) {
                $viewsMap["{$r->target_type}:{$r->target_id}"] = (int) $r->n;
            }
        }

        $itemsNeedingMeta = [];
        $topViewedCatalog = [];

        if (Schema::hasTable('items')) {
            $hasPromo = Schema::hasColumn('items', 'is_on_promo');
            $cols = ['id', 'slug', 'title', 'meta_title', 'meta_description'];
            if ($hasPromo) {
                $cols[] = 'is_on_promo';
            }

            $mapItem = function ($it) use ($clicksMap, $viewsMap, $hasPromo) {
                $k = "item:{$it->id}";

                return [
                    'target_type' => 'item',
                    'target_id' => (int) $it->id,
                    'slug' => $it->slug,
                    'url_path' => '/furniture/'.$it->slug,
                    'title' => $it->title,
                    'meta_title' => $it->meta_title,
                    'meta_description' => $it->meta_description,
                    'is_on_promo' => $hasPromo ? (bool) $it->is_on_promo : false,
                    'views_28d' => $viewsMap[$k] ?? 0,
                    'clicks_28d' => $clicksMap[$k] ?? 0,
                ];
            };

            $missingMetaItems = Item::query()
                ->select($cols)
                ->where(function ($q) {
                    $q->whereNull('meta_title')
                        ->orWhere('meta_title', '')
                        ->orWhereNull('meta_description')
                        ->orWhere('meta_description', '');
                })
                ->limit(40)
                ->get()
                ->map($mapItem);

            $itemsNeedingMeta = $missingMetaItems
                ->sortByDesc(fn ($i) => ($i['views_28d'] * 2) + $i['clicks_28d'] + ($i['is_on_promo'] ? 50 : 0))
                ->take(12)
                ->values()
                ->all();

            $recentCatalog = Item::query()->select($cols)->orderByDesc('id')->limit(60)->get()->map($mapItem);
            $topViewedCatalog = $recentCatalog
                ->merge($missingMetaItems)
                ->unique('target_id')
                ->sortByDesc(fn ($i) => $i['views_28d'] + $i['clicks_28d'])
                ->take(8)
                ->values()
                ->all();
        }

        $projectsNeedingMeta = [];
        if (Schema::hasTable('projects')) {
            $projectsNeedingMeta = Project::query()
                ->select(['id', 'slug', 'title', 'location', 'is_highlighted', 'meta_title', 'meta_description'])
                ->get()
                ->map(function ($p) use ($clicksMap, $viewsMap) {
                    $k = "project:{$p->id}";

                    return [
                        'target_type' => 'project',
                        'target_id' => (int) $p->id,
                        'slug' => $p->slug,
                        'url_path' => '/projects/'.$p->slug,
                        'title' => $p->title,
                        'location' => $p->location,
                        'is_highlighted' => (bool) $p->is_highlighted,
                        'meta_title' => $p->meta_title,
                        'meta_description' => $p->meta_description,
                        'views_28d' => $viewsMap[$k] ?? 0,
                        'clicks_28d' => $clicksMap[$k] ?? 0,
                    ];
                })
                ->filter(fn ($p) => blank($p['meta_title']) || blank($p['meta_description']))
                ->sortByDesc(fn ($p) => ($p['views_28d'] * 2) + $p['clicks_28d'] + ($p['is_highlighted'] ? 40 : 0))
                ->take(8)
                ->values()
                ->all();
        }

        return [
            'items_needing_meta' => $itemsNeedingMeta,
            'projects_needing_meta' => $projectsNeedingMeta,
            'top_viewed_catalog' => $topViewedCatalog,
        ];
    }

    private function buildLocalSnapshot(): ?array
    {
        if (! $this->gbp || ! $this->gbp->isConfigured()) {
            return null;
        }

        try {
            $listing = $this->gbp->listingInfo();
            $perf = $this->gbp->performance(now()->subDays(29)->toDateString(), now()->subDay()->toDateString());
            $reviews = $this->gbp->reviews(10);

            return [
                'connected' => true,
                'listing' => $listing,
                'performance_totals' => $perf['totals'],
                'average_rating' => $reviews['averageRating'],
                'total_reviews' => $reviews['totalReviewCount'],
                'unreplied_reviews' => array_values(array_filter($reviews['reviews'], fn ($r) => empty($r['replied']))),
            ];
        } catch (Throwable) {
            return null;
        }
    }

    private function allowedTargetMap(array $catalog): array
    {
        $map = [];
        foreach (array_merge($catalog['items_needing_meta'] ?? [], $catalog['projects_needing_meta'] ?? [], $catalog['top_viewed_catalog'] ?? []) as $row) {
            $key = "{$row['target_type']}:{$row['target_id']}";
            $map[$key] = ['target_type' => $row['target_type'], 'target_id' => (int) $row['target_id']];
        }

        return $map;
    }

    public function aggregate(array $rows): array
    {
        $clicks = array_sum(array_column($rows, 'clicks'));
        $impressions = array_sum(array_column($rows, 'impressions'));

        $weighted = 0.0;
        foreach ($rows as $row) {
            $weighted += $row['position'] * $row['impressions'];
        }

        return [
            'clicks' => (int) $clicks,
            'impressions' => (int) $impressions,
            'ctr' => $impressions > 0 ? round($clicks / $impressions * 100, 2) : 0.0,
            'position' => $impressions > 0 ? round($weighted / $impressions, 1) : 0.0,
            'rows' => count($rows),
        ];
    }

    private function flatten(array $rows): array
    {
        return array_map(fn ($row) => [
            'key' => $row['keys'][0] ?? '',
            'clicks' => $row['clicks'],
            'impressions' => $row['impressions'],
            'ctr_percent' => round($row['ctr'] * 100, 2),
            'average_position' => round($row['position'], 1),
        ], $rows);
    }

    private function systemPrompt(int $limit): string
    {
        return <<<PROMPT
Kamu adalah SEO Analyst untuk Livora Studio, studio arsitek, interior design & custom furniture premium di Jakarta, Indonesia. Tugasmu menganalisis data Google Search Console, Google Business Profile showroom (jika ada), DAN audit on-page halaman item/proyek Livora di database untuk menghasilkan insight dan rekomendasi yang langsung bisa dieksekusi.

ATURAN KETAT — WAJIB DIIKUTI:
- Analisis HANYA berdasarkan data nyata di pesan user. Kalau Search Console berstatus belum terhubung / trafik kecil, JANGAN mengarang angka Search Console; fokuslah pada audit On-Page Katalog (`catalog_onpage`) dan Local SEO (`local_seo_gbp`) yang datanya nyata tersedia.
- Jika membuat rekomendasi bertipe `on_page` untuk memperbaiki meta_title/meta_description item atau project tertentu, WAJIB isi `"target_type"` ("item" atau "project") dan `"target_id"` (angka ID persis dari daftar `catalog_onpage`), serta `"change_from"` & `"change_to"` agar admin bisa mengklik "Approve & Execute" dan sistem memperbarui database otomatis.
- Maksimal {$limit} insight per respons.
- Balas HANYA dengan JSON valid, TANPA markdown code fence, PERSIS sesuai skema:

{
  "insights": [
    {
      "title": "judul singkat, maksimal 12 kata",
      "description": "ringkasan 1-2 kalimat",
      "type": "opportunity" | "warning" | "trend" | "anomaly",
      "severity": "low" | "medium" | "high" | "critical",
      "confidence": 0-100,
      "reasoning": "sebutkan item/project/query dan angka konkret dari data",
      "what_happened": "temuan jelas untuk tim non-teknis",
      "why_it_matters": "dampak ke visibilitas & leads Livora",
      "expected_impact": "dampak kualitatif realistis",
      "recommendation": {
        "title": "judul singkat",
        "description": "ringkasan 1-2 kalimat",
        "action_type": "on_page" | "content" | "technical_seo" | "process_change" | "other",
        "target_type": "item" | "project" | null,
        "target_id": number | null,
        "change_from": "meta title saat ini atau '(kosong)'" | null,
        "change_to": "usulan meta title baru <= 60 karakter" | null,
        "risk": "low" | "medium" | "high",
        "priority": "low" | "medium" | "high",
        "expected_impact": "string",
        "confidence": 0-100,
        "why": "alasan singkat berdasarkan data",
        "suggested_action": "langkah konkret menyebut ID/slug spesifik"
      } | null
    }
  ]
}
PROMPT;
    }

    private function userPrompt(array $snapshot): string
    {
        $json = json_encode($snapshot, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $learningBlock = '';
        try {
            $learningBlock = "\n\n".app(AiLearningMemoryService::class)->promptBlock(30);
        } catch (Throwable) {
        }

        return "Data SEO, Local Business Profile & On-Page Katalog Livora (semua data nyata dari API & database):\n\n{$json}{$learningBlock}\n\nPrioritaskan optimasi on-page pada produk/proyek bernilai tinggi dan ikuti memori pembelajaran adaptif Livora. Analisis data di atas dan hasilkan insight sesuai skema.";
    }

    private function parseResponse(string $text): array
    {
        $clean = trim($text);
        $clean = preg_replace('/^```(json)?/i', '', $clean);
        $clean = preg_replace('/```$/', '', $clean);
        $clean = trim($clean);

        $data = json_decode($clean, true);

        if (! is_array($data) || ! isset($data['insights']) || ! is_array($data['insights'])) {
            return [];
        }

        $valid = [];
        foreach ($data['insights'] as $item) {
            if (is_array($item) && $this->isValidInsight($item)) {
                $valid[] = $item;
            }
        }

        return $valid;
    }

    private function isValidInsight(array $item): bool
    {
        foreach (['title', 'description', 'type', 'severity', 'reasoning', 'what_happened', 'why_it_matters', 'expected_impact'] as $field) {
            if (empty($item[$field]) || ! is_string($item[$field])) {
                return false;
            }
        }

        if (! in_array($item['type'], ['opportunity', 'warning', 'trend', 'anomaly', 'recommendation'], true)) {
            return false;
        }

        if (! in_array($item['severity'], ['low', 'medium', 'high', 'critical'], true)) {
            return false;
        }

        return isset($item['confidence']) && is_numeric($item['confidence']);
    }

    private function isValidRecommendation(array $rec): bool
    {
        return ! empty($rec['title']) && is_string($rec['title'])
            && ! empty($rec['description']) && is_string($rec['description']);
    }

    private function clampConfidence(mixed $value): int
    {
        return (int) max(0, min(100, (int) round((float) $value)));
    }
}
