<?php

namespace App\Http\Controllers\Api\Ai;

use App\Http\Controllers\Controller;
use App\Http\Resources\Ai\AiRecommendationResource;
use App\Models\AiActivityLog;
use App\Models\AiAgent;
use App\Models\AiApproval;
use App\Models\AiCampaign;
use App\Models\AiContentDraft;
use App\Models\AiInsight;
use App\Models\AiRecommendation;
use App\Services\AI\AiLearningMemoryService;
use App\Services\AI\AIProviderManager;
use App\Services\AI\ChatCommandExecutor;
use App\Services\AI\MarketIntelligenceService;
use App\Services\Google\GoogleOAuthTokenStore;
use App\Services\Marketing\MarketingPeriod;
use App\Services\Marketing\MarketingSnapshot;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;

/**
 * Ask Livora — Chief Marketing & Profit Intelligence AI.
 *
 * 1) Grounding 100% Real: membaca data penjualan/order Rupiah, pipeline konsultasi,
 *    antrean WhatsApp LiviBot, produk demand tertinggi, Search Console, Local SEO,
 *    kampanye, antrean konten, action queue, serta riset pasar eksternal.
 * 2) Self-Learning & Adaptif: membaca rekam jejak Impact (eksperimen mana yang berhasil
 *    vs gagal), pola keputusan admin, serta aturan strategi profit yang disimpan.
 * 3) Kendali 100% Fitur: dapat langsung mengeksekusi perintah di seluruh fitur
 *    AI Marketing melalui `ChatCommandExecutor` (`operations`).
 */
class ChatController extends Controller
{
    private const VALID_AGENT_KEYS = ['seo', 'content', 'ads', 'leads', 'cro'];

    public function __construct(
        protected AIProviderManager $manager,
        protected GoogleOAuthTokenStore $tokens,
        protected MarketingSnapshot $snapshot,
        protected ?MarketIntelligenceService $market = null,
        protected ?AiLearningMemoryService $learning = null,
        protected ?ChatCommandExecutor $commandExecutor = null,
    ) {
    }

    public function ask(Request $request)
    {
        $validated = $request->validate([
            'message' => ['required', 'string', 'max:2000'],
            'context' => ['nullable', 'string'],
            'webSearch' => ['nullable', 'boolean'],
            'history' => ['nullable', 'array', 'max:8'],
            'history.*.role' => ['required_with:history', 'string', 'in:user,assistant'],
            'history.*.text' => ['required_with:history', 'string', 'max:1500'],
        ]);

        $context = $validated['context'] ?? 'general';
        $period = MarketingPeriod::fromRequest($request, 30);
        $msgLower = strtolower($validated['message']);
        $wantsMarketSearch = (bool) ($validated['webSearch'] ?? false)
            || preg_match('/\b(pasar|market|tren|trend|kompetitor|competitor|luar|eksternal|benchmark|video|tiktok|instagram|youtube)\b/i', $msgLower) === 1;

        try {
            $grounding = $this->groundingBlock($context, $period);
        } catch (\Throwable) {
            $grounding = "\n\n=== DATA NYATA LIVORA ===\nHalaman aktif: {$context}\n=== AKHIR DATA ===\n";
        }

        $systemPrompt = $this->systemPromptFor($context).$grounding;

        $historyBlock = '';
        if (! empty($validated['history'])) {
            $lines = [];
            foreach (array_slice($validated['history'], -6) as $turn) {
                $speaker = ($turn['role'] ?? 'user') === 'user' ? 'User' : 'Assistant';
                $lines[] = "{$speaker}: {$turn['text']}";
            }
            if ($lines !== []) {
                $historyBlock = "Riwayat percakapan sebelumnya:\n".implode("\n", $lines)."\n\nPertanyaan/Perintah baru User:\n";
            }
        }

        $userPrompt = $historyBlock.$validated['message'];
        $result = null;
        $providerError = null;

        try {
            if ($wantsMarketSearch && $this->manager->hasProvider('gemini')) {
                try {
                    $result = $this->manager->ask($systemPrompt, $userPrompt, 'chat', 'gemini', [
                        'google_search' => true,
                        'max_tokens' => 3500,
                    ]);
                } catch (\Throwable) {
                    $result = $this->manager->ask($systemPrompt, $userPrompt, 'chat', null, [
                        'max_tokens' => 3500,
                    ]);
                }
            } else {
                $result = $this->manager->ask($systemPrompt, $userPrompt, 'chat', null, [
                    'max_tokens' => 3500,
                ]);
            }
        } catch (\Throwable $e) {
            $providerError = $e->getMessage();
        }

        if ($result === null) {
            $operations = $this->inferExplicitOperations($validated['message']);
            $executedActions = [];
            if ($operations !== [] && $this->commandExecutor !== null) {
                try {
                    $executedActions = $this->commandExecutor->executeBatch($operations);
                } catch (\Throwable) {
                    // ignore
                }
            }

            $fallbackReply = $this->buildLocalAnalyticalReply(
                $validated['message'],
                $context,
                $period,
                $executedActions,
                $providerError
            );

            return response()->json([
                'id' => 'msg_'.now()->timestamp.'_'.uniqid(),
                'role' => 'assistant',
                'text' => $fallbackReply,
                'provider' => 'livora-db-intelligence',
                'model' => 'real-data-engine',
                'createdAt' => now()->toISOString(),
                'recommendation' => null,
                'executedActions' => $executedActions,
            ]);
        }

        $parsed = $this->parseChatResponse($result['text']);
        $replyText = $parsed['reply'];

        $chunks = is_array($result['groundingChunks'] ?? null) ? array_slice($result['groundingChunks'], 0, 4) : [];
        if ($chunks !== []) {
            $srcLines = [];
            foreach ($chunks as $c) {
                if (! empty($c['uri'])) {
                    $srcLines[] = '- '.($c['title'] ?: 'Sumber Web').': '.$c['uri'];
                }
            }
            if ($srcLines !== []) {
                $replyText .= "\n\nSumber riset web:\n".implode("\n", $srcLines);
            }
        }

        $createdRecommendation = null;
        if ($parsed['recommendation'] !== null) {
            $createdRecommendation = $this->tryCreateRecommendation($parsed['recommendation'], $result['provider']);
        }

        $operations = $parsed['operations'];
        if ($operations === []) {
            $operations = $this->inferExplicitOperations($validated['message']);
        }

        $executedActions = [];
        if ($operations !== [] && $this->commandExecutor !== null) {
            $executedActions = $this->commandExecutor->executeBatch($operations);
        }

        return response()->json([
            'id' => 'msg_'.now()->timestamp.'_'.uniqid(),
            'role' => 'assistant',
            'text' => $replyText,
            'provider' => $result['provider'] ?? null,
            'model' => $result['model'] ?? null,
            'createdAt' => now()->toISOString(),
            'recommendation' => $createdRecommendation
                ? new AiRecommendationResource($createdRecommendation)
                : null,
            'executedActions' => $executedActions,
        ]);
    }

    protected function systemPromptFor(string $context): string
    {
        $agentList = implode(', ', self::VALID_AGENT_KEYS);

        return "Kamu adalah **Livora Chief Marketing & Profit Intelligence AI** untuk Livora Studio (PT Langgeng Cipta Ruang), brand & studio arsitek, interior design high-end, dan custom furniture premium di Indonesia.\n\n"
            ."KAPABILITAS & STANDAR PENALARAN TINGGI:\n"
            ."1. **100% Real Data Base**: Kamu memiliki akses penuh ke seluruh data bisnis Livora di blok DATA di bawah (omzet Rupiah & order shop, pipeline konsultasi interior per tahap, antrean cek harga WhatsApp LiviBot, produk demand tertinggi beserta harganya, proyek portofolio, Search Console, Local SEO, Ads, Content Queue, Campaign, Actions, dan Impact). JANGAN PERNAH mengarang angka internal yang tidak ada di blok DATA.\n"
            ."2. **Deep Marketing & Profit Reasoning**: Setiap kali ditanya analisis atau strategi, gunakan penalaran berlapis:\n"
            ."   - **Diagnosa Akar Masalah / Peluang**: Sebutkan angka, ID item/proyek/lead, dan rasio konversi nyata dari database.\n"
            ."   - **Dampak Profit & Unit Economics**: Hubungkan analisis dengan potensi pendapatan Rupiah (order furniture, AOV, atau konversi konsultasi desain interior bernilai tinggi) dan kebocoran funnel yang harus ditutup.\n"
            ."   - **Self-Learning & Adaptasi**: Rujuk MEMORI PEMBELAJARAN ADAPTIF (aksi mana yang terbukti positif vs negatif di Impact, serta aturan strategi Livora).\n"
            ."   - **Langkah Eksekusi Berprioritas**: Berikan taktik tajam yang spesifik untuk pasar interior & furniture Indonesia (bukan saran generik).\n"
            ."3. **Kendali 100% Fitur Dashboard (`operations`)**: Jika user meminta kamu melakukan tindakan di sistem (mis. menjalankan agent, menyetujui rekomendasi, mengeksekusi action, membuat draft konten, membuat/mengubah campaign, menganalisis pasar/video, me-refresh impact, mengubah provider AI, atau menyimpan aturan pembelajaran baru), WAJIB masukkan perintah tersebut ke array `\"operations\"` di JSON balasanmu agar sistem langsung mengeksekusinya secara nyata!\n\n"
            ."DAFTAR `operations` YANG BISA KAMU KENDALIKAN:\n"
            ."- `{\"type\": \"run_agent\", \"agent_key\": \"seo\"|\"content\"|\"ads\"|\"leads\"|\"cro\"|\"all\", \"limit\": 4}`\n"
            ."- `{\"type\": \"approve_recommendation\", \"id\": 12}` atau `{\"type\": \"approve_recommendation\", \"scope\": \"all_low_risk\"|\"all_pending\"}`\n"
            ."- `{\"type\": \"reject_recommendation\", \"id\": 12}`\n"
            ."- `{\"type\": \"execute_action\", \"id\": 15}` atau `{\"type\": \"execute_action\", \"scope\": \"all_approved\"|\"all_low_risk\"|\"retry_failed\"}`\n"
            ."- `{\"type\": \"reject_action\", \"id\": 15}`\n"
            ."- `{\"type\": \"create_content_draft\", \"title\": \"...\", \"channel\": \"instagram\"|\"tiktok\"|\"youtube\"|\"facebook\"|\"email\"|\"website\", \"headline\": \"...\", \"caption\": \"...\", \"body\": \"...\", \"cta_label\": \"...\"}`\n"
            ."- `{\"type\": \"update_content_draft\", \"id\": 5, \"status\": \"approved\"|\"scheduled\", \"caption\": \"...\"}`\n"
            ."- `{\"type\": \"delete_content_draft\", \"id\": 5}`\n"
            ."- `{\"type\": \"push_draft_to_email\", \"id\": 5}`\n"
            ."- `{\"type\": \"create_campaign\", \"name\": \"...\", \"channel\": \"...\", \"summary\": \"...\", \"budget_daily\": \"Rp ...\", \"status\": \"Active\", \"plan\": [\"langkah 1\", \"langkah 2\"]}`\n"
            ."- `{\"type\": \"update_campaign\", \"id\": 3, \"status\": \"Active\"|\"Paused\"|\"Ended\", \"health\": \"Good\"|\"Fair\"|\"Needs Attention\"}`\n"
            ."- `{\"type\": \"sync_campaigns\"}`\n"
            ."- `{\"type\": \"refresh_impact\"}`\n"
            ."- `{\"type\": \"analyze_market\", \"focus\": \"...\"}`\n"
            ."- `{\"type\": \"recommend_videos\", \"query\": \"...\", \"scope\": \"external\"|\"all\", \"save_top_to_queue\": true}`\n"
            ."- `{\"type\": \"dismiss_insight\", \"id\": 8}`\n"
            ."- `{\"type\": \"set_provider_preference\", \"provider\": \"gemini\"|\"groq\"|\"anthropic\"|\"auto\"}`\n"
            ."- `{\"type\": \"save_learning_rule\", \"rule\": \"...\", \"category\": \"profit_focus\"|\"brand_voice\"|\"target_audience\"|\"channel_strategy\"}`\n"
            ."- `{\"type\": \"record_ig_boost\", \"title\": \"Boost Reels/Post ...\", \"spendRp\": 1500000, \"reach\": 12000, \"clicks\": 180, \"leads\": 8}`\n\n"
            ."FORMAT BALASAN — WAJIB JSON VALID TANPA MARKDOWN FENCE:\n"
            .'{"reply": "penjelasan mendalam, tajam, terstruktur (boleh pakai bullet & baris baru) dalam bahasa Indonesia profesional", '
            .'"recommendation": null | {'
            .'"agent_key": salah satu dari ['.$agentList.'], '
            .'"title": "judul singkat <= 12 kata", '
            .'"description": "ringkasan 1-2 kalimat", '
            .'"action_type": "on_page" | "content" | "follow_up" | "process_change" | "training" | "other", '
            .'"target_type": "item" | "project" | "promo_banner" | null, '
            .'"target_id": number | null, '
            .'"risk": "low" | "medium" | "high", '
            .'"priority": "low" | "medium" | "high", '
            .'"expected_impact": "dampak kualitatif ke konversi/profit", '
            .'"confidence": 0-100, '
            .'"why": "alasan merujuk angka konkret DATA", '
            .'"suggested_action": "langkah konkret"'
            .'}, '
            .'"operations": []}'."\n"
            ."Catatan: Isi `operations` HANYA ketika user memang meminta aksi dieksekusi/dibuat/diubah/diajarkan, atau ketika user berkata 'lakukan/kerjakan/eksekusi sekarang'.";
    }

    protected function groundingBlock(string $context, MarketingPeriod $period): string
    {
        $agents = AiAgent::query()
            ->get(['key', 'name', 'status', 'connection_state', 'last_run_at'])
            ->map(fn ($a) => "- {$a->key} ({$a->name}): status={$a->status}, koneksi={$a->connection_state}, "
                .'terakhir run='.($a->last_run_at ? $a->last_run_at->toDateTimeString() : 'belum pernah'))
            ->implode("\n");

        $insightsQuery = AiInsight::query()->latest();
        if (Schema::hasColumn('ai_insights', 'dismissed_at')) {
            $insightsQuery->whereNull('dismissed_at');
        }
        $insights = $insightsQuery->limit(15)
            ->get()
            ->map(fn ($i) => "- [insight#{$i->id} | {$i->agent_key}/{$i->severity}] {$i->title} — {$i->description}")
            ->implode("\n");

        $recs = AiRecommendation::query()->where('status', 'pending')->latest()->limit(15)
            ->get()
            ->map(fn ($r) => "- [rec#{$r->id} | {$r->agent_key} | prioritas={$r->priority} | risk={$r->risk} | type={$r->action_type}] {$r->title} — {$r->description}")
            ->implode("\n");

        $actions = Schema::hasTable('ai_approvals')
            ? AiApproval::query()
                ->whereIn('status', ['pending', 'approved', 'failed'])
                ->orderByDesc('requested_at')
                ->limit(12)
                ->get()
                ->map(fn ($a) => "- [action#{$a->id} | rec#{$a->recommendation_id} | {$a->agent_key} | status={$a->status} | risk={$a->risk}] {$a->title}")
                ->implode("\n")
            : '';

        $campaigns = Schema::hasTable('ai_campaigns')
            ? AiCampaign::query()
                ->orderByDesc('updated_at')
                ->limit(10)
                ->get()
                ->map(fn ($c) => "- [campaign#{$c->id} | {$c->channel} | status={$c->status} | health={$c->health}".($c->budget_daily ? " | budget={$c->budget_daily}" : '')."] {$c->name}: {$c->summary}")
                ->implode("\n")
            : '';

        $drafts = Schema::hasTable('ai_content_drafts')
            ? AiContentDraft::query()
                ->orderByDesc('created_at')
                ->limit(10)
                ->get()
                ->map(fn ($d) => "- [draft#{$d->id} | {$d->channel} | status={$d->status}] {$d->title}")
                ->implode("\n")
            : '';

        $googleConnected = $this->tokens->connectionInfo() !== null;

        $integrations = collect([
            'Google Search Console' => $googleConnected ? 'tersambung' : 'BELUM tersambung',
            'Google Analytics 4' => filled(config('services.ga4.property_id')) ? 'tersambung' : 'BELUM tersambung',
            'Meta Ads' => filled(config('services.meta_ads.access_token')) ? 'tersambung' : 'BELUM tersambung',
            'Google Ads' => filled(config('services.google_ads.developer_token')) ? 'tersambung' : 'BELUM tersambung',
            'Meta Graph (IG/FB)' => filled(config('services.meta_graph.access_token')) ? 'tersambung' : 'BELUM tersambung',
            'TikTok' => filled(config('services.tiktok.access_token')) ? 'tersambung' : 'BELUM tersambung',
            'YouTube' => filled(config('services.youtube.api_key')) ? 'tersambung' : 'BELUM tersambung',
            'Google Business Profile' => filled(config('services.google_business.location_id')) ? 'tersambung' : 'BELUM tersambung',
        ])->map(fn ($state, $name) => "- {$name}: {$state}")->implode("\n");

        $marketing = $this->snapshot->lines($period);
        $marketBrief = $this->market?->compactBrief();
        $marketText = $marketBrief
            ? json_encode($marketBrief, JSON_UNESCAPED_UNICODE)
            : '- (belum ada snapshot riset pasar cached; gunakan Google Search bila aktif)';

        $profitAndLearning = $this->learning?->promptBlock($period->days()) ?? '';

        return "\n\n=== DATA NYATA LIVORA (SATU-SATUNYA SUMBER FAKTA INTERNAL) ===\n"
            ."Halaman aktif yang dibuka admin: {$context}\n\n"
            .($profitAndLearning !== '' ? "{$profitAndLearning}\n\n" : '')
            ."ANGKA PLATFORM (GA4 / Ads / Sosial / SEO):\n{$marketing}\n\n"
            ."RINGKASAN TREN PASAR EKSTERNAL:\n{$marketText}\n\n"
            ."STATUS AGENT OTOMATIS:\n".($agents ?: '- (belum ada agent terdaftar)')."\n\n"
            ."INSIGHT TERBARU:\n".($insights ?: '- (belum ada insight)')."\n\n"
            ."REKOMENDASI PENDING (SIAP DI-APPROVE):\n".($recs ?: '- (tidak ada rekomendasi pending)')."\n\n"
            ."ANTREAN ACTIONS / APPROVALS (SIAP DIEKSEKUSI):\n".($actions ?: '- (tidak ada action menunggu)')."\n\n"
            ."CAMPAIGN WORKSPACE AKTIF:\n".($campaigns ?: '- (belum ada campaign)')."\n\n"
            ."CONTENT QUEUE DRAFTS:\n".($drafts ?: '- (belum ada draft konten)')."\n\n"
            ."STATUS INTEGRASI KREDENSIAL:\n{$integrations}\n"
            ."=== AKHIR DATA ===\n";
    }

    /**
     * @return array{reply: string, recommendation: array|null, operations: array<int, array<string, mixed>>}
     */
    protected function parseChatResponse(string $text): array
    {
        $clean = trim($text);
        $clean = preg_replace('/^```(json)?/i', '', $clean);
        $clean = preg_replace('/```$/', '', $clean);
        $clean = trim($clean);

        $data = json_decode($clean, true);
        if (! is_array($data)) {
            $firstBrace = strpos($clean, '{');
            $lastBrace = strrpos($clean, '}');
            if ($firstBrace !== false && $lastBrace !== false && $lastBrace > $firstBrace) {
                $sub = substr($clean, $firstBrace, $lastBrace - $firstBrace + 1);
                $data = json_decode($sub, true);
            }
        }

        if (! is_array($data) || ! isset($data['reply']) || ! is_string($data['reply']) || $data['reply'] === '') {
            return ['reply' => $text, 'recommendation' => null, 'operations' => []];
        }

        $rec = $data['recommendation'] ?? null;
        $ops = is_array($data['operations'] ?? null) ? array_values(array_filter($data['operations'], 'is_array')) : [];

        return [
            'reply' => $data['reply'],
            'recommendation' => (is_array($rec) && $this->isValidRecommendation($rec)) ? $rec : null,
            'operations' => $ops,
        ];
    }

    /**
     * Jaring pengaman deterministik bila user menulis perintah eksplisit
     * namun model LLM lupa mengisi array `operations`.
     *
     * @return array<int, array<string, mixed>>
     */
    protected function inferExplicitOperations(string $message): array
    {
        $m = strtolower(trim($message));
        $ops = [];

        if (preg_match('/\b(jalankan|run)\s+(semua\s+agent|all\s+agents?)\b/i', $m)) {
            $ops[] = ['type' => 'run_agent', 'agent_key' => 'all'];
        } elseif (preg_match('/\b(jalankan|run)\s+(seo|content|ads|leads|cro)\s+agent\b/i', $m, $match)) {
            $ops[] = ['type' => 'run_agent', 'agent_key' => strtolower($match[2])];
        }

        if (preg_match('/\b(approve|setujui)\b.*\blow[\s-]?risk\b/i', $m)) {
            $ops[] = ['type' => 'approve_recommendation', 'scope' => 'all_low_risk'];
        } elseif (preg_match('/\b(approve|setujui)\s+semua\s+rekomendasi\b/i', $m)) {
            $ops[] = ['type' => 'approve_recommendation', 'scope' => 'all_pending'];
        }

        if (preg_match('/\b(eksekusi|execute|jalankan)\b.*\b(actions?|approved)\b/i', $m)) {
            $ops[] = ['type' => 'execute_action', 'scope' => 'all_approved'];
        }

        if (preg_match('/\b(sync|sinkronkan|sinkronisasi)\s+campaigns?\b/i', $m)) {
            $ops[] = ['type' => 'sync_campaigns'];
        } elseif (preg_match('/\b(buatkan|buat)\s+campaign\b/i', $m)) {
            $ops[] = [
                'type' => 'create_campaign',
                'name' => 'Livora High-Intent Interior & Bespoke Furniture Push',
                'channel' => 'Meta Ads + Instagram + WhatsApp LiviBot',
                'summary' => 'Kampanye fokus produk demand tertinggi & percepatan konversi konsultasi interior Livora.',
                'status' => 'Active',
                'health' => 'Good',
                'plan' => [
                    'Retargeting pengunjung produk high-demand & proyek unggulan ke WhatsApp LiviBot.',
                    'Follow-up prioritas semua inquiry harga WA yang belum terjawab dalam < 15 menit.',
                    'Konten Reels & Carousel studi kasus ruang nyata untuk mendorong booking konsultasi.',
                ],
            ];
        }

        if (preg_match('/\b(refresh|hitung\s+ulang|perbarui)\s+impact\b/i', $m)) {
            $ops[] = ['type' => 'refresh_impact'];
        }

        if (preg_match('/\b(simpan\s+aturan|ajari\s+ai|catat\s+aturan)\s*:\s*(.+)$/i', trim($message), $ruleMatch)) {
            $ops[] = ['type' => 'save_learning_rule', 'rule' => trim($ruleMatch[2]), 'category' => 'profit_focus'];
        }

        if (preg_match('/\b(catat|input|tambah|masukkan)\b.*\bboost\b.*?(?:rp\.?\s*)?([\d.,]+)\s*(juta|jt|ribu|rb)?/i', $m, $boostMatch)) {
            $rawNum = str_replace(['.', ','], ['', '.'], $boostMatch[2]);
            $amount = (float) $rawNum;
            $unit = strtolower($boostMatch[3] ?? '');
            if ($unit === 'juta' || $unit === 'jt') {
                $amount *= 1_000_000;
            } elseif ($unit === 'ribu' || $unit === 'rb') {
                $amount *= 1_000;
            }
            if ($amount > 0) {
                $ops[] = [
                    'type' => 'record_ig_boost',
                    'title' => 'Instagram Boost (via Ask AI)',
                    'spendRp' => $amount,
                ];
            }
        }

        return $ops;
    }

    /**
     * Mesin analitik lokal berbasis 100% data database nyata Livora ketika
     * provider LLM eksternal sedang terkena batas kuota / gangguan jaringan.
     *
     * @param  array<int, array<string, mixed>>  $executedActions
     */
    protected function buildLocalAnalyticalReply(
        string $message,
        string $context,
        MarketingPeriod $period,
        array $executedActions,
        ?string $providerError
    ): string {
        $days = $period->days();
        $summary = null;
        if ($this->learning !== null) {
            try {
                $summary = $this->learning->summary($days);
            } catch (\Throwable) {
                $summary = null;
            }
        }

        $p = $summary['profit'] ?? [];
        $orders = $p['orders'] ?? [];
        $consults = $p['consultations'] ?? [];
        $wa = $p['whatsapp'] ?? [];
        $topItems = array_slice($p['topDemandItems'] ?? [], 0, 4);
        $memory = $summary['learning'] ?? [];

        $pendingRecs = AiRecommendation::query()
            ->where('status', 'pending')
            ->orderByRaw("CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END")
            ->latest()
            ->limit(4)
            ->get();

        $insightsQuery = AiInsight::query()->latest();
        if (Schema::hasColumn('ai_insights', 'dismissed_at')) {
            $insightsQuery->whereNull('dismissed_at');
        }
        $latestInsights = $insightsQuery->limit(3)->get();

        $lines = [];
        $lines[] = "📊 **Analisis Strategis & Prioritas Profit Livora ({$days} Hari Terakhir — Real Database)**";

        if ($executedActions !== []) {
            $lines[] = "\n✅ **Perintah Sistem yang Baru Saja Dieksekusi:**";
            foreach ($executedActions as $act) {
                $lines[] = '- **'.($act['title'] ?? 'Aksi').'**: '.($act['detail'] ?? '');
            }
        }

        $lines[] = "\n### 1. Diagnosa Omzet, Konsultasi & Funnel WhatsApp";
        $lines[] = sprintf(
            "- **Omzet & Pesanan Shop**: **%s** dari **%d pesanan lunas** (total %d order masuk, AOV **%s**, %d order masih menunggu pembayaran).",
            $orders['totalRevenueLabel'] ?? 'Rp 0',
            (int) ($orders['paidOrders'] ?? 0),
            (int) ($orders['totalOrders'] ?? 0),
            $orders['avgOrderValueLabel'] ?? 'Rp 0',
            (int) ($orders['pendingOrders'] ?? 0)
        );
        $lines[] = sprintf(
            "- **Pipeline Konsultasi Interior**: **%d konsultasi masuk** — **%d di pipeline aktif** (pending/contacted/scheduled), **%d selesai (%s%%)**, dan **%d batal (%s%%)**.",
            (int) ($consults['total'] ?? 0),
            (int) ($consults['activePipeline'] ?? 0),
            (int) ($consults['completed'] ?? 0),
            (string) ($consults['completionRatePct'] ?? 0),
            (int) ($consults['cancelled'] ?? 0),
            (string) ($consults['cancellationRatePct'] ?? 0)
        );
        $lines[] = sprintf(
            "- **Antrean Cek Harga WhatsApp LiviBot**: **%d inquiry** dari **%d nomor unik** — **%d belum dijawab** (response rate **%s%%**).",
            (int) ($wa['totalInquiries'] ?? 0),
            (int) ($wa['uniqueLeads'] ?? 0),
            (int) ($wa['unanswered'] ?? 0),
            (string) ($wa['answeredRatePct'] ?? 100)
        );

        if ($topItems !== []) {
            $lines[] = "\n### 2. Produk Katalog dengan Permintaan Tertinggi (Peluang Profit Cepat)";
            foreach ($topItems as $item) {
                $lines[] = sprintf(
                    "- **%s** (%s) — %d views, %d klik, %d wishlist, %d tanya harga WA (Skor Demand: %d).",
                    $item['title'] ?? 'Item',
                    $item['priceLabel'] ?? 'Harga kustom',
                    (int) ($item['views'] ?? 0),
                    (int) ($item['clicks'] ?? 0),
                    (int) ($item['wishlists'] ?? 0),
                    (int) ($item['waInquiries'] ?? 0),
                    (int) ($item['demandScore'] ?? 0)
                );
            }
        }

        $lines[] = "\n### 3. Prioritas Tindakan Hari Ini (Rekomendasi & Insight Aktif)";
        if ($pendingRecs->isNotEmpty()) {
            foreach ($pendingRecs as $rec) {
                $lines[] = sprintf(
                    "- **[rec#%d · %s · prioritas %s]** **%s** — %s",
                    $rec->id,
                    strtoupper((string) $rec->agent_key),
                    strtoupper((string) $rec->priority),
                    $rec->title,
                    $rec->suggested_action ?: $rec->description
                );
            }
        } elseif ($latestInsights->isNotEmpty()) {
            foreach ($latestInsights as $ins) {
                $lines[] = sprintf(
                    "- **[%s · %s]** **%s** — %s",
                    strtoupper((string) $ins->agent_key),
                    strtoupper((string) $ins->severity),
                    $ins->title,
                    $ins->description
                );
            }
        } else {
            $lines[] = "- Klik tombol **▶ Jalankan Semua Agent** di atas untuk memindai peluang SEO, Content, Leads, dan CRO terbaru.";
        }

        if (! empty($memory['learnedPatterns'])) {
            $lines[] = "\n### 4. Pembelajaran Adaptif & Strategi Profit";
            foreach (array_slice($memory['learnedPatterns'], 0, 3) as $pat) {
                $lines[] = "- {$pat}";
            }
        }

        if ($providerError) {
            $shortErr = mb_substr(preg_replace('/\s+/', ' ', $providerError) ?? $providerError, 0, 220);
            $lines[] = "\n*(Catatan: Analisis di atas disusun langsung oleh Mesin Data Real Livora karena provider LLM eksternal sedang mengalami batas kuota/kendala: {$shortErr})*";
        }

        return implode("\n", $lines);
    }

    protected function isValidRecommendation(array $rec): bool
    {
        if (empty($rec['title']) || ! is_string($rec['title'])) {
            return false;
        }

        if (empty($rec['description']) || ! is_string($rec['description'])) {
            return false;
        }

        if (! in_array($rec['agent_key'] ?? null, self::VALID_AGENT_KEYS, true)) {
            return false;
        }

        return true;
    }

    protected function tryCreateRecommendation(array $rec, string $provider): ?AiRecommendation
    {
        $actionType = in_array($rec['action_type'] ?? null, ['content', 'follow_up', 'process_change', 'training', 'other', 'on_page'], true)
            ? $rec['action_type']
            : 'process_change';

        $targetType = in_array($rec['target_type'] ?? null, ['item', 'project', 'promo_banner'], true)
            ? $rec['target_type']
            : null;
        $targetId = isset($rec['target_id']) && is_numeric($rec['target_id']) ? (int) $rec['target_id'] : null;

        $recommendation = AiRecommendation::create([
            'insight_id' => null,
            'title' => $rec['title'],
            'description' => $rec['description'],
            'action_type' => $actionType,
            'target_type' => $targetType,
            'target_id' => $targetId,
            'risk' => in_array($rec['risk'] ?? null, ['low', 'medium', 'high'], true)
                ? $rec['risk'] : 'low',
            'status' => 'pending',
            'expected_impact' => $rec['expected_impact'] ?? '',
            'confidence' => $this->clampConfidence($rec['confidence'] ?? 60),
            'agent_key' => $rec['agent_key'],
            'priority' => in_array($rec['priority'] ?? null, ['low', 'medium', 'high'], true)
                ? $rec['priority'] : 'medium',
            'why' => $rec['why'] ?? null,
            'suggested_action' => $rec['suggested_action'] ?? null,
        ]);

        AiApproval::ensureForRecommendation($recommendation);

        if ($actionType === 'content' && Schema::hasTable('ai_content_drafts')) {
            AiContentDraft::create([
                'recommendation_id' => $recommendation->id,
                'title' => $recommendation->title,
                'channel' => 'instagram',
                'headline' => $recommendation->title,
                'caption' => $recommendation->suggested_action ?: $recommendation->description,
                'body' => $recommendation->suggested_action ?: $recommendation->description,
                'target_type' => $targetType,
                'target_id' => $targetId,
                'status' => 'needs_review',
            ]);
        }

        AiActivityLog::create([
            'actor' => 'AI',
            'agent_key' => $rec['agent_key'],
            'title' => 'Ask AI · Rekomendasi Baru',
            'message' => "Rekomendasi \"{$rec['title']}\" dibuat dari percakapan Ask AI, via provider {$provider}.",
            'kind' => 'recommendation',
            'recommendation_id' => $recommendation->id,
            'href' => '/admin/ai-marketing/ai-center/recommendations',
        ]);

        return $recommendation;
    }

    protected function clampConfidence(mixed $value): int
    {
        return (int) max(0, min(100, (int) round((float) $value)));
    }
}
