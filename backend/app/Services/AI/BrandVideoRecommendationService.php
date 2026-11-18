<?php

namespace App\Services\AI;

use App\Services\Marketing\MarketingSection;
use App\Services\Marketing\TikTokClient;
use App\Services\Marketing\YouTubeClient;
use App\Services\Meta\MetaGraphClient;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/**
 * Mesin Saran Video Lintas-Platform (Instagram · YouTube · TikTok) yang selaras
 * dengan Brand Identity LIVORA (PT. Langgeng Cipta Ruang) + Analisis Pasar.
 *
 * Peningkatan utama:
 *  - Fokus kuat ke konten EKSTERNAL (referensi kreator/kompetitor/tren luar, bukan cuma video sendiri).
 *  - Pencarian YouTube memprioritaskan video 180 hari terakhir agar selalu update & relevan.
 *  - Pencarian Google Search Grounding dijalankan per platform (IG Reels, TikTok, YouTube) dengan
 *    filter URL video yang ketat (menolak blog/halaman profil generik).
 *  - Setiap rekomendasi mengunci URL & metrik asli lewat `candidateId` + menyertakan alasan
 *    berbasis Market Fit + Brand Fit + Traffic + konsep eksekusi 1-klik ke Content Queue.
 */
class BrandVideoRecommendationService
{
    public const SUPPORTED_PLATFORMS = ['instagram', 'youtube', 'tiktok'];

    public const LIVORA_BRAND_PROFILE = <<<'BRAND'
Nama Brand: LIVORA (PT. Langgeng Cipta Ruang) — Jakarta Showroom & Interior Studio.
Posisi Brand: Luxury Modern & European Interior Design, Architectural Build, Decorative Styling, serta Loose & Custom Bespoke Furniture.
Ciri Visual & Estetika ("Quiet Luxury"):
- Palet hangat-elegan: travertine, marmer berurat halus, walnut & oak alami, kain bouclé/linen bertekstur, metal brushed brass/champagne bronze, pencahayaan arsitektural (warm cove & accent light).
- Sinematografi video ideal: kamera tenang & sinematik (slow pan/dolly), ASMR detail tekstur material & jahitan furnitur, spatial storytelling (transisi ruang sebelum-sesudah, showroom walkthrough, architectural room tour), pacing berkelas tanpa terkesan murahan atau hard-sell diskon agresif.
Target Audiens: Pemilik rumah mewah, apartemen & vila high-end (PIK 2, Pondok Indah, Menteng, Kebayoran Baru, Kemang, Senopati, BSD), arsitek interior, serta klien boutique hospitality & komersial.
BRAND;

    public function __construct(
        private YouTubeClient $youtube,
        private TikTokClient $tiktok,
        private MetaGraphClient $meta,
        private AIProviderManager $ai,
        private ?MarketIntelligenceService $market = null,
    ) {
    }

    /**
     * Ambil pustaka video milik akun Livora sendiri di Instagram, YouTube, dan TikTok,
     * beserta ringkasan traffic nyata per platform + konteks katalog Livora.
     *
     * @return array<string, mixed>
     */
    public function library(): array
    {
        $instagram = MarketingSection::attempt('content:inspiration:library:instagram', function () {
            return ['videos' => $this->meta->instagramVideos(12)];
        });

        $youtube = MarketingSection::attempt('content:inspiration:library:youtube', function () {
            return ['videos' => $this->youtube->channelVideos(12)];
        });

        $tiktok = MarketingSection::attempt('content:inspiration:library:tiktok', function () {
            return ['videos' => $this->tiktok->videos(20)];
        });

        $trafficOverview = [
            'instagram' => self::summarizePlatformTraffic('instagram', $instagram),
            'youtube' => self::summarizePlatformTraffic('youtube', $youtube),
            'tiktok' => self::summarizePlatformTraffic('tiktok', $tiktok),
        ];

        $anyOk = ($instagram['status'] ?? null) === 'ok'
            || ($youtube['status'] ?? null) === 'ok'
            || ($tiktok['status'] ?? null) === 'ok';

        return [
            'status' => $anyOk ? 'ok' : 'not_configured',
            'generatedAt' => now()->toIso8601String(),
            'instagram' => $instagram,
            'youtube' => $youtube,
            'tiktok' => $tiktok,
            'trafficOverview' => $trafficOverview,
            'brandContext' => $this->readLivoraBrandContext(),
            'tiktokDiscoveryAvailable' => false,
            'tiktokDiscoveryNote' => 'Video milik Livora ditarik dari Meta Graph IG, YouTube & TikTok Business API; rekomendasi video EKSTERNAL terkini diambil dari YouTube Data API (180 hari terakhir) + Gemini Google Search Grounding lintas platform.',
        ];
    }

    /**
     * Analisis pasar + traffic lintas platform dan buat rekomendasi video terstruktur
     * (beserta link nyata eksternal/terbaru, alasan, deskripsi, dan konsep adaptasi untuk Livora).
     *
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    public function recommend(array $payload): array
    {
        $query = trim((string) ($payload['query'] ?? ''));
        $requestedPlatforms = $this->normalizePlatforms($payload['platforms'] ?? null);
        $mode = ($payload['mode'] ?? null) ?: ($query === '' ? 'auto_brand' : 'topic');
        $scope = ($payload['scope'] ?? 'external') === 'all' ? 'all' : 'external';
        $sourceUrlNorm = strtolower(trim((string) ($payload['sourceUrl'] ?? '')));

        $library = $this->library();
        $brandContext = $library['brandContext'] ?? ['items' => [], 'projects' => [], 'promos' => []];
        $effectiveTopic = $query !== '' ? $query : $this->buildBrandDiscoveryQuery($brandContext);
        $marketBrief = $this->market?->compactBrief();

        $discoveryNotes = [];
        $candidates = [];

        // 1. YouTube Data API search — prioritaskan video TERBARU (180 hari terakhir) agar tren selalu update.
        if (in_array('youtube', $requestedPlatforms, true)) {
            $year = now()->format('Y');
            $ytQueries = $mode === 'auto_brand'
                ? [
                    $effectiveTopic,
                    "modern luxury interior design tour custom furniture {$year}",
                    'minimalist european living room architecture showroom tour',
                ]
                : [$effectiveTopic];

            $publishedAfter = now()->subDays(180)->toIso8601ZuluString();
            $ytResults = [];

            foreach (array_values(array_unique($ytQueries)) as $idx => $qStr) {
                $cacheKey = 'content:inspiration:yt:recent:'.md5(mb_strtolower($qStr).':'.$publishedAfter);
                $section = MarketingSection::attempt($cacheKey, function () use ($qStr, $idx, $publishedAfter) {
                    $recent = $this->youtube->searchSimilar($qStr, $idx === 0 ? 8 : 5, [
                        'publishedAfter' => $publishedAfter,
                    ]);
                    if ($recent !== []) {
                        return ['videos' => $recent];
                    }

                    // Jika 180 hari terakhir masih terlalu sedikit untuk keyword spesifik, perluas ke relevance tanpa batas waktu.
                    return ['videos' => $this->youtube->searchSimilar($qStr, 6)];
                });

                if (($section['status'] ?? null) === 'ok') {
                    foreach ($section['videos'] ?? [] as $v) {
                        $ytResults[] = $v + ['sourceKind' => 'reference_creator'];
                    }
                } elseif (! empty($section['message'])) {
                    $discoveryNotes['youtube'] = $section['message'];
                }
            }

            foreach (array_slice($this->dedupeVideos($ytResults, $sourceUrlNorm), 0, 9) as $v) {
                $candidates[] = $v;
            }
        }

        // 2. Gemini Google Search Grounding per platform target (IG Reels, TikTok, YouTube) dengan fokus tren 2026 & konten luar.
        if ($this->ai->hasProvider('gemini')) {
            $webDiscovered = $this->discoverViaGeminiSearch($effectiveTopic, $requestedPlatforms, $brandContext);
            foreach ($webDiscovered['candidates'] as $v) {
                $candidates[] = $v;
            }
            if (! empty($webDiscovered['note'])) {
                $discoveryNotes['search_grounding'] = $webDiscovered['note'];
            }
        } else {
            $discoveryNotes['gemini'] = 'GEMINI_API_KEY belum diisi sehingga pencarian web Google Search Grounding untuk Instagram Reels/TikTok tidak dijalankan.';
        }

        $candidates = $this->dedupeVideos($candidates, $sourceUrlNorm);

        // 3. Fallback video milik sendiri HANYA jika scope === 'all' atau jika seluruh penemuan eksternal pada platform tsb kosong.
        foreach ($requestedPlatforms as $p) {
            $hasExternal = collect($candidates)->contains(fn ($c) => ($c['platform'] ?? null) === $p);
            if ($hasExternal) {
                continue;
            }
            if ($scope === 'all' || ! $this->ai->hasProvider('gemini')) {
                $ownVideos = $library[$p]['videos'] ?? [];
                foreach (array_slice($ownVideos, 0, 2) as $own) {
                    if ($sourceUrlNorm !== '' && strtolower(trim((string) ($own['url'] ?? ''))) === $sourceUrlNorm) {
                        continue;
                    }
                    $candidates[] = $own + ['sourceKind' => 'livora_benchmark'];
                }
            } else {
                $discoveryNotes[$p] = "Belum ada video eksternal terverifikasi untuk {$p} pada topik ini (coba ubah kata kunci atau aktifkan API platform).";
            }
        }

        $candidates = $this->balanceCandidatesByPlatform(
            $this->dedupeVideos($candidates, $sourceUrlNorm),
            $requestedPlatforms,
            15
        );

        if ($candidates === []) {
            $anyPlatformConfigured = $this->youtube->hasApiKey()
                || $this->meta->isConfigured()
                || $this->tiktok->isConfigured()
                || $this->ai->hasProvider('gemini');

            return [
                'status' => $anyPlatformConfigured ? 'empty' : 'not_configured',
                'message' => $anyPlatformConfigured
                    ? 'Belum ada video eksternal terverifikasi yang cocok dari YouTube/IG/TikTok/Google Search. Coba perluas topik atau sertakan benchmark akun sendiri.'
                    : 'Belum ada integrasi video atau AI yang aktif. Isi GEMINI_API_KEY, YOUTUBE_API_KEY, META_GRAPH_ACCESS_TOKEN, atau TIKTOK_ACCESS_TOKEN di backend/.env.',
                'query' => $query !== '' ? $query : $effectiveTopic,
                'mode' => $mode,
                'scope' => $scope,
                'generatedAt' => now()->toIso8601String(),
                'references' => [],
                'recommendations' => [],
                'marketInsights' => $marketBrief,
                'trafficAnalysis' => [
                    'summary' => 'Kandidat video belum mencukupi untuk dirangkum.',
                    'platforms' => $library['trafficOverview'],
                ],
                'brandContextUsed' => $brandContext,
                'discoveryNotes' => $discoveryNotes,
                'analysis' => null,
            ];
        }

        // Petakan candidateId agar AI hanya memilih video dari kandidat yang URL-nya nyata & terverifikasi.
        $candidateMap = [];
        foreach ($candidates as $i => $cand) {
            $cid = 'cand_'.($i + 1);
            $cand['candidateId'] = $cid;
            $candidateMap[$cid] = $cand;
        }

        $allowedTargets = $this->buildAllowedTargetsMap($brandContext);

        $structured = null;
        $analysisText = null;
        $providerMeta = null;
        $analysisError = null;

        try {
            $aiRes = $this->ai->ask(
                $this->recommendationSystemPrompt($requestedPlatforms),
                $this->recommendationUserPrompt($payload, $effectiveTopic, $requestedPlatforms, $library['trafficOverview'], $brandContext, $candidateMap, $marketBrief),
                'content',
                null,
                ['response_mime_type' => 'application/json', 'temperature' => 0.35, 'max_tokens' => 4096]
            );

            $parsed = self::parseRecommendationPayload($aiRes['text'], $candidateMap, $allowedTargets);
            $providerMeta = ['provider' => $aiRes['provider'], 'model' => $aiRes['model']];

            if ($parsed !== null && $parsed['recommendations'] !== []) {
                $structured = $parsed;
                $analysisText = $this->formatSummaryText($parsed);
            } else {
                $analysisError = 'AI merespons namun format JSON tidak lengkap; menampilkan daftar video eksternal terverifikasi.';
                $analysisText = trim((string) $aiRes['text']);
            }
        } catch (\Throwable $e) {
            report($e);
            $analysisError = $e->getMessage();
        }

        $recommendations = $structured['recommendations'] ?? $this->buildDeterministicFallbackRecommendations($candidateMap, $brandContext);

        $trafficAnalysis = [
            'summary' => $structured['trafficSummary'] ?? $this->buildDeterministicTrafficSummary($library['trafficOverview'], $candidateMap),
            'marketSummary' => $structured['marketSummary'] ?? ($marketBrief['market_summary'] ?? null),
            'platformNotes' => $structured['platformNotes'] ?? $this->defaultPlatformFormatNotes($requestedPlatforms),
            'platforms' => $library['trafficOverview'],
        ];

        return [
            'status' => 'ok',
            'query' => $query !== '' ? $query : $effectiveTopic,
            'mode' => $mode,
            'scope' => $scope,
            'generatedAt' => now()->toIso8601String(),
            'references' => array_values($candidateMap),
            'recommendations' => $recommendations,
            'marketInsights' => $marketBrief,
            'trafficAnalysis' => $trafficAnalysis,
            'brandContextUsed' => $brandContext,
            'discoveryNotes' => $discoveryNotes,
            'analysis' => $providerMeta ? [
                'text' => $analysisText ?? '',
                'provider' => $providerMeta['provider'],
                'model' => $providerMeta['model'],
            ] : null,
            'analysisError' => $analysisError,
        ];
    }

    /**
     * Ekstrak ID video YouTube (11 karakter) dari URL youtube.com / youtu.be / shorts.
     */
    public static function extractYouTubeVideoId(string $url): ?string
    {
        if (preg_match('~(?:youtube\.com/(?:watch\?.*?v=|shorts/|embed/)|youtu\.be/)([A-Za-z0-9_-]{11})~i', $url, $m)) {
            return $m[1];
        }

        return null;
    }

    /**
     * Validasi ketat URL video eksternal hasil API / Google Search Grounding:
     * menolak skema non-http, URL palsu, halaman bantuan, halaman profil tanpa video,
     * maupun domain artikel/blog non-video.
     */
    public static function isSafeExternalVideoUri(string $uri): bool
    {
        if ($uri === '' || ! filter_var($uri, FILTER_VALIDATE_URL)) {
            return false;
        }
        $scheme = strtolower((string) parse_url($uri, PHP_URL_SCHEME));
        $host = strtolower((string) parse_url($uri, PHP_URL_HOST));
        $path = strtolower((string) (parse_url($uri, PHP_URL_PATH) ?? ''));
        $query = strtolower((string) (parse_url($uri, PHP_URL_QUERY) ?? ''));

        if (! in_array($scheme, ['http', 'https'], true) || $host === '') {
            return false;
        }

        if (in_array($host, ['example.com', 'localhost', '127.0.0.1'], true)) {
            return false;
        }

        if (str_starts_with($host, 'help.') || str_starts_with($host, 'support.') || str_contains($path, '/privacy') || str_contains($path, '/terms') || str_contains($path, '/login')) {
            return false;
        }

        // Redirect resmi Google Search Grounding selalu berasal dari vertexaisearch.cloud.google.com.
        if (str_contains($host, 'vertexaisearch.cloud.google.com')) {
            return true;
        }

        if (str_contains($host, 'instagram.com')) {
            return (bool) preg_match('~^/(?:reel|reels|p|tv)/[^/]+~', $path);
        }

        if (str_contains($host, 'tiktok.com')) {
            return (bool) preg_match('~^/@[^/]+/video/\d+~', $path) || str_contains($path, '/video/');
        }

        if (str_contains($host, 'youtube.com')) {
            if (str_starts_with($path, '/shorts/') || str_starts_with($path, '/embed/')) {
                return strlen($path) > 9;
            }

            return str_starts_with($path, '/watch') && str_contains($query, 'v=');
        }

        if ($host === 'youtu.be' || str_ends_with($host, '.youtu.be')) {
            return strlen(trim($path, '/')) >= 8;
        }

        // Tolak domain non-video (blog, portal berita, dll.) agar kartu video selalu mengarah ke platform video nyata.
        return false;
    }

    /**
     * Tentukan platform ('instagram' | 'tiktok' | 'youtube') dari chunk grounding secara ketat.
     *
     * @param  array<string, mixed>  $chunk
     */
    public static function inferPlatformFromChunk(array $chunk): ?string
    {
        $uri = strtolower((string) ($chunk['uri'] ?? ''));
        $domain = strtolower((string) ($chunk['domain'] ?? ''));
        $title = strtolower((string) ($chunk['title'] ?? ''));
        $snippet = strtolower(implode(' ', is_array($chunk['snippets'] ?? null) ? $chunk['snippets'] : []));

        // Prioritaskan kecocokan host/URI langsung sebelum domain/title.
        if (str_contains($uri, 'instagram.com') || str_contains($domain, 'instagram.com')) {
            return 'instagram';
        }
        if (str_contains($uri, 'tiktok.com') || str_contains($domain, 'tiktok.com')) {
            return 'tiktok';
        }
        if (str_contains($uri, 'youtube.com') || str_contains($uri, 'youtu.be') || str_contains($domain, 'youtube.com') || str_contains($domain, 'youtu.be')) {
            return 'youtube';
        }

        // Jika URI adalah redirect Google Grounding, wajib ada penyebutan platform + sinyal konten video.
        if (str_contains($uri, 'vertexaisearch.cloud.google.com')) {
            $combined = $title.' '.$snippet;
            if (str_contains($combined, 'instagram') || str_contains($combined, 'reels') || str_contains($combined, 'ig reel')) {
                return 'instagram';
            }
            if (str_contains($combined, 'tiktok')) {
                return 'tiktok';
            }
            if (str_contains($combined, 'youtube') || str_contains($combined, 'shorts')) {
                return 'youtube';
            }
        }

        return null;
    }

    /**
     * Ringkas traffic video nyata per platform (mengembalikan 0/null jujur saat belum tersambung).
     *
     * @param  array<string, mixed>  $section
     * @return array<string, mixed>
     */
    public static function summarizePlatformTraffic(string $platform, array $section): array
    {
        $status = (string) ($section['status'] ?? 'not_configured');
        if ($status !== 'ok') {
            return [
                'platform' => $platform,
                'status' => $status,
                'connected' => false,
                'message' => $section['message'] ?? null,
                'videoCount' => 0,
                'totalViews' => null,
                'avgViews' => null,
                'avgEngagementRate' => null,
                'topVideo' => null,
            ];
        }

        $videos = array_values(array_filter($section['videos'] ?? [], 'is_array'));
        $count = count($videos);
        if ($count === 0) {
            return [
                'platform' => $platform,
                'status' => 'ok',
                'connected' => true,
                'message' => 'Akun tersambung namun belum ada video yang dipublikasikan.',
                'videoCount' => 0,
                'totalViews' => 0,
                'avgViews' => 0,
                'avgEngagementRate' => null,
                'topVideo' => null,
            ];
        }

        $viewValues = array_values(array_filter(array_map(fn ($v) => isset($v['views']) && is_numeric($v['views']) ? (int) $v['views'] : null, $videos), fn ($x) => $x !== null));
        $erValues = array_values(array_filter(array_map(fn ($v) => isset($v['engagementRate']) && is_numeric($v['engagementRate']) ? (float) $v['engagementRate'] : null, $videos), fn ($x) => $x !== null));

        $totalViews = $viewValues !== [] ? array_sum($viewValues) : null;
        $avgViews = $viewValues !== [] ? (int) round(array_sum($viewValues) / count($viewValues)) : null;
        $avgEr = $erValues !== [] ? round(array_sum($erValues) / count($erValues), 2) : null;

        $top = $videos[0];

        return [
            'platform' => $platform,
            'status' => 'ok',
            'connected' => true,
            'message' => null,
            'videoCount' => $count,
            'totalViews' => $totalViews,
            'avgViews' => $avgViews,
            'avgEngagementRate' => $avgEr,
            'topVideo' => [
                'title' => (string) ($top['title'] ?? ''),
                'url' => (string) ($top['url'] ?? ''),
                'views' => isset($top['views']) && is_numeric($top['views']) ? (int) $top['views'] : null,
                'engagementRate' => isset($top['engagementRate']) && is_numeric($top['engagementRate']) ? (float) $top['engagementRate'] : null,
            ],
        ];
    }

    /**
     * Parse JSON terstruktur dari AI dan kunci setiap item rekomendasi agar URL
     * dan metrik berasal eksklusif dari $candidateMap terverifikasi.
     *
     * @param  array<string, array<string, mixed>>  $candidateMap
     * @param  array<string, array<int, array<string, mixed>>>  $allowedTargets
     * @return array<string, mixed>|null
     */
    public static function parseRecommendationPayload(string $text, array $candidateMap, array $allowedTargets = []): ?array
    {
        $data = self::decodeJsonObject($text);
        if (! is_array($data) || ! isset($data['recommendations']) || ! is_array($data['recommendations'])) {
            return null;
        }

        $seenIds = [];
        $recommendations = [];

        foreach ($data['recommendations'] as $row) {
            if (! is_array($row)) {
                continue;
            }
            $cid = isset($row['candidateId']) && is_string($row['candidateId']) ? trim($row['candidateId']) : '';
            if ($cid === '' || ! isset($candidateMap[$cid]) || isset($seenIds[$cid])) {
                continue;
            }

            $description = trim((string) ($row['description'] ?? ''));
            $reason = trim((string) ($row['reason'] ?? ''));
            if ($description === '' || $reason === '') {
                continue;
            }

            $seenIds[$cid] = true;
            $cand = $candidateMap[$cid];
            $platform = (string) ($cand['platform'] ?? 'youtube');

            $adaptRaw = is_array($row['livoraAdaptation'] ?? null) ? $row['livoraAdaptation'] : [];
            $recChannel = strtolower(trim((string) ($adaptRaw['recommendedChannel'] ?? $platform)));
            if (! in_array($recChannel, self::SUPPORTED_PLATFORMS, true)) {
                $recChannel = $platform;
            }

            $shotList = [];
            foreach (is_array($adaptRaw['shotList'] ?? null) ? $adaptRaw['shotList'] : [] as $shot) {
                if (is_string($shot) && trim($shot) !== '') {
                    $shotList[] = trim($shot);
                }
            }

            $targetType = isset($adaptRaw['targetType']) && is_string($adaptRaw['targetType'])
                ? strtolower(trim($adaptRaw['targetType']))
                : null;
            $targetId = isset($adaptRaw['targetId']) && is_numeric($adaptRaw['targetId'])
                ? (int) $adaptRaw['targetId']
                : null;

            $targetName = null;
            if ($targetType && $targetId && isset($allowedTargets[$targetType][$targetId])) {
                $targetName = $allowedTargets[$targetType][$targetId]['name'] ?? null;
            } else {
                $targetType = null;
                $targetId = null;
            }

            $fitScore = isset($row['brandFitScore']) && is_numeric($row['brandFitScore'])
                ? (int) max(0, min(100, round((float) $row['brandFitScore'])))
                : 82;

            $recommendations[] = [
                'id' => $cid,
                'platform' => $platform,
                'sourceKind' => (string) ($cand['sourceKind'] ?? 'reference_creator'),
                'title' => (string) ($cand['title'] ?? ''),
                'channel' => isset($cand['channel']) && $cand['channel'] !== '' ? (string) $cand['channel'] : null,
                'url' => (string) ($cand['url'] ?? ''),
                'thumbnail' => ! empty($cand['thumbnail']) ? (string) $cand['thumbnail'] : null,
                'publishedAt' => $cand['publishedAt'] ?? null,
                'durationSeconds' => isset($cand['durationSeconds']) && is_numeric($cand['durationSeconds']) ? (int) $cand['durationSeconds'] : null,
                'views' => isset($cand['views']) && is_numeric($cand['views']) ? (int) $cand['views'] : null,
                'likes' => isset($cand['likes']) && is_numeric($cand['likes']) ? (int) $cand['likes'] : null,
                'comments' => isset($cand['comments']) && is_numeric($cand['comments']) ? (int) $cand['comments'] : null,
                'shares' => isset($cand['shares']) && is_numeric($cand['shares']) ? (int) $cand['shares'] : null,
                'saves' => isset($cand['saves']) && is_numeric($cand['saves']) ? (int) $cand['saves'] : null,
                'engagementRate' => isset($cand['engagementRate']) && is_numeric($cand['engagementRate']) ? (float) $cand['engagementRate'] : null,
                'metricsSource' => (string) ($cand['metricsSource'] ?? 'Platform API'),
                'description' => $description,
                'reason' => $reason,
                'brandFitScore' => $fitScore,
                'trafficInsight' => trim((string) ($row['trafficInsight'] ?? '')),
                'livoraAdaptation' => [
                    'conceptTitle' => trim((string) ($adaptRaw['conceptTitle'] ?? '')),
                    'hook' => trim((string) ($adaptRaw['hook'] ?? '')),
                    'shotList' => array_slice($shotList, 0, 5),
                    'captionDraft' => trim((string) ($adaptRaw['captionDraft'] ?? '')),
                    'recommendedChannel' => $recChannel,
                    'targetFormat' => trim((string) ($adaptRaw['targetFormat'] ?? self::defaultFormatForPlatform($recChannel))),
                    'targetType' => $targetType,
                    'targetId' => $targetId,
                    'targetName' => $targetName,
                ],
            ];
        }

        if ($recommendations === []) {
            return null;
        }

        $platformNotes = [];
        $rawNotes = is_array($data['platformNotes'] ?? null) ? $data['platformNotes'] : [];
        foreach (self::SUPPORTED_PLATFORMS as $p) {
            if (! empty($rawNotes[$p]) && is_string($rawNotes[$p])) {
                $platformNotes[$p] = trim($rawNotes[$p]);
            }
        }

        return [
            'trafficSummary' => trim((string) ($data['trafficSummary'] ?? '')),
            'marketSummary' => trim((string) ($data['marketSummary'] ?? '')),
            'platformNotes' => $platformNotes,
            'recommendations' => $recommendations,
        ];
    }

    /**
     * Jalankan Gemini Google Search Grounding terfokus per platform agar tautan
     * Instagram Reels, TikTok, dan YouTube eksternal terkumpul seimbang & update (tahun ini).
     *
     * @param  list<string>  $platforms
     * @param  array<string, mixed>  $brandContext
     * @return array{candidates: list<array<string, mixed>>, note: ?string}
     */
    private function discoverViaGeminiSearch(string $topic, array $platforms, array $brandContext): array
    {
        $topItemTitle = $brandContext['items'][0]['name'] ?? 'bespoke luxury sofa & walnut table';
        $topProjectTitle = $brandContext['projects'][0]['name'] ?? 'modern European interior residence';
        $year = now()->format('Y');

        $platformQueries = [];
        foreach ($platforms as $p) {
            if ($p === 'instagram') {
                $platformQueries['instagram'] = "site:instagram.com/reel OR \"instagram.com/reel\" {$topic} luxury interior design architecture {$year}";
            } elseif ($p === 'tiktok') {
                $platformQueries['tiktok'] = "site:tiktok.com luxury interior design custom furniture tour room makeover {$topic} {$year}";
            } elseif ($p === 'youtube' && ! $this->youtube->hasApiKey()) {
                $platformQueries['youtube'] = "site:youtube.com luxury interior architecture tour bespoke furniture {$topic} {$year}";
            }
        }

        if ($platformQueries === []) {
            return ['candidates' => [], 'note' => null];
        }

        $cacheKey = 'content:inspiration:grounding:'.md5($topic.'|'.implode(',', array_keys($platformQueries)).'|'.$year);
        $cached = Cache::get($cacheKey);
        if (is_array($cached)) {
            return $cached;
        }

        $sys = <<<'PROMPT'
Kamu adalah Market & Social Video Researcher untuk Livora Studio (arsitek, desain interior luxury Modern/European & custom furniture di Jakarta).
Gunakan Google Search untuk mencari VIDEO NYATA EKSTERNAL dari kreator/studio/media desain interior — BUKAN halaman blog artikel atau halaman login/homepage umum.
Jangan pernah mengarang URL atau angka views/likes. Fokus pada video terbaru yang menampilkan pencahayaan arsitektural, room tour vila/apartemen mewah, custom wardrobe/cabinetry, material travertine/marmer/kayu walnut/bouclé.
PROMPT;

        $candidates = [];
        $notes = [];
        $youtubeIdsToHydrate = [];

        foreach ($platformQueries as $targetPlat => $searchFocus) {
            $user = <<<MSG
Cari minimal 3-4 VIDEO NYATA di platform {$targetPlat} (bukan milik akun Livora sendiri) untuk inspirasi topik "{$topic}" dan katalog unggulan ("{$topItemTitle}", "{$topProjectTitle}").
Prioritaskan kata kunci pencarian: {$searchFocus}.
Jelaskan isi visual tiap video tersebut secara ringkas berdasarkan hasil pencarian.
MSG;

            try {
                $res = $this->ai->ask($sys, $user, 'content', 'gemini', [
                    'google_search' => true,
                    'temperature' => 0.2,
                    'max_tokens' => 1400,
                    'thinking_level' => 'low',
                ]);
            } catch (\Throwable $e) {
                $notes[] = strtoupper($targetPlat).' grounding: '.$e->getMessage();
                continue;
            }

            $chunks = is_array($res['groundingChunks'] ?? null) ? $res['groundingChunks'] : [];
            foreach ($chunks as $chunk) {
                $uri = (string) ($chunk['uri'] ?? '');
                if (! self::isSafeExternalVideoUri($uri)) {
                    continue;
                }

                $inferred = self::inferPlatformFromChunk($chunk) ?? (str_contains(strtolower($uri), 'vertexaisearch.cloud.google.com') ? $targetPlat : null);
                if ($inferred === null || ! in_array($inferred, $platforms, true)) {
                    continue;
                }

                $rawTextForId = $uri.' '.(string) ($chunk['title'] ?? '').' '.implode(' ', $chunk['snippets'] ?? []);
                if ($inferred === 'youtube' && ($ytId = self::extractYouTubeVideoId($rawTextForId)) !== null && $this->youtube->hasApiKey()) {
                    $youtubeIdsToHydrate[] = $ytId;
                    continue;
                }

                $title = trim((string) ($chunk['title'] ?? ''));
                $snippet = trim(implode(' ', $chunk['snippets'] ?? []));
                $genericTitles = ['instagram', 'instagram.com', 'www.instagram.com', 'tiktok', 'tiktok.com', 'www.tiktok.com', 'tiktok - make your day', 'youtube', 'youtube.com', 'www.youtube.com'];
                if ($title === '' || in_array(strtolower($title), $genericTitles, true)) {
                    if ($snippet === '') {
                        continue;
                    }
                    $title = Str::limit($snippet, 95);
                }

                $candidates[] = [
                    'platform' => $inferred,
                    'sourceKind' => 'web_discovered',
                    'id' => 'web_'.md5($uri),
                    'title' => $title,
                    'channel' => trim((string) ($chunk['domain'] ?? '')) ?: strtoupper($inferred),
                    'thumbnail' => '',
                    'url' => $uri,
                    'publishedAt' => null,
                    'durationSeconds' => null,
                    'views' => null,
                    'likes' => null,
                    'comments' => null,
                    'shares' => null,
                    'engagementRate' => null,
                    'metricsSource' => 'Google Search Grounding ('.$year.')',
                    'webSnippet' => $snippet,
                ];
            }
        }

        if ($youtubeIdsToHydrate !== []) {
            try {
                foreach ($this->youtube->hydrateByIds($youtubeIdsToHydrate) as $yt) {
                    $candidates[] = $yt + ['sourceKind' => 'reference_creator'];
                }
            } catch (\Throwable) {
                // Kandidat non-YT tetap lanjut.
            }
        }

        $out = [
            'candidates' => $this->dedupeVideos($candidates),
            'note' => $notes !== [] ? implode(' | ', $notes) : null,
        ];

        if ($out['candidates'] !== []) {
            Cache::put($cacheKey, $out, 15 * 60);
        }

        return $out;
    }

    /**
     * Ambil konteks produk populer, proyek arsitektur, dan promo aktif Livora dari DB.
     *
     * @return array{items: list<array<string, mixed>>, projects: list<array<string, mixed>>, promos: list<array<string, mixed>>}
     */
    private function readLivoraBrandContext(): array
    {
        $items = [];
        $projects = [];
        $promos = [];

        if (Schema::hasTable('items')) {
            if (Schema::hasTable('item_clicks')) {
                $items = DB::table('item_clicks')
                    ->join('items', 'items.id', '=', 'item_clicks.target_id')
                    ->where('item_clicks.target_type', 'item')
                    ->selectRaw('items.id, items.title as name, items.slug, COUNT(*) as clicks')
                    ->groupBy('items.id', 'items.title', 'items.slug')
                    ->orderByDesc('clicks')
                    ->limit(5)
                    ->get()
                    ->map(fn ($r) => ['targetType' => 'item', 'targetId' => (int) $r->id, 'name' => $r->name, 'clicks' => (int) $r->clicks])
                    ->all();
            }
            if ($items === []) {
                $items = DB::table('items')
                    ->orderByDesc('id')
                    ->limit(5)
                    ->get(['id', 'title'])
                    ->map(fn ($r) => ['targetType' => 'item', 'targetId' => (int) $r->id, 'name' => $r->title, 'clicks' => 0])
                    ->all();
            }
        }

        if (Schema::hasTable('projects')) {
            $projects = DB::table('projects')
                ->orderByDesc('is_highlighted')
                ->orderBy('sort_order')
                ->limit(4)
                ->get(['id', 'title'])
                ->map(fn ($r) => ['targetType' => 'project', 'targetId' => (int) $r->id, 'name' => $r->title])
                ->all();
        }

        if (Schema::hasTable('promo_banners')) {
            $promos = DB::table('promo_banners')
                ->where('is_active', true)
                ->limit(3)
                ->get(['id', 'title', 'label'])
                ->map(fn ($r) => ['targetType' => 'promo_banner', 'targetId' => (int) $r->id, 'name' => $r->title, 'label' => $r->label])
                ->all();
        }

        return [
            'items' => $items,
            'projects' => $projects,
            'promos' => $promos,
        ];
    }

    /** @param array<string, mixed> $brandContext */
    private function buildBrandDiscoveryQuery(array $brandContext): string
    {
        $topProject = $brandContext['projects'][0]['name'] ?? null;
        $topItem = $brandContext['items'][0]['name'] ?? null;

        $parts = ['luxury modern interior design showroom tour furniture'];
        if (is_string($topItem) && trim($topItem) !== '') {
            $parts[] = Str::limit(trim($topItem), 40, '');
        } elseif (is_string($topProject) && trim($topProject) !== '') {
            $parts[] = Str::limit(trim($topProject), 40, '');
        }

        return trim(implode(' ', $parts));
    }

    /**
     * @param  mixed  $raw
     * @return list<string>
     */
    private function normalizePlatforms(mixed $raw): array
    {
        if (! is_array($raw) || $raw === []) {
            return self::SUPPORTED_PLATFORMS;
        }
        $filtered = array_values(array_unique(array_filter(
            array_map(fn ($p) => strtolower(trim((string) $p)), $raw),
            fn ($p) => in_array($p, self::SUPPORTED_PLATFORMS, true)
        )));

        return $filtered !== [] ? $filtered : self::SUPPORTED_PLATFORMS;
    }

    /**
     * @param  list<array<string, mixed>>  $videos
     * @return list<array<string, mixed>>
     */
    private function dedupeVideos(array $videos, string $excludeUrlNorm = ''): array
    {
        $seen = [];
        $out = [];
        foreach ($videos as $v) {
            $urlKey = strtolower(trim((string) ($v['url'] ?? '')));
            if ($excludeUrlNorm !== '' && $urlKey === $excludeUrlNorm) {
                continue;
            }
            $idKey = strtolower((string) ($v['platform'] ?? '').':'.(string) ($v['id'] ?? ''));
            $key = $urlKey !== '' ? $urlKey : $idKey;
            if ($key === '' || isset($seen[$key])) {
                continue;
            }
            $seen[$key] = true;
            $out[] = $v;
        }

        return $out;
    }

    /**
     * Pastikan perwakilan lintas-platform IG, YouTube & TikTok seimbang sebelum masuk ke AI.
     *
     * @param  list<array<string, mixed>>  $candidates
     * @param  list<string>  $platforms
     * @return list<array<string, mixed>>
     */
    private function balanceCandidatesByPlatform(array $candidates, array $platforms, int $limit): array
    {
        $buckets = [];
        foreach ($platforms as $p) {
            $buckets[$p] = array_values(array_filter($candidates, fn ($c) => ($c['platform'] ?? null) === $p));
        }

        $selected = [];
        $round = 0;
        while (count($selected) < $limit) {
            $addedInRound = false;
            foreach ($platforms as $p) {
                if (isset($buckets[$p][$round])) {
                    $selected[] = $buckets[$p][$round];
                    $addedInRound = true;
                    if (count($selected) >= $limit) {
                        break 2;
                    }
                }
            }
            if (! $addedInRound) {
                break;
            }
            $round++;
        }

        return $selected;
    }

    /**
     * @param  array<string, mixed>  $brandContext
     * @return array<string, array<int, array<string, mixed>>>
     */
    private function buildAllowedTargetsMap(array $brandContext): array
    {
        $map = ['item' => [], 'project' => [], 'promo_banner' => []];
        foreach ($brandContext['items'] ?? [] as $it) {
            $map['item'][(int) $it['targetId']] = $it;
        }
        foreach ($brandContext['projects'] ?? [] as $pr) {
            $map['project'][(int) $pr['targetId']] = $pr;
        }
        foreach ($brandContext['promos'] ?? [] as $pm) {
            $map['promo_banner'][(int) $pm['targetId']] = $pm;
        }

        return $map;
    }

    /** @param list<string> $requestedPlatforms */
    private function recommendationSystemPrompt(array $requestedPlatforms): string
    {
        $brand = self::LIVORA_BRAND_PROFILE;
        $plats = implode(', ', $requestedPlatforms);

        return <<<PROMPT
Kamu adalah Creative Video Strategist, Market Analyst & Social Traffic Analyst untuk LIVORA Studio.

=== PROFIL BRAND IDENTITY LIVORA ===
{$brand}

=== TUGAS KAMU ===
1. Analisis PASAR saat ini (selera audiens high-end Jakarta/Indonesia, estetika quiet luxury, showcase ruang & craftsmanship) PLUS analisis traffic video nyata pada platform ({$plats}).
2. Pilih 4 sampai 8 kandidat video TERBAIK (prioritaskan video EKSTERNAL dari kreator/brand luar bila tersedia) yang paling tepat ditiru/diadaptasi untuk mengangkat positioning Livora.
3. Untuk SETIAP video yang direkomendasikan:
   - Wajib gunakan `candidateId` persis dari daftar kandidat (JANGAN membuat URL palsu atau mengarang angka metrik).
   - `description`: Jelaskan secara konkret isi & gaya sinematografi video (opening, transisi kamera, material/ruangan, pacing).
   - `reason`: Jelaskan alasan tajam KENAPA video ini direkomendasikan — hubungkan **tren pasar luar + estetika Brand Identity Livora + performa traffic/engagement aslinya** (bila temuan Search Grounding tanpa angka view API, nyatakan jujur bahwa nilainya berasal dari visibilitas tren pencarian & relevansi format platform saat ini).
   - `trafficInsight`: Insight singkat membandingkan metrik/format video ini terhadap performa akun Livora atau benchmark platform.
   - `livoraAdaptation`: Buat konsep konten siap produksi versi LIVORA (`conceptTitle`, `hook` 3 detik pertama, `shotList` 3-4 adegan konkret, `captionDraft` elegan berkelas tanpa terkesan hard-sell diskon murahan, `recommendedChannel`, `targetFormat`, `targetType` + `targetId` bila relevan ke produk/proyek/promo Livora).

=== ATURAN KETAT ===
- JANGAN mengarang angka views, likes, atau engagement rate yang tidak ada di input.
- Jawab dengan bahasa Indonesia profesional dan editorial.
- Balas HANYA JSON valid sesuai skema berikut:

{
  "trafficSummary": "ringkasan 2 kalimat analisis traffic lintas platform IG/YT/TikTok berdasarkan data nyata",
  "marketSummary": "ringkasan 2 kalimat analisis peluang pasar & tren konten eksternal saat ini untuk segmen Livora",
  "platformNotes": {
    "instagram": "format & strategi traffic optimal di IG Reels untuk Livora",
    "youtube": "format & strategi traffic optimal di YouTube Long/Shorts untuk Livora",
    "tiktok": "format & strategi traffic optimal di TikTok untuk Livora"
  },
  "recommendations": [
    {
      "candidateId": "cand_1",
      "brandFitScore": 92,
      "description": "deskripsi video...",
      "reason": "alasan rekomendasi untuk brand identity, tren pasar & traffic...",
      "trafficInsight": "insight traffic singkat...",
      "livoraAdaptation": {
        "conceptTitle": "judul konsep konten Livora",
        "hook": "opening 3 detik pertama",
        "shotList": ["Shot 1: ...", "Shot 2: ...", "Shot 3: ..."],
        "captionDraft": "draft caption elegan + CTA showroom/konsultasi",
        "recommendedChannel": "instagram",
        "targetFormat": "IG Reels 30-45 detik",
        "targetType": "item",
        "targetId": 1
      }
    }
  ]
}
PROMPT;
    }

    /**
     * @param  array<string, mixed>  $payload
     * @param  list<string>  $requestedPlatforms
     * @param  array<string, mixed>  $trafficOverview
     * @param  array<string, mixed>  $brandContext
     * @param  array<string, array<string, mixed>>  $candidateMap
     * @param  array<string, mixed>|null  $marketBrief
     */
    private function recommendationUserPrompt(
        array $payload,
        string $effectiveTopic,
        array $requestedPlatforms,
        array $trafficOverview,
        array $brandContext,
        array $candidateMap,
        ?array $marketBrief = null,
    ): string {
        $compactCandidates = [];
        foreach ($candidateMap as $cid => $c) {
            $compactCandidates[] = [
                'candidateId' => $cid,
                'platform' => $c['platform'],
                'sourceKind' => $c['sourceKind'] ?? 'reference_creator',
                'title' => $c['title'],
                'channel' => $c['channel'] ?? null,
                'url' => $c['url'],
                'publishedAt' => $c['publishedAt'] ?? null,
                'durationSeconds' => $c['durationSeconds'] ?? null,
                'views' => $c['views'] ?? null,
                'likes' => $c['likes'] ?? null,
                'comments' => $c['comments'] ?? null,
                'shares' => $c['shares'] ?? null,
                'engagementRate' => $c['engagementRate'] ?? null,
                'metricsSource' => $c['metricsSource'] ?? 'Platform API',
                'webSnippet' => $c['webSnippet'] ?? null,
            ];
        }

        $dataBlock = [
            'tanggal_analisis' => now()->toDateString(),
            'topik_fokus' => $effectiveTopic,
            'platform_dipilih' => $requestedPlatforms,
            'ringkasan_riset_pasar' => $marketBrief,
            'video_acuan_user' => ! empty($payload['sourceTitle']) ? [
                'title' => $payload['sourceTitle'],
                'platform' => $payload['sourcePlatform'] ?? null,
                'views' => $payload['sourceViews'] ?? null,
                'engagementRate' => $payload['sourceEngagementRate'] ?? null,
            ] : null,
            'traffic_akun_livora' => $trafficOverview,
            'katalog_proyek_promo_livora' => $brandContext,
            'kandidat_video_terverifikasi' => $compactCandidates,
        ];

        return "Data nyata Livora, konteks pasar & kandidat video untuk dianalisis:\n\n"
            .json_encode($dataBlock, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }

    /** @return array<string, mixed>|null */
    private static function decodeJsonObject(string $text): ?array
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

    private static function defaultFormatForPlatform(string $platform): string
    {
        return match ($platform) {
            'instagram' => 'IG Reels 30-45 detik (vertical 9:16)',
            'tiktok' => 'TikTok 25-40 detik (hook cepat + detail tekstur)',
            default => 'YouTube 4-7 menit / Shorts 45 detik',
        };
    }

    /** @param array<string, mixed> $parsed */
    private function formatSummaryText(array $parsed): string
    {
        $lines = [];
        if (! empty($parsed['marketSummary'])) {
            $lines[] = $parsed['marketSummary'];
        }
        if (! empty($parsed['trafficSummary'])) {
            $lines[] = $parsed['trafficSummary'];
        }
        foreach ($parsed['recommendations'] ?? [] as $idx => $rec) {
            $lines[] = sprintf(
                "\n%d. [%s] %s (Brand Fit %d%%)\nAlasan: %s",
                $idx + 1,
                strtoupper((string) $rec['platform']),
                $rec['title'],
                $rec['brandFitScore'],
                $rec['reason']
            );
        }

        return trim(implode("\n", $lines));
    }

    /**
     * Fallback jujur jika provider AI error atau gagal mengembalikan JSON valid.
     *
     * @param  array<string, array<string, mixed>>  $candidateMap
     * @param  array<string, mixed>  $brandContext
     * @return list<array<string, mixed>>
     */
    private function buildDeterministicFallbackRecommendations(array $candidateMap, array $brandContext): array
    {
        $firstItem = $brandContext['items'][0] ?? null;
        $out = [];

        foreach (array_slice($candidateMap, 0, 6) as $cid => $cand) {
            $platform = (string) ($cand['platform'] ?? 'youtube');
            $viewsStr = isset($cand['views']) && is_numeric($cand['views'])
                ? number_format((int) $cand['views']).' views'
                : 'ditemukan lewat Google Search Grounding';
            $erStr = isset($cand['engagementRate']) && is_numeric($cand['engagementRate'])
                ? ', engagement rate '.$cand['engagementRate'].'%'
                : '';

            $out[] = [
                'id' => $cid,
                'platform' => $platform,
                'sourceKind' => (string) ($cand['sourceKind'] ?? 'reference_creator'),
                'title' => (string) ($cand['title'] ?? ''),
                'channel' => isset($cand['channel']) && $cand['channel'] !== '' ? (string) $cand['channel'] : null,
                'url' => (string) ($cand['url'] ?? ''),
                'thumbnail' => ! empty($cand['thumbnail']) ? (string) $cand['thumbnail'] : null,
                'publishedAt' => $cand['publishedAt'] ?? null,
                'durationSeconds' => isset($cand['durationSeconds']) && is_numeric($cand['durationSeconds']) ? (int) $cand['durationSeconds'] : null,
                'views' => isset($cand['views']) && is_numeric($cand['views']) ? (int) $cand['views'] : null,
                'likes' => isset($cand['likes']) && is_numeric($cand['likes']) ? (int) $cand['likes'] : null,
                'comments' => isset($cand['comments']) && is_numeric($cand['comments']) ? (int) $cand['comments'] : null,
                'shares' => isset($cand['shares']) && is_numeric($cand['shares']) ? (int) $cand['shares'] : null,
                'saves' => isset($cand['saves']) && is_numeric($cand['saves']) ? (int) $cand['saves'] : null,
                'engagementRate' => isset($cand['engagementRate']) && is_numeric($cand['engagementRate']) ? (float) $cand['engagementRate'] : null,
                'metricsSource' => (string) ($cand['metricsSource'] ?? 'Platform API'),
                'description' => ! empty($cand['webSnippet'])
                    ? (string) $cand['webSnippet']
                    : 'Referensi video '.$platform.' dari '.$cand['channel'].' terkait interior design & showcase produk.',
                'reason' => 'Direkomendasikan sebagai referensi nyata dari '.($cand['metricsSource'] ?? $platform).' ('.$viewsStr.$erStr.') yang relevan dengan segmen interior luxury & furnitur Livora.',
                'brandFitScore' => 80,
                'trafficInsight' => $viewsStr.$erStr,
                'livoraAdaptation' => [
                    'conceptTitle' => 'Adaptasi Konsep: '.Str::limit((string) $cand['title'], 70),
                    'hook' => 'Buka dengan close-up detail material & pencahayaan ruangan sebelum menampilkan sudut lebar ruang.',
                    'shotList' => [
                        'Shot 1: Detail tekstur marmer/kayu/fabric (0-3 detik)',
                        'Shot 2: Pan perlahan menampilkan komposisi furnitur utama Livora',
                        'Shot 3: Detail finishing & ajakan konsultasi desain di showroom Livora',
                    ],
                    'captionDraft' => 'Kesederhanaan ruang hadir dari presisi material dan proporsi. Kunjungi showroom LIVORA untuk konsultasi interior & custom furniture.',
                    'recommendedChannel' => $platform,
                    'targetFormat' => self::defaultFormatForPlatform($platform),
                    'targetType' => $firstItem['targetType'] ?? null,
                    'targetId' => $firstItem['targetId'] ?? null,
                    'targetName' => $firstItem['name'] ?? null,
                ],
            ];
        }

        return $out;
    }

    /**
     * @param  array<string, mixed>  $trafficOverview
     * @param  array<string, array<string, mixed>>  $candidateMap
     */
    private function buildDeterministicTrafficSummary(array $trafficOverview, array $candidateMap): string
    {
        $connected = [];
        foreach (self::SUPPORTED_PLATFORMS as $p) {
            if (! empty($trafficOverview[$p]['connected'])) {
                $v = $trafficOverview[$p]['totalViews'];
                $er = $trafficOverview[$p]['avgEngagementRate'];
                $connected[] = strtoupper($p).' ('.($v !== null ? number_format((int) $v).' views' : 'aktif').($er !== null ? ', '.$er.'% rata-rata ER' : '').')';
            }
        }

        $prefix = $connected !== []
            ? 'Traffic akun Livora yang terbaca: '.implode('; ', $connected).'. '
            : 'Akun media sosial Livora belum mengirim metrik langsung dari environment ini. ';

        return $prefix.'Tersedia '.count($candidateMap).' video kandidat terverifikasi lintas platform untuk diadaptasi.';
    }

    /**
     * @param  list<string>  $platforms
     * @return array<string, string>
     */
    private function defaultPlatformFormatNotes(array $platforms): array
    {
        $defaults = [
            'instagram' => 'IG Reels 30–45 detik: fokus mood lighting hangat, reveal ruang, dan detail material close-up.',
            'youtube' => 'YouTube Architecture Tour 4–7 menit atau Shorts 45 detik: storytelling proyek dari konsep hingga instalasi.',
            'tiktok' => 'TikTok 20–35 detik: hook visual 3 detik pertama pada detail workshop & transformasi ruangan.',
        ];

        $out = [];
        foreach ($platforms as $p) {
            if (isset($defaults[$p])) {
                $out[$p] = $defaults[$p];
            }
        }

        return $out;
    }
}
