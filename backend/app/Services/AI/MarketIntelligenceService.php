<?php

namespace App\Services\AI;

use App\Services\Google\GoogleSearchConsoleClient;
use App\Services\Google\SearchConsoleSiteResolver;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Market Intelligence Service — menganalisis tren pasar interior luxury & custom furniture
 * di Indonesia (Jakarta, PIK 2, Pondok Indah, Kemang, Senopati, Menteng, BSD),
 * memadukan sinyal permintaan internal Livora dengan Google Search Grounding (Gemini)
 * untuk menghasilkan ide konten EKSTERNAL dan sudut pandang kompetitor terkini.
 */
class MarketIntelligenceService
{
    public const CACHE_TTL_SECONDS = 3 * 3600;

    public function __construct(
        private AIProviderManager $ai,
        private ?GoogleSearchConsoleClient $searchConsole = null,
        private ?SearchConsoleSiteResolver $siteResolver = null,
    ) {
    }

    /**
     * Ambil analisis pasar terkini (di-cache 3 jam kecuali force=true).
     *
     * @return array<string, mixed>
     */
    public function analyze(string $focus = '', bool $force = false): array
    {
        $cleanFocus = trim($focus);
        $cacheKey = 'ai:market:intelligence:v1:'.md5(mb_strtolower($cleanFocus));

        if (! $force) {
            $cached = Cache::get($cacheKey);
            if (is_array($cached)) {
                return $cached + ['cached' => true];
            }
        }

        $internalSignals = $this->readInternalDemandSignals();

        if (! $this->ai->hasProvider('gemini') && empty($this->ai->availableProviders())) {
            return [
                'status' => 'not_configured',
                'message' => 'Minimal satu AI provider (GEMINI_API_KEY disarankan untuk riset web live) perlu aktif di backend/.env.',
                'generatedAt' => now()->toIso8601String(),
                'focus' => $cleanFocus,
                'marketSummary' => null,
                'trendingAesthetics' => [],
                'externalContentIdeas' => [],
                'competitorAngles' => [],
                'sources' => [],
                'internalSignals' => $internalSignals,
            ];
        }

        $webTrendsText = '';
        $groundingSources = [];

        if ($this->ai->hasProvider('gemini')) {
            try {
                $year = now()->format('Y');
                $searchRes = $this->ai->ask(
                    'Kamu adalah Luxury Interior Market Researcher di Indonesia. Gunakan Google Search untuk meriset tren desain interior, arsitektur hunian mewah, gaya furnitur bespoke, serta format konten media sosial yang sedang naik daun di Jakarta/Indonesia dan global saat ini.',
                    "Riset tren pasar desain interior luxury & furnitur custom tahun {$year} di Indonesia/Jakarta (PIK 2, Pondok Indah, Menteng, Kemang, BSD) dan tolok ukur konten brand arsitektur/interior papan atas."
                    .($cleanFocus !== '' ? " Fokus khusus: {$cleanFocus}." : '')
                    .' Sebutkan tren material, estetika hunian, dan contoh tema konten/kampanye non-Livora yang efektif menarik klien residensial & hospitality.',
                    'content',
                    'gemini',
                    [
                        'google_search' => true,
                        'temperature' => 0.3,
                        'max_tokens' => 2400,
                        'thinking_level' => 'low',
                    ]
                );

                $webTrendsText = trim((string) ($searchRes['text'] ?? ''));
                foreach (is_array($searchRes['groundingChunks'] ?? null) ? $searchRes['groundingChunks'] : [] as $c) {
                    $uri = (string) ($c['uri'] ?? '');
                    if ($uri !== '' && filter_var($uri, FILTER_VALIDATE_URL)) {
                        $groundingSources[] = [
                            'title' => trim((string) ($c['title'] ?? '')) ?: 'Referensi Web',
                            'url' => $uri,
                            'domain' => trim((string) ($c['domain'] ?? '')),
                        ];
                    }
                }
            } catch (\Throwable) {
                // Tetap lanjut memakai analisis LLM + sinyal database bila web grounding sedang limit.
            }
        }

        $sys = <<<'PROMPT'
Kamu adalah Head of Market & Content Strategy untuk LIVORA (PT. Langgeng Cipta Ruang — Luxury Modern & European Interior Design, Architectural Build & Custom Furniture di Jakarta).

Tugasmu menganalisis PASAR LUAR & KOMPETITOR (BUKAN sekadar mengulang data akun kita sendiri) dan menggabungkannya dengan permintaan katalog Livora untuk menyusun strategi konkret:
1. `marketSummary`: 2-3 kalimat kondisi & peluang pasar interior high-end / custom furniture saat ini (Jakarta, PIK 2, Pondok Indah, Kemang, BSD, hospitality).
2. `trendingAesthetics`: 3-4 tren material/estetika/kebutuhan hunian terbaru yang layak diangkat (nama tren, alasan dicari pasar, rekomendasi fokus produk/proyek).
3. `externalContentIdeas`: 4 ide konten LINTAS FORMAT yang terinspirasi dari brand/publikasi interior eksternal terbaik (IG Carousel, IG Reels, TikTok, YouTube Tour, atau Editorial Lookbook — BUKAN sekadar daur ulang konten lama kita), lengkap dengan:
   - `title`: judul konsep siap eksekusi
   - `channel`: "instagram" | "tiktok" | "youtube" | "email" | "website"
   - `format`: contoh "IG Carousel 7 Slide" / "IG Reels 35 detik" / "TikTok Workshop ASMR" / "YouTube Walkthrough 5 menit"
   - `externalInspiration`: tren/gaya brand arsitektur eksternal apa yang dijadikan tolok ukur (tanpa mengarang URL palsu)
   - `marketReason`: alasan berbasis tren pasar & audiens high-end kenapa konsep ini berpotensi tinggi saat ini
   - `captionDraft`: draft caption elegan bergaya Quiet Luxury dengan CTA konsultasi showroom Livora
   - `ctaLabel`: string pendek (mis. "Jadwalkan Private Viewing")
4. `competitorAngles`: 3 sudut pandang pembeda agar Livora menang melawan toko furnitur mass-market & studio interior konvensional.

Balas HANYA JSON valid tanpa markdown code fence:
{
  "marketSummary": "...",
  "trendingAesthetics": [{"name": "...", "whyNow": "...", "recommendedFocus": "..."}],
  "externalContentIdeas": [
    {
      "title": "...",
      "channel": "instagram",
      "format": "...",
      "externalInspiration": "...",
      "marketReason": "...",
      "captionDraft": "...",
      "ctaLabel": "..."
    }
  ],
  "competitorAngles": ["..."]
}
PROMPT;

        $userPayload = [
            'fokus_topik' => $cleanFocus !== '' ? $cleanFocus : 'Luxury Modern & European Interior + Custom Furniture Market',
            'riset_web_terkini' => $webTrendsText !== '' ? $webTrendsText : 'Web search tidak mengembalikan ringkasan tambahan; gunakan analisis industri interior high-end Indonesia & data internal di bawah.',
            'sinyal_permintaan_livora' => $internalSignals,
        ];

        try {
            $aiRes = $this->ai->ask(
                $sys,
                json_encode($userPayload, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                'content',
                null,
                ['response_mime_type' => 'application/json', 'temperature' => 0.35, 'max_tokens' => 3000]
            );
        } catch (\Throwable $e) {
            return [
                'status' => 'error',
                'message' => $e->getMessage(),
                'generatedAt' => now()->toIso8601String(),
                'focus' => $cleanFocus,
                'marketSummary' => null,
                'trendingAesthetics' => [],
                'externalContentIdeas' => [],
                'competitorAngles' => [],
                'sources' => array_slice($groundingSources, 0, 6),
                'internalSignals' => $internalSignals,
            ];
        }

        $parsed = $this->decodeJson($aiRes['text']);
        if (! is_array($parsed)) {
            return [
                'status' => 'error',
                'message' => 'Respons AI Market Intelligence tidak sesuai skema JSON.',
                'generatedAt' => now()->toIso8601String(),
                'focus' => $cleanFocus,
                'marketSummary' => trim((string) $aiRes['text']),
                'trendingAesthetics' => [],
                'externalContentIdeas' => [],
                'competitorAngles' => [],
                'sources' => array_slice($groundingSources, 0, 6),
                'internalSignals' => $internalSignals,
            ];
        }

        $ideas = [];
        foreach (is_array($parsed['externalContentIdeas'] ?? null) ? $parsed['externalContentIdeas'] : [] as $idx => $idea) {
            if (! is_array($idea) || empty($idea['title'])) {
                continue;
            }
            $ch = strtolower(trim((string) ($idea['channel'] ?? 'instagram')));
            if (! in_array($ch, ['instagram', 'tiktok', 'youtube', 'email', 'website', 'facebook'], true)) {
                $ch = 'instagram';
            }
            $ideas[] = [
                'id' => 'mkt_'.($idx + 1),
                'title' => trim((string) $idea['title']),
                'channel' => $ch,
                'format' => trim((string) ($idea['format'] ?? ucfirst($ch))),
                'externalInspiration' => trim((string) ($idea['externalInspiration'] ?? '')),
                'marketReason' => trim((string) ($idea['marketReason'] ?? '')),
                'captionDraft' => trim((string) ($idea['captionDraft'] ?? '')),
                'ctaLabel' => trim((string) ($idea['ctaLabel'] ?? 'Jadwalkan Konsultasi')),
            ];
        }

        $payload = [
            'status' => 'ok',
            'generatedAt' => now()->toIso8601String(),
            'focus' => $cleanFocus,
            'provider' => $aiRes['provider'],
            'model' => $aiRes['model'],
            'webGrounded' => $webTrendsText !== '',
            'marketSummary' => trim((string) ($parsed['marketSummary'] ?? '')),
            'trendingAesthetics' => array_values(array_filter($parsed['trendingAesthetics'] ?? [], 'is_array')),
            'externalContentIdeas' => $ideas,
            'competitorAngles' => array_values(array_filter(array_map('strval', $parsed['competitorAngles'] ?? []))),
            'sources' => array_slice($groundingSources, 0, 6),
            'internalSignals' => $internalSignals,
        ];

        Cache::put($cacheKey, $payload, self::CACHE_TTL_SECONDS);

        return $payload;
    }

    /**
     * Ringkasan pasar ringkas (cached) untuk disuntikkan ke Content/SEO/Ads Agent.
     *
     * @return array<string, mixed>|null
     */
    public function compactBrief(): ?array
    {
        $cached = Cache::get('ai:market:intelligence:v1:'.md5(''));
        if (is_array($cached) && ($cached['status'] ?? null) === 'ok') {
            return [
                'market_summary' => $cached['marketSummary'] ?? null,
                'trending_aesthetics' => array_slice($cached['trendingAesthetics'] ?? [], 0, 3),
                'external_content_angles' => array_map(
                    fn ($i) => ($i['title'] ?? '').' ('.($i['channel'] ?? 'instagram').')',
                    array_slice($cached['externalContentIdeas'] ?? [], 0, 3)
                ),
            ];
        }

        return null;
    }

    /** @return array<string, mixed> */
    private function readInternalDemandSignals(): array
    {
        $topItems = [];
        $topProjects = [];
        $topWaItems = [];
        $topSearchQueries = [];

        if (Schema::hasTable('items') && Schema::hasTable('item_clicks')) {
            $topItems = DB::table('item_clicks')
                ->join('items', 'items.id', '=', 'item_clicks.target_id')
                ->where('item_clicks.target_type', 'item')
                ->where('item_clicks.clicked_at', '>=', now()->subDays(30))
                ->selectRaw('items.title, COUNT(*) as clicks')
                ->groupBy('items.id', 'items.title')
                ->orderByDesc('clicks')
                ->limit(5)
                ->get()
                ->map(fn ($r) => $r->title.' ('.$r->clicks.' klik)')
                ->all();
        }

        if (Schema::hasTable('projects')) {
            $topProjects = DB::table('projects')
                ->orderByDesc('is_highlighted')
                ->orderBy('sort_order')
                ->limit(4)
                ->pluck('title')
                ->all();
        }

        if (Schema::hasTable('wa_price_inquiries')) {
            $inqs = DB::table('wa_price_inquiries')->latest()->limit(10)->pluck('items');
            $titles = [];
            foreach ($inqs as $raw) {
                $arr = json_decode((string) $raw, true) ?: [];
                foreach ($arr as $row) {
                    if (! empty($row['title'])) {
                        $titles[] = (string) $row['title'];
                    }
                }
            }
            $topWaItems = array_values(array_unique(array_slice($titles, 0, 6)));
        }

        if ($this->searchConsole && $this->siteResolver) {
            try {
                $resolved = $this->siteResolver->resolve();
                if (! empty($resolved['site'])) {
                    $rows = $this->searchConsole->searchAnalytics(
                        $resolved['site'],
                        now()->subDays(28)->toDateString(),
                        now()->toDateString(),
                        ['query'],
                        8
                    );
                    $topSearchQueries = array_values(array_filter(array_map(
                        fn ($r) => $r['keys'][0] ?? null,
                        $rows
                    )));
                }
            } catch (\Throwable) {
                // Abaikan jika GSC tidak terhubung saat riset pasar.
            }
        }

        return [
            'top_clicked_items_30d' => $topItems,
            'highlighted_projects' => $topProjects,
            'recent_wa_price_inquiries' => $topWaItems,
            'top_google_search_queries' => $topSearchQueries,
        ];
    }

    /** @return array<string, mixed>|null */
    private function decodeJson(string $text): ?array
    {
        $clean = trim($text);
        $clean = preg_replace('/^```(?:json)?\s*/i', '', $clean) ?? $clean;
        $clean = preg_replace('/\s*```$/', '', $clean) ?? $clean;
        $clean = trim($clean);

        $decoded = json_decode($clean, true);
        if (is_array($decoded)) {
            return $decoded;
        }

        $start = strpos($clean, '{');
        $end = strrpos($clean, '}');
        if ($start !== false && $end !== false && $end > $start) {
            $slice = substr($clean, $start, $end - $start + 1);
            $decoded = json_decode($slice, true);
            if (is_array($decoded)) {
                return $decoded;
            }
        }

        return null;
    }
}
