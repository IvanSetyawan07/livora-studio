<?php

namespace App\Services\AI;

use App\Models\AiActivityLog;
use App\Models\AiAgent;
use App\Models\AiInsight;
use App\Models\AiRecommendation;
use App\Services\Google\GoogleSearchConsoleClient;
use App\Services\Google\SearchConsoleSiteResolver;
use Throwable;

/**
 * SEO Agent — agent kedua (setelah CRO) yang benar-benar membaca data asli.
 *
 * Struktur file ini sengaja dibuat semirip mungkin dengan CroAgentService:
 * kumpulkan snapshot data mentah dulu → kalau tidak cukup, berhenti dengan
 * jujur → kirim snapshot ke AIProviderManager → parse ketat → tulis ke
 * ai_insights/ai_recommendations. Bedanya cuma sumber datanya: di sini dari
 * Google Search Console, bukan dari tabel consultation.
 *
 * Prinsip yang TIDAK boleh dilanggar: kalau Search Console belum connect,
 * atau datanya masih terlalu kecil untuk disimpulkan, JANGAN panggil AI dan
 * JANGAN menulis insight. Domain livoralcr.com masih baru, jadi kasus
 * "belum ada data" itu normal — bukan error yang perlu ditutupi dengan
 * angka karangan.
 */
class SeoAgentService
{
    private const AGENT_KEY = 'seo';

    /** Rentang analisis default, mengikuti default Search Console UI. */
    private const WINDOW_DAYS = 28;

    /**
     * Minimal jumlah impression dalam periode analisis supaya polanya layak
     * disimpulkan. Angka kecil (impression < 50) sebenarnya cuma noise —
     * satu-dua kunjungan bot sudah bisa menggeser posisi rata-rata.
     */
    private const MIN_IMPRESSIONS = 50;

    /** Minimal baris query supaya AI punya bahan pembanding, bukan cuma 1-2 keyword. */
    private const MIN_QUERY_ROWS = 3;

    public function __construct(
        private AIProviderManager $ai,
        private GoogleSearchConsoleClient $searchConsole,
        private SearchConsoleSiteResolver $siteResolver,
    ) {
    }

    /**
     * Jalankan satu siklus analisis SEO. Dipanggil dari `ai:run-agent seo`.
     *
     * @return array{status: string, message?: string, insights_created?: int, recommendations_created?: int, provider?: string, raw?: string}
     */
    public function run(int $limit = 5): array
    {
        $snapshot = $this->buildSeoSnapshot();

        if (isset($snapshot['error'])) {
            return ['status' => 'empty', 'message' => $snapshot['error']];
        }

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
                'message' => 'SEO Agent merespons tapi tidak menghasilkan insight yang valid (format JSON '
                    .'tidak sesuai skema). Tidak ada data yang ditulis.',
                'kind' => 'system',
            ]);

            return [
                'status' => 'error',
                'message' => 'Respons AI tidak bisa di-parse jadi insight yang valid.',
                'raw' => $result['text'],
            ];
        }

        $items = array_slice($items, 0, $limit);

        $insightsCreated = 0;
        $recommendationsCreated = 0;

        foreach ($items as $item) {
            $insight = AiInsight::create([
                'title' => $item['title'],
                'description' => $item['description'],
                'type' => $item['type'],
                'severity' => $item['severity'],
                'confidence' => $this->clampConfidence($item['confidence']),
                'source' => ['Google Search Console'],
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
                $recommendation = AiRecommendation::create([
                    'insight_id' => $insight->id,
                    'title' => $recData['title'],
                    'description' => $recData['description'],
                    'action_type' => $recData['action_type'] ?? 'content',
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
                ]);

                $insight->update(['recommendation_id' => $recommendation->id]);
                $recommendationsCreated++;
            }
        }

        AiAgent::where('key', self::AGENT_KEY)->update([
            'status' => 'active',
            'connection_state' => 'connected',
            'last_run_at' => now(),
        ]);
        AiAgent::setDependencyState(self::AGENT_KEY, 'Google Search Console', 'connected');

        AiActivityLog::create([
            'actor' => 'AI',
            'agent_key' => self::AGENT_KEY,
            'message' => "SEO Agent menghasilkan {$insightsCreated} insight baru "
                ."({$recommendationsCreated} disertai rekomendasi) dari data Search Console "
                ."property {$snapshot['site_url']}, via provider {$result['provider']}.",
            'kind' => 'insight',
        ]);

        return [
            'status' => 'ok',
            'insights_created' => $insightsCreated,
            'recommendations_created' => $recommendationsCreated,
            'provider' => $result['provider'],
        ];
    }

    /**
     * Snapshot data ASLI dari Search Console: agregat total + rincian per
     * query dan per page untuk 28 hari terakhir.
     *
     * Return array dengan key 'error' (string) kalau belum layak dianalisis —
     * caller wajib berhenti di situ, tidak boleh lanjut memanggil AI.
     */
    public function buildSeoSnapshot(int $days = self::WINDOW_DAYS): array
    {
        $resolved = $this->siteResolver->resolve();

        if ($resolved['site'] === null) {
            return ['error' => $resolved['reason']
                ?? 'Google Search Console belum terhubung. Hubungkan dulu dari halaman SEO Agent.'];
        }

        $site = $resolved['site'];

        // Search Console punya jeda data ~2 hari; minta sampai hari ini tetap aman
        // (baris terakhir cuma kosong), tapi start date dihitung mundur dari hari ini.
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
                ."(butuh minimal ".self::MIN_IMPRESSIONS." impression dan ".self::MIN_QUERY_ROWS." query dalam {$days} hari; "
                ."saat ini {$totals['impressions']} impression dari ".count($byQuery).' query). '
                .'Tidak ada insight yang dibuat.'];
        }

        return [
            'site_url' => $site,
            'period' => ['start' => $start, 'end' => $end, 'days' => $days],
            'totals' => $totals,
            'top_queries' => $this->flatten($byQuery),
            'top_pages' => $this->flatten($byPage),
        ];
    }

    /**
     * Agregat total dari baris per-dimensi. CTR & posisi rata-rata SENGAJA
     * dihitung ulang di sini (bukan dirata-rata mentah) supaya bobotnya benar:
     * CTR = total klik / total impression, posisi = rata-rata tertimbang impression.
     *
     * @param array<int, array{keys: string[], clicks: int, impressions: int, ctr: float, position: float}> $rows
     * @return array{clicks: int, impressions: int, ctr: float, position: float, rows: int}
     */
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

    /** Ubah baris Search Console jadi bentuk datar yang enak dibaca AI. */
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
Kamu adalah SEO Analyst untuk Livora Studio, platform interior design & furniture custom di
Indonesia. Tugasmu menganalisis data organic search dari Google Search Console (per keyword/query
dan per halaman) untuk menemukan peluang dan masalah SEO yang nyata.

ATURAN KETAT — WAJIB DIIKUTI:
- Analisis HANYA berdasarkan angka dan keyword yang ADA di data pada pesan user. DILARANG KERAS
  mengarang keyword, URL, volume pencarian, angka klik/impression, atau kompetitor yang tidak
  disebutkan di data tersebut.
- Domain ini relatif baru, jadi angkanya memang kecil. Jangan melebih-lebihkan: kalau sebuah
  keyword cuma punya beberapa impression, sebut apa adanya dan turunkan "confidence".
- Fokus pada pola yang benar-benar terlihat di data, misalnya: query dengan impression tinggi tapi
  CTR rendah (masalah title/meta description), query di posisi 8-20 yang tinggal sedikit lagi masuk
  halaman 1, halaman dengan banyak impression tapi nol klik, atau ketidakcocokan antara query yang
  masuk dan halaman yang muncul.
- Kalau datanya ambigu, JANGAN dipaksakan jadi insight. Lebih baik sedikit tapi akurat.
- Maksimal {$limit} insight per respons.
- Isi field "recommendation" HANYA kalau ada langkah konkret yang bisa langsung dikerjakan tim
  Livora (mis. menulis ulang title tag halaman tertentu, membuat konten untuk query tertentu).
  Kalau murni observasi, set "recommendation" ke null.
- "confidence" (0-100) mencerminkan seberapa yakin pola ini nyata secara statistik dari besarnya
  angka yang diberikan, BUKAN seberapa penting insight-nya.
- Balas HANYA dengan JSON valid, TANPA teks pembuka/penutup, TANPA markdown code fence, PERSIS
  sesuai skema berikut:

{
  "insights": [
    {
      "title": "judul singkat, maksimal 12 kata",
      "description": "ringkasan 1-2 kalimat",
      "type": "opportunity" | "warning" | "trend" | "anomaly",
      "severity": "low" | "medium" | "high" | "critical",
      "confidence": 0-100,
      "reasoning": "kenapa kamu menyimpulkan ini, WAJIB sebut query/halaman dan angka konkret dari data",
      "what_happened": "apa yang ditemukan di data, bahasa yang mudah dibaca tim non-teknis",
      "why_it_matters": "dampak ke bisnis Livora kalau dibiarkan",
      "expected_impact": "perkiraan dampak KUALITATIF kalau diperbaiki — jangan karang angka trafik atau rupiah spesifik",
      "recommendation": {
        "title": "judul singkat",
        "description": "ringkasan 1-2 kalimat",
        "action_type": "content" | "technical_seo" | "on_page" | "process_change" | "other",
        "risk": "low" | "medium" | "high",
        "priority": "low" | "medium" | "high",
        "expected_impact": "string",
        "confidence": 0-100,
        "why": "alasan singkat kenapa ini direkomendasikan",
        "suggested_action": "langkah konkret, sebutkan query/URL spesifik dari data"
      } | null
    }
  ]
}
PROMPT;
    }

    private function userPrompt(array $snapshot): string
    {
        $json = json_encode($snapshot, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        return "Data Google Search Console Livora (semua angka nyata dari API, bukan contoh):\n\n{$json}\n\n"
            ."Analisis data di atas dan hasilkan insight sesuai skema yang sudah dijelaskan di system prompt.";
    }

    /**
     * Parse & validasi respons AI. Item yang tidak lolos validasi DIBUANG,
     * bukan diperbaiki/ditebak — sama seperti CroAgentService.
     */
    private function parseResponse(string $text): array
    {
        $clean = trim($text);
        $clean = preg_replace('/^```(json)?/i', '', $clean);
        $clean = preg_replace('/```$/', '', $clean);
        $clean = trim($clean);

        $data = json_decode($clean, true);

        if (!is_array($data) || !isset($data['insights']) || !is_array($data['insights'])) {
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
            if (empty($item[$field]) || !is_string($item[$field])) {
                return false;
            }
        }

        if (!in_array($item['type'], ['opportunity', 'warning', 'trend', 'anomaly', 'recommendation'], true)) {
            return false;
        }

        if (!in_array($item['severity'], ['low', 'medium', 'high', 'critical'], true)) {
            return false;
        }

        return isset($item['confidence']) && is_numeric($item['confidence']);
    }

    private function isValidRecommendation(array $rec): bool
    {
        return !empty($rec['title']) && is_string($rec['title'])
            && !empty($rec['description']) && is_string($rec['description']);
    }

    private function clampConfidence(mixed $value): int
    {
        return (int) max(0, min(100, (int) round((float) $value)));
    }
}
