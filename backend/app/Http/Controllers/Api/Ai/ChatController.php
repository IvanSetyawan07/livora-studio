<?php

namespace App\Http\Controllers\Api\Ai;

use App\Http\Controllers\Controller;
use App\Http\Resources\Ai\AiRecommendationResource;
use App\Models\AiActivityLog;
use App\Models\AiAgent;
use App\Models\AiInsight;
use App\Models\AiRecommendation;
use App\Services\AI\AIProviderManager;
use App\Services\Google\GoogleOAuthTokenStore;
use Illuminate\Http\Request;

/**
 * Ask Livora (AI Marketing). Jawaban di-grounding ke data NYATA dari
 * database (agent state, insight terbaru, rekomendasi pending, status
 * integrasi) supaya model tidak perlu mengarang angka. Tidak ada panggilan
 * ke API eksternal di sini — hanya baca DB, jadi murah dan tidak menghabiskan
 * kuota Search Console.
 *
 * Chat juga bisa MENULIS rekomendasi baru ke ai_recommendations (muncul di
 * fitur Recommendations), dengan pola yang sama seperti CroAgentService:
 * model wajib balas JSON terstruktur (reply + recommendation opsional),
 * lalu di-parse & divalidasi ketat di server sebelum ditulis ke DB. Kalau
 * parsing/validasi gagal, fallback aman: teks mentah tetap ditampilkan ke
 * user sebagai reply, dan TIDAK ADA apapun yang ditulis ke DB.
 */
class ChatController extends Controller
{
    /** Agent key yang valid untuk rekomendasi — harus cocok dengan tabel ai_agents. */
    private const VALID_AGENT_KEYS = ['seo', 'content', 'ads', 'leads', 'cro'];

    public function __construct(
        protected AIProviderManager $manager,
        protected GoogleOAuthTokenStore $tokens,
    ) {
    }

    public function ask(Request $request)
    {
        $validated = $request->validate([
            'message' => ['required', 'string', 'max:2000'],
            'context' => ['nullable', 'string'],
        ]);

        $context = $validated['context'] ?? 'general';
        $systemPrompt = $this->systemPromptFor($context).$this->groundingBlock($context);

        try {
            $result = $this->manager->ask($systemPrompt, $validated['message'], 'chat');
        } catch (\Throwable $e) {
            return response()->json([
                'message' => 'Semua AI provider gagal merespons. Pastikan minimal satu provider (Gemini/Groq) sudah dikonfigurasi dan API key valid.',
                'error' => $e->getMessage(),
            ], 503);
        }

        $parsed = $this->parseChatResponse($result['text']);

        $createdRecommendation = null;
        if ($parsed['recommendation'] !== null) {
            $createdRecommendation = $this->tryCreateRecommendation($parsed['recommendation'], $result['provider']);
        }

        return response()->json([
            'id' => 'msg_'.now()->timestamp.'_'.uniqid(),
            'role' => 'assistant',
            'text' => $parsed['reply'],
            'createdAt' => now()->toISOString(),
            'recommendation' => $createdRecommendation
                ? new AiRecommendationResource($createdRecommendation)
                : null,
        ]);
    }

    protected function systemPromptFor(string $context): string
    {
        $agentList = implode(', ', self::VALID_AGENT_KEYS);

        return "Kamu adalah asisten AI Marketing untuk Livora Studio, platform interior design & furniture. "
            ."User bisa menanyakan topik apa saja (SEO, ads, leads, cro, dst), tidak harus sama dengan "
            ."halaman '{$context}' yang sedang dia buka di dashboard — kalau dia tanya topik lain, tetap "
            ."jawab pakai data topik itu dari blok DATA di bawah, jangan menolak hanya karena beda dari "
            ."halaman aktif. "
            ."ATURAN KERAS: hanya gunakan angka dan fakta yang ada di blok DATA di bawah. "
            ."Kalau angka yang diminta tidak ada di sana, katakan terus terang bahwa datanya belum "
            ."tersedia atau integrasinya belum tersambung — JANGAN mengarang, jangan mengisi nol, "
            ."dan jangan menebak tren.\n\n"
            ."PENTING — jangan tertukar antara dua jenis status di blok DATA:\n"
            ."- \"AGENT\" = status OTOMATISASI AI (apakah agent sudah pernah dijalankan/generate insight "
            ."sendiri secara otomatis). Field ini boleh 'coming_soon'/'not_connected' walau datanya "
            ."sendiri sebenarnya sudah ada dan bisa dibaca live dari integrasi.\n"
            ."- \"STATUS INTEGRASI\" = status koneksi SUMBER DATA MENTAH (Search Console, GA4, dst). "
            ."Ini yang menentukan apakah angka (klik, impression, dsb) tersedia untuk dijawab.\n"
            ."Kalau user tanya soal ANGKA/DATA, jawab berdasarkan STATUS INTEGRASI, bukan status AGENT. "
            ."Status AGENT hanya relevan kalau user tanya soal otomatisasi/insight AI itu sendiri "
            ."(mis. 'apakah SEO agent sudah jalan otomatis').\n\n"
            ."FORMAT BALASAN — WAJIB DIIKUTI PERSIS:\n"
            ."Balas HANYA dengan JSON valid, TANPA teks pembuka/penutup, TANPA markdown code fence, "
            ."PERSIS sesuai skema berikut:\n"
            .'{"reply": "teks balasan natural buat user, bahasa Indonesia santai tapi jelas", '
            .'"recommendation": null | {'
            .'"agent_key": salah satu dari ['.$agentList.'], '
            .'"title": "judul singkat, maksimal 12 kata", '
            .'"description": "ringkasan 1-2 kalimat", '
            .'"action_type": "process_change" | "follow_up" | "content" | "training" | "other", '
            .'"risk": "low" | "medium" | "high", '
            .'"priority": "low" | "medium" | "high", '
            .'"expected_impact": "string kualitatif, jangan karang angka rupiah spesifik", '
            .'"confidence": 0-100, '
            .'"why": "alasan singkat, WAJIB merujuk data konkret dari blok DATA", '
            .'"suggested_action": "langkah konkret yang bisa langsung dikerjakan tim Livora"'
            ."}}\n"
            ."Isi \"recommendation\" HANYA kalau SEMUA syarat ini terpenuhi:\n"
            ."1. User memang sedang minta saran/rekomendasi/langkah aksi (bukan sekadar tanya angka atau ngobrol biasa)\n"
            ."2. Ada dasar data KONKRET di blok DATA di bawah yang mendukungnya (insight, angka funnel, dsb) — "
            ."BUKAN opini umum atau best-practice generik yang tidak terkait data Livora\n"
            ."3. agent_key yang kamu pilih benar-benar relevan dengan topiknya\n"
            ."Kalau salah satu syarat itu tidak terpenuhi, set \"recommendation\": null — JANGAN dipaksakan, "
            ."lebih baik null daripada rekomendasi yang mengada-ada atau generik.";
    }

    /**
     * Snapshot data nyata yang boleh dipakai model. Kalau kosong, blok ini
     * secara eksplisit bilang kosong — itu penting supaya model tidak
     * mengisi celahnya sendiri.
     */
    protected function groundingBlock(string $context): string
    {
        // SENGAJA tidak difilter berdasarkan halaman aktif ($context). User bisa
        // menanyakan topik apa saja dari halaman manapun — kalau data di sini
        // dibatasi hanya ke agent yang sesuai halaman, pertanyaan lintas-topik
        // (mis. nanya Leads saat lagi buka halaman SEO) akan kehilangan data
        // yang sebenarnya ada. Tiap baris sudah ditandai [agent_key/...] supaya
        // model tetap bisa memilih data yang relevan dengan pertanyaan.
        $agents = AiAgent::query()
            ->get(['key', 'name', 'status', 'connection_state', 'last_run_at'])
            ->map(fn ($a) => "- {$a->key} ({$a->name}): status={$a->status}, koneksi={$a->connection_state}, "
                .'terakhir run='.($a->last_run_at ? $a->last_run_at->toDateTimeString() : 'belum pernah'))
            ->implode("\n");

        $insights = AiInsight::query()->latest()->limit(15)
            ->get()
            ->map(fn ($i) => "- [{$i->agent_key}/{$i->severity}] {$i->title} — {$i->description}")
            ->implode("\n");

        $recs = AiRecommendation::query()->where('status', 'pending')->latest()->limit(15)
            ->get()
            ->map(fn ($r) => "- [{$r->agent_key}/prioritas {$r->priority}] {$r->title} — {$r->description}")
            ->implode("\n");

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

        return "\n\n=== DATA (satu-satunya sumber fakta yang boleh kamu pakai) ===\n"
            ."Halaman aktif: {$context}\n\n"
            ."AGENT:\n".($agents ?: '- (belum ada agent terdaftar)')."\n\n"
            ."INSIGHT TERBARU:\n".($insights ?: '- (belum ada insight)')."\n\n"
            ."REKOMENDASI PENDING:\n".($recs ?: '- (belum ada rekomendasi pending)')."\n\n"
            ."STATUS INTEGRASI:\n{$integrations}\n"
            ."=== AKHIR DATA ===\n";
    }

    /**
     * Parse balasan JSON dari model jadi {reply, recommendation}. Kalau model
     * tidak balas JSON valid (mis. provider tertentu suka nambah teks di luar
     * skema), fallback AMAN: teks mentah dipakai sebagai reply apa adanya,
     * recommendation null — supaya chat tetap jalan, cuma fitur rekomendasi
     * otomatisnya yang skip.
     *
     * @return array{reply: string, recommendation: array|null}
     */
    protected function parseChatResponse(string $text): array
    {
        $clean = trim($text);
        $clean = preg_replace('/^```(json)?/i', '', $clean);
        $clean = preg_replace('/```$/', '', $clean);
        $clean = trim($clean);

        $data = json_decode($clean, true);

        if (!is_array($data) || !isset($data['reply']) || !is_string($data['reply']) || $data['reply'] === '') {
            return ['reply' => $text, 'recommendation' => null];
        }

        $rec = $data['recommendation'] ?? null;

        return [
            'reply' => $data['reply'],
            'recommendation' => (is_array($rec) && $this->isValidRecommendation($rec)) ? $rec : null,
        ];
    }

    protected function isValidRecommendation(array $rec): bool
    {
        if (empty($rec['title']) || !is_string($rec['title'])) {
            return false;
        }

        if (empty($rec['description']) || !is_string($rec['description'])) {
            return false;
        }

        if (!in_array($rec['agent_key'] ?? null, self::VALID_AGENT_KEYS, true)) {
            return false;
        }

        return true;
    }

    /**
     * Tulis recommendation yang sudah lolos validasi ke DB, plus catat di
     * Activity log (sama seperti agent otomatis lainnya) supaya jejaknya
     * kelihatan dari mana asalnya — bukan cuma muncul tiba-tiba di
     * Recommendations tanpa konteks.
     */
    protected function tryCreateRecommendation(array $rec, string $provider): ?AiRecommendation
    {
        $recommendation = AiRecommendation::create([
            'insight_id' => null,
            'title' => $rec['title'],
            'description' => $rec['description'],
            'action_type' => $rec['action_type'] ?? 'process_change',
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

        AiActivityLog::create([
            'actor' => 'AI',
            'agent_key' => $rec['agent_key'],
            'message' => "Rekomendasi \"{$rec['title']}\" dibuat dari percakapan Ask AI, via provider {$provider}.",
            'kind' => 'recommendation',
            'recommendation_id' => $recommendation->id,
        ]);

        return $recommendation;
    }

    protected function clampConfidence(mixed $value): int
    {
        return (int) max(0, min(100, (int) round((float) $value)));
    }
}