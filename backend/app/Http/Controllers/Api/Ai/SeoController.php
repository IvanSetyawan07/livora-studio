<?php

namespace App\Http\Controllers\Api\Ai;

use App\Http\Controllers\Controller;
use App\Models\AiSetting;
use App\Services\AI\SeoAgentService;
use App\Services\Google\GoogleOAuthTokenStore;
use App\Services\Google\GoogleSearchConsoleClient;
use App\Services\Google\SearchConsoleSiteResolver;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Throwable;

/**
 * Angka mentah Search Console untuk 4 kartu KPI di halaman SEO Agent.
 *
 * Sengaja TIDAK lewat AI: ini cuma total klik/impression/CTR/posisi, jadi
 * memanggil LLM untuk itu cuma buang kuota dan malah bikin angkanya bisa
 * meleset. AI dipakai di SeoAgentService, bukan di sini.
 *
 * Respons selalu punya field `connected` dan `hasData` yang eksplisit
 * supaya frontend bisa membedakan tiga keadaan yang beda artinya:
 *   - belum connect                    → connected=false
 *   - connect tapi belum ada trafik    → connected=true, hasData=false
 *   - connect dan ada data             → connected=true, hasData=true
 * Array kosong tanpa penjelasan itu yang bikin UI bingung dan akhirnya
 * menampilkan "—" tanpa alasan.
 */
class SeoController extends Controller
{
    /**
     * Cache pendek: kuota Search Console API harian terbatas, sedangkan
     * halaman admin bisa dibuka berkali-kali dalam semenit. 20 menit cukup
     * segar (data Search Console sendiri delay ~2 hari) dan hemat kuota.
     */
    private const CACHE_TTL_SECONDS = 20 * 60;

    public function __construct(
        private GoogleOAuthTokenStore $tokens,
        private GoogleSearchConsoleClient $client,
        private SearchConsoleSiteResolver $siteResolver,
        private SeoAgentService $seoAgent,
    ) {
    }

    /**
     * GET /api/ai/seo/search-console-summary?days=28
     */
    public function searchConsoleSummary(Request $request)
    {
        $days = (int) $request->query('days', 28);
        $days = max(7, min($days, 90));

        if ($this->tokens->getValidAccessToken() === null) {
            return response()->json([
                'connected' => false,
                'hasData' => false,
                'message' => 'Google Search Console belum terhubung. Hubungkan akun Google dulu di kartu di atas.',
                'period' => null,
                'totals' => null,
                'siteUrl' => null,
                'series' => [],
                'topQueries' => [],
                'topPages' => [],
            ]);
        }

        $key = "ai:seo:search-console-summary:v2:{$days}";
        $payload = Cache::get($key);

        if (! is_array($payload)) {
            $payload = $this->fetchSummary($days);
            Cache::put($key, $payload, ($payload['hasData'] ?? false) ? self::CACHE_TTL_SECONDS : 60);
        }

        return response()->json($payload);
    }

    /** GET /api/ai/seo/search-console-sites */
    public function sites()
    {
        if ($this->tokens->getValidAccessToken() === null) {
            return response()->json(['sites' => [], 'selected' => null]);
        }

        try {
            $sites = $this->client->listSites();

            return response()->json([
                'sites' => $sites,
                'selected' => AiSetting::get('google_search_console_site'),
            ]);
        } catch (Throwable $e) {
            return response()->json(['sites' => [], 'selected' => null, 'message' => $e->getMessage()], 422);
        }
    }

    /** POST /api/ai/seo/search-console-site */
    public function selectSite(Request $request)
    {
        $data = $request->validate([
            'siteUrl' => ['nullable', 'string', 'max:255'],
        ]);

        AiSetting::set('google_search_console_site', $data['siteUrl'] ?: null);
        foreach ([7, 14, 28, 30, 60, 90] as $d) {
            Cache::forget("ai:seo:search-console-summary:v2:{$d}");
        }

        return response()->json(['ok' => true, 'siteUrl' => $data['siteUrl'] ?: null]);
    }

    private function fetchSummary(int $days): array
    {
        $resolved = $this->siteResolver->resolve();

        if ($resolved['site'] === null) {
            return [
                'connected' => true,
                'hasData' => false,
                'message' => $resolved['reason'],
                'period' => null,
                'totals' => null,
                'siteUrl' => null,
                'series' => [],
                'topQueries' => [],
                'topPages' => [],
            ];
        }

        $start = now()->subDays($days)->toDateString();
        $end = now()->toDateString();

        try {
            $rows = $this->client->searchAnalytics($resolved['site'], $start, $end, ['date'], 100);
        } catch (Throwable $e) {
            return [
                'connected' => true,
                'hasData' => false,
                'message' => 'Gagal membaca data Search Console: '.$e->getMessage(),
                'period' => ['start' => $start, 'end' => $end, 'days' => $days],
                'totals' => null,
                'siteUrl' => $resolved['site'],
                'series' => [],
                'topQueries' => [],
                'topPages' => [],
            ];
        }

        $topQueries = [];
        $topPages = [];
        try {
            $topQueries = array_map(fn ($r) => [
                'query' => (string) ($r['keys'][0] ?? ''),
                'clicks' => (int) ($r['clicks'] ?? 0),
                'impressions' => (int) ($r['impressions'] ?? 0),
                'ctr' => round(((float) ($r['ctr'] ?? 0)) * 100, 2),
                'position' => round((float) ($r['position'] ?? 0), 1),
            ], $this->client->searchAnalytics($resolved['site'], $start, $end, ['query'], 20));
        } catch (Throwable) {
        }
        try {
            $topPages = array_map(fn ($r) => [
                'page' => (string) ($r['keys'][0] ?? ''),
                'clicks' => (int) ($r['clicks'] ?? 0),
                'impressions' => (int) ($r['impressions'] ?? 0),
                'ctr' => round(((float) ($r['ctr'] ?? 0)) * 100, 2),
                'position' => round((float) ($r['position'] ?? 0), 1),
            ], $this->client->searchAnalytics($resolved['site'], $start, $end, ['page'], 12));
        } catch (Throwable) {
        }

        $series = array_map(fn ($r) => [
            'date' => (string) ($r['keys'][0] ?? ''),
            'clicks' => (int) ($r['clicks'] ?? 0),
            'impressions' => (int) ($r['impressions'] ?? 0),
            'ctr' => round(((float) ($r['ctr'] ?? 0)) * 100, 2),
            'position' => round((float) ($r['position'] ?? 0), 1),
        ], $rows);

        $totals = $this->seoAgent->aggregate($rows);

        return [
            'connected' => true,
            'hasData' => $totals['impressions'] > 0,
            'message' => $totals['impressions'] > 0
                ? null
                : "Search Console terhubung, tapi belum ada impression tercatat dalam {$days} hari terakhir.",
            'period' => ['start' => $start, 'end' => $end, 'days' => $days],
            'totals' => [
                'clicks' => $totals['clicks'],
                'impressions' => $totals['impressions'],
                'ctr' => $totals['ctr'],
                'position' => $totals['position'],
            ],
            'siteUrl' => $resolved['site'],
            'series' => $series,
            'topQueries' => $topQueries,
            'topPages' => $topPages,
        ];
    }
}
