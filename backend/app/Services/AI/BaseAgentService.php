<?php

namespace App\Services\AI;

use App\Models\AiActivityLog;
use App\Models\AiAgent;
use App\Models\AiApproval;
use App\Models\AiContentDraft;
use App\Models\AiInsight;
use App\Models\AiRecommendation;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Fase 4 (agent lifecycle) — kerangka siklus AI yang dipakai bersama oleh
 * Content / Ads / Leads Agent.
 *
 * Pola dan aturan mainnya PERSIS sama dengan SeoAgentService & CroAgentService
 * yang sudah ada: ambil data nyata → kalau data belum cukup, berhenti jujur
 * (status 'empty', tidak menulis apa-apa) → analisis lewat AIProviderManager →
 * parse ketat, item yang tidak lolos skema dibuang, bukan ditebak → tulis
 * AiInsight + AiRecommendation + AiApproval pendamping dalam satu transaksi.
 *
 * Bentuk baris yang ditulis identik dengan SEO/CRO, jadi komponen frontend
 * yang sudah ada bisa merendernya tanpa perubahan apa pun.
 */
abstract class BaseAgentService
{
    public function __construct(protected AIProviderManager $ai)
    {
    }

    /** Key agent di tabel ai_agents (content / ads / leads). */
    abstract protected function agentKey(): string;

    /** Nama agent untuk log aktivitas, mis. "Content Agent". */
    abstract protected function agentLabel(): string;

    /** Label sumber data yang tampil di kartu insight, mis. ['Instagram', 'TikTok']. */
    abstract protected function sourceLabels(array $snapshot): array;

    /** Default action_type untuk recommendation kalau AI tidak mengisi. */
    abstract protected function defaultActionType(): string;

    /**
     * Data nyata yang akan dianalisis.
     *
     * @return array|null null = data belum cukup / integrasi belum tersambung.
     */
    abstract protected function buildSnapshot(): ?array;

    /** Pesan jujur ketika buildSnapshot() mengembalikan null. */
    abstract protected function emptyMessage(): string;

    /** Deskripsi peran + apa yang harus dicari agent ini di datanya. */
    abstract protected function roleBrief(): string;

    /**
     * @return array{status: string, message?: string, insights_created?: int, recommendations_created?: int, provider?: string, raw?: string}
     */
    public function run(int $limit = 5): array
    {
        $snapshot = $this->buildSnapshot();

        if ($snapshot === null) {
            return ['status' => 'empty', 'message' => $this->emptyMessage()];
        }

        try {
            $result = $this->ai->ask(
                $this->systemPrompt($limit),
                $this->userPrompt($snapshot),
                $this->agentKey()
            );
        } catch (\Throwable $e) {
            $this->log('gagal generate insight: '.$e->getMessage(), 'system');

            return ['status' => 'error', 'message' => $e->getMessage()];
        }

        $items = array_slice($this->parseResponse($result['text']), 0, $limit);

        if (empty($items)) {
            $this->log(
                'merespons tapi tidak menghasilkan insight yang valid (format JSON tidak sesuai '
                .'skema). Tidak ada data yang ditulis.',
                'system'
            );

            return [
                'status' => 'error',
                'message' => 'Respons AI tidak bisa di-parse jadi insight yang valid.',
                'raw' => $result['text'],
            ];
        }

        $sources = $this->sourceLabels($snapshot);
        $insightsCreated = 0;
        $recommendationsCreated = 0;
        $firstRecommendationId = null;

        foreach ($items as $item) {
            DB::transaction(function () use ($item, $sources, &$insightsCreated, &$recommendationsCreated, &$firstRecommendationId) {
                $insight = AiInsight::create([
                    'title' => $item['title'],
                    'description' => $item['description'],
                    'type' => $item['type'],
                    'severity' => $item['severity'],
                    'confidence' => $this->clampConfidence($item['confidence']),
                    'source' => $sources,
                    'agent_key' => $this->agentKey(),
                    'reasoning' => $item['reasoning'],
                    'what_happened' => $item['what_happened'],
                    'why_it_matters' => $item['why_it_matters'],
                    'expected_impact' => $item['expected_impact'],
                    'metrics' => null,
                    'analytics_href' => null,
                ]);
                $insightsCreated++;

                $recData = $item['recommendation'] ?? null;

                if (! is_array($recData) || ! $this->isValidRecommendation($recData)) {
                    return;
                }

                $target = $this->sanitizeTarget($recData);

                $recommendation = AiRecommendation::create([
                    'insight_id' => $insight->id,
                    'title' => $recData['title'],
                    'description' => $recData['description'],
                    'action_type' => $recData['action_type'] ?? $this->defaultActionType(),
                    'target_type' => $target['target_type'],
                    'target_id' => $target['target_id'],
                    'risk' => in_array($recData['risk'] ?? null, ['low', 'medium', 'high'], true)
                        ? $recData['risk'] : 'low',
                    'status' => 'pending',
                    'expected_impact' => $recData['expected_impact'] ?? $item['expected_impact'],
                    'confidence' => $this->clampConfidence($recData['confidence'] ?? $item['confidence']),
                    'agent_key' => $this->agentKey(),
                    'priority' => in_array($recData['priority'] ?? null, ['low', 'medium', 'high'], true)
                        ? $recData['priority'] : 'medium',
                    'why' => $recData['why'] ?? null,
                    'suggested_action' => $recData['suggested_action'] ?? null,
                    'change_from' => isset($recData['change_from']) && is_string($recData['change_from'])
                        ? mb_substr($recData['change_from'], 0, 250) : null,
                    'change_to' => isset($recData['change_to']) && is_string($recData['change_to'])
                        ? mb_substr($recData['change_to'], 0, 250) : null,
                ]);

                // Fase 1: setiap recommendation WAJIB punya baris approval pendamping.
                AiApproval::ensureForRecommendation($recommendation);
                $insight->update(['recommendation_id' => $recommendation->id]);
                $this->maybeCreateContentDraft($recommendation, $recData);
                $firstRecommendationId ??= $recommendation->id;
                $recommendationsCreated++;
            });
        }

        AiAgent::where('key', $this->agentKey())->update([
            'status' => 'active',
            'connection_state' => 'connected',
            'last_run_at' => now(),
        ]);

        foreach ($sources as $source) {
            AiAgent::setDependencyState($this->agentKey(), $source, 'connected');
        }

        $this->log(
            "menghasilkan {$insightsCreated} insight baru ({$recommendationsCreated} disertai "
            ."rekomendasi) dari ".implode(', ', $sources).", via provider {$result['provider']}.",
            $recommendationsCreated > 0 ? 'recommendation' : 'insight',
            $firstRecommendationId,
            $recommendationsCreated > 0
                ? '/admin/ai-marketing/ai-center/recommendations'
                : "/admin/ai-marketing/{$this->agentKey()}",
        );

        return [
            'status' => 'ok',
            'insights_created' => $insightsCreated,
            'recommendations_created' => $recommendationsCreated,
            'provider' => $result['provider'],
        ];
    }

    protected function log(
        string $message,
        string $kind,
        ?int $recommendationId = null,
        ?string $href = null,
    ): void {
        AiActivityLog::create([
            'actor' => 'AI',
            'agent_key' => $this->agentKey(),
            'title' => $this->agentLabel().($recommendationId ? ' · Rekomendasi Baru' : ''),
            'message' => $this->agentLabel().' '.$message,
            'kind' => $kind,
            'recommendation_id' => $recommendationId,
            'href' => $href ?? "/admin/ai-marketing/{$this->agentKey()}",
        ]);
    }

    protected function systemPrompt(int $limit): string
    {
        $role = $this->roleBrief();

        return <<<PROMPT
{$role}

ATURAN KETAT — WAJIB DIIKUTI:
- Analisis HANYA berdasarkan angka yang diberikan di data pada pesan user. JANGAN mengarang angka,
  nama campaign, nama channel, atau asumsi apapun yang tidak ada di data tersebut.
- Kalau datanya ambigu atau sample-nya terlalu kecil untuk sebuah kesimpulan, JANGAN dipaksakan
  jadi insight. Lebih baik sedikit tapi akurat daripada banyak tapi mengada-ada.
- Maksimal {$limit} insight per respons.
- Isi field "recommendation" HANYA kalau ada langkah konkret yang bisa langsung dikerjakan tim
  Livora. Kalau murni observasi tanpa langkah jelas, set "recommendation" ke null.
- "confidence" (0-100) mencerminkan seberapa yakin kamu pola ini nyata secara statistik dari
  besarnya sample data, BUKAN seberapa penting insight-nya.
- "priority" mencerminkan urgensi + potensi dampak bisnis.
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
      "reasoning": "kenapa kamu menyimpulkan ini, WAJIB sebut angka konkret dari data yang diberikan",
      "what_happened": "apa yang ditemukan di data, dalam bahasa yang mudah dibaca tim non-teknis",
      "why_it_matters": "dampak ke bisnis Livora kalau dibiarkan",
      "expected_impact": "perkiraan dampak KUALITATIF kalau diperbaiki — jangan karang angka rupiah spesifik",
      "recommendation": {
        "title": "judul singkat",
        "description": "ringkasan 1-2 kalimat",
        "action_type": "content" | "budget_shift" | "campaign" | "follow_up" | "process_change" | "other",
        "risk": "low" | "medium" | "high",
        "priority": "low" | "medium" | "high",
        "expected_impact": "string",
        "confidence": 0-100,
        "why": "alasan singkat kenapa ini direkomendasikan",
        "suggested_action": "langkah konkret yang bisa langsung dikerjakan tim Livora"
      } | null
    }
  ]
}
PROMPT;
    }

    protected function userPrompt(array $snapshot): string
    {
        $json = json_encode($snapshot, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        $learningBlock = '';
        try {
            $learningBlock = "\n\n".app(AiLearningMemoryService::class)->promptBlock(30);
        } catch (\Throwable) {
        }

        return "Data Livora Studio saat ini (semua angka nyata dari database/API platform, bukan "
            ."contoh):\n\n{$json}{$learningBlock}\n\n"
            ."INSTRUKSI ADAPTIF & PROFIT:\n"
            ."- Gunakan MEMORI PEMBELAJARAN ADAPTIF di atas: prioritaskan jenis aksi/produk yang terbukti berdampak POSITIF, hindari pola yang terbukti NEGATIF atau pernah ditolak admin, dan patuhi aturan fokus profit Livora.\n"
            ."- Prioritaskan rekomendasi yang menutup kebocoran profit (prospek WA pending, konsultasi baru, produk demand tinggi) dan menaikkan konversi/omzet nyata.\n"
            .'Analisis data di atas dan hasilkan insight sesuai skema yang sudah dijelaskan di system prompt.';
    }

    protected function parseResponse(string $text): array
    {
        $clean = trim($text);
        $clean = preg_replace('/^```(json)?/i', '', $clean);
        $clean = preg_replace('/```$/', '', $clean);
        $data = json_decode(trim($clean), true);

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

    protected function isValidInsight(array $item): bool
    {
        $required = ['title', 'description', 'type', 'severity', 'reasoning', 'what_happened',
            'why_it_matters', 'expected_impact'];

        foreach ($required as $field) {
            if (empty($item[$field]) || ! is_string($item[$field])) {
                return false;
            }
        }

        if (! in_array($item['type'], ['opportunity', 'warning', 'trend', 'anomaly', 'recommendation', 'lead_intelligence'], true)) {
            return false;
        }

        if (! in_array($item['severity'], ['low', 'medium', 'high', 'critical'], true)) {
            return false;
        }

        return isset($item['confidence']) && is_numeric($item['confidence']);
    }

    protected function isValidRecommendation(array $rec): bool
    {
        return ! empty($rec['title']) && is_string($rec['title'])
            && ! empty($rec['description']) && is_string($rec['description']);
    }

    protected function clampConfidence(mixed $value): int
    {
        return (int) max(0, min(100, (int) round((float) $value)));
    }

    /** @return array{target_type: ?string, target_id: ?int} */
    protected function sanitizeTarget(array $rec): array
    {
        $type = isset($rec['target_type']) && is_string($rec['target_type'])
            ? strtolower(trim($rec['target_type']))
            : null;
        $id = isset($rec['target_id']) && is_numeric($rec['target_id'])
            ? (int) $rec['target_id']
            : null;

        if (! $type || ! $id || $id <= 0) {
            return ['target_type' => null, 'target_id' => null];
        }

        $exists = match ($type) {
            'item' => Schema::hasTable('items') && DB::table('items')->where('id', $id)->exists(),
            'project' => Schema::hasTable('projects') && DB::table('projects')->where('id', $id)->exists(),
            'consultation' => Schema::hasTable('consultations') && DB::table('consultations')->where('id', $id)->exists(),
            'wa_inquiry' => Schema::hasTable('wa_price_inquiries') && DB::table('wa_price_inquiries')->where('id', $id)->exists(),
            'promo_banner' => Schema::hasTable('promo_banners') && DB::table('promo_banners')->where('id', $id)->exists(),
            default => false,
        };

        return $exists
            ? ['target_type' => $type, 'target_id' => $id]
            : ['target_type' => null, 'target_id' => null];
    }

    protected function maybeCreateContentDraft(AiRecommendation $recommendation, array $recData): void
    {
        if (($recommendation->action_type ?? null) !== 'content' || ! Schema::hasTable('ai_content_drafts')) {
            return;
        }

        $channel = strtolower((string) ($recData['channel'] ?? 'instagram'));
        if (! in_array($channel, ['instagram', 'facebook', 'email', 'tiktok', 'youtube', 'website'], true)) {
            $channel = 'instagram';
        }

        $mediaUrl = null;
        if ($recommendation->target_type === 'item' && $recommendation->target_id && Schema::hasTable('items')) {
            $mediaUrl = DB::table('items')->where('id', $recommendation->target_id)->value('image');
        } elseif ($recommendation->target_type === 'project' && $recommendation->target_id && Schema::hasTable('projects')) {
            $mediaUrl = DB::table('projects')->where('id', $recommendation->target_id)->value('hero_image');
        } elseif ($recommendation->target_type === 'promo_banner' && $recommendation->target_id && Schema::hasTable('promo_banners')) {
            $mediaUrl = DB::table('promo_banners')->where('id', $recommendation->target_id)->value('image_url');
        }

        AiContentDraft::create([
            'recommendation_id' => $recommendation->id,
            'title' => $recommendation->title,
            'channel' => $channel,
            'headline' => isset($recData['headline']) && is_string($recData['headline'])
                ? mb_substr($recData['headline'], 0, 250) : $recommendation->title,
            'caption' => isset($recData['caption']) && is_string($recData['caption'])
                ? $recData['caption'] : ($recommendation->suggested_action ?: $recommendation->description),
            'body' => $recommendation->suggested_action ?: $recommendation->description,
            'media_url' => $mediaUrl,
            'target_type' => $recommendation->target_type,
            'target_id' => $recommendation->target_id,
            'status' => 'needs_review',
        ]);
    }
}
