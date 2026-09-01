<?php

namespace App\Http\Controllers\Api\Ai;

use App\Http\Controllers\Controller;
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
 */
class ChatController extends Controller
{
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

        return response()->json([
            'id' => 'msg_'.now()->timestamp.'_'.uniqid(),
            'role' => 'assistant',
            'text' => $result['text'],
            'createdAt' => now()->toISOString(),
        ]);
    }

    protected function systemPromptFor(string $context): string
    {
        return "Kamu adalah asisten AI Marketing untuk Livora Studio, platform interior design & furniture. "
            ."Jawab singkat dan relevan dengan konteks halaman '{$context}' di dashboard. "
            ."ATURAN KERAS: hanya gunakan angka dan fakta yang ada di blok DATA di bawah. "
            ."Kalau angka yang diminta tidak ada di sana, katakan terus terang bahwa datanya belum "
            ."tersedia atau integrasinya belum tersambung — JANGAN mengarang, jangan mengisi nol, "
            ."dan jangan menebak tren.";
    }

    /**
     * Snapshot data nyata yang boleh dipakai model. Kalau kosong, blok ini
     * secara eksplisit bilang kosong — itu penting supaya model tidak
     * mengisi celahnya sendiri.
     */
    protected function groundingBlock(string $context): string
    {
        $agentKey = in_array($context, ['seo', 'cro', 'ads', 'content', 'leads'], true) ? $context : null;

        $agents = AiAgent::query()
            ->get(['key', 'name', 'status', 'connection_state', 'last_run_at'])
            ->map(fn ($a) => "- {$a->key} ({$a->name}): status={$a->status}, koneksi={$a->connection_state}, "
                .'terakhir run='.($a->last_run_at ? $a->last_run_at->toDateTimeString() : 'belum pernah'))
            ->implode("\n");

        $insightQuery = AiInsight::query()->latest()->limit(5);
        if ($agentKey) {
            $insightQuery->where('agent_key', $agentKey);
        }
        $insights = $insightQuery->get()
            ->map(fn ($i) => "- [{$i->agent_key}/{$i->severity}] {$i->title} — {$i->description}")
            ->implode("\n");

        $recQuery = AiRecommendation::query()->where('status', 'pending')->latest()->limit(5);
        if ($agentKey) {
            $recQuery->where('agent_key', $agentKey);
        }
        $recs = $recQuery->get()
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
}
