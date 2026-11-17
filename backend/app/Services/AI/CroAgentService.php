<?php

namespace App\Services\AI;

use App\Models\AiActivityLog;
use App\Models\AiAgent;
use App\Models\AiApproval;
use App\Models\AiInsight;
use App\Models\AiRecommendation;
use App\Models\Consultation;
use App\Models\ConsultationStatusHistory;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * CRO Agent — menganalisis funnel konsultasi, LiviBot WhatsApp & keranjang shop,
 * gesekan produk promo vs non-promo, serta funnel_events website.
 */
class CroAgentService
{
    private const AGENT_KEY = 'cro';

    public const MIN_SAMPLE = 5;

    private const STAGES = [
        Consultation::STATUS_NEW_INQUIRY,
        Consultation::STATUS_UNDER_REVIEW,
        Consultation::STATUS_CONTACTED,
        Consultation::STATUS_MEETING_SCHEDULED,
        Consultation::STATUS_IN_PROGRESS,
        Consultation::STATUS_AGREEMENT_PENDING,
        Consultation::STATUS_DP_PENDING,
        Consultation::STATUS_PROJECT_PAID,
        Consultation::STATUS_PROJECT_RUNNING,
        Consultation::STATUS_COMPLETED,
    ];

    public function __construct(private AIProviderManager $ai)
    {
    }

    /** @return array{status: string, message?: string, insights_created?: int, recommendations_created?: int, provider?: string, raw?: string} */
    public function run(int $limit = 5): array
    {
        $consultationFunnel = $this->buildFunnelSnapshot();
        $commerceSnapshot = $this->buildShopAndMerchandisingSnapshot();

        $totalActivity = ($consultationFunnel['total_consultations'] ?? 0)
            + ($commerceSnapshot['shop_carts_30d'] ?? 0)
            + ($commerceSnapshot['wa_inquiries_30d'] ?? 0);

        if ($consultationFunnel === null && $totalActivity < 5) {
            return [
                'status' => 'empty',
                'message' => 'Data funnel konsultasi dan aktivitas shop/WA belum cukup untuk dianalisis secara jujur.',
            ];
        }

        $snapshot = [
            'consultation_funnel' => $consultationFunnel ?? ['note' => 'Sample konsultasi < '.self::MIN_SAMPLE],
            'shop_and_whatsapp_funnel' => $commerceSnapshot,
        ];

        try {
            $result = $this->ai->ask(
                $this->systemPrompt($limit),
                $this->userPrompt($snapshot),
                self::AGENT_KEY
            );
        } catch (\Throwable $e) {
            AiActivityLog::create([
                'actor' => 'AI',
                'agent_key' => self::AGENT_KEY,
                'message' => 'CRO Agent gagal generate insight: '.$e->getMessage(),
                'kind' => 'system',
            ]);

            return ['status' => 'error', 'message' => $e->getMessage()];
        }

        $items = $this->parseResponse($result['text']);

        if (empty($items)) {
            AiActivityLog::create([
                'actor' => 'AI',
                'agent_key' => self::AGENT_KEY,
                'message' => 'CRO Agent merespons tapi tidak menghasilkan insight yang valid (format JSON tidak sesuai skema). Tidak ada data yang ditulis.',
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
                'source' => ['Lead Data', 'Site Behaviour'],
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
                    'action_type' => $recData['action_type'] ?? 'process_change',
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

                AiApproval::ensureForRecommendation($recommendation);
                $insight->update(['recommendation_id' => $recommendation->id]);
                $recommendationsCreated++;
            }
        }

        AiAgent::where('key', self::AGENT_KEY)->update([
            'status' => 'active',
            'connection_state' => 'connected',
            'last_run_at' => now(),
        ]);

        AiActivityLog::create([
            'actor' => 'AI',
            'agent_key' => self::AGENT_KEY,
            'message' => "CRO Agent menghasilkan {$insightsCreated} insight baru "
                ."({$recommendationsCreated} disertai rekomendasi) dari analisis funnel Livora, "
                ."via provider {$result['provider']}.",
            'kind' => 'insight',
        ]);

        return [
            'status' => 'ok',
            'insights_created' => $insightsCreated,
            'recommendations_created' => $recommendationsCreated,
            'provider' => $result['provider'],
        ];
    }

    /** Dipakai langsung oleh CroController::funnelSummary(). */
    public function buildFunnelSnapshot(): ?array
    {
        $total = Consultation::count();

        if ($total < self::MIN_SAMPLE) {
            return null;
        }

        $countsByCurrentStatus = Consultation::query()
            ->select('status', DB::raw('count(*) as total'))
            ->groupBy('status')
            ->pluck('total', 'status')
            ->toArray();

        $everReached = [];
        foreach (self::STAGES as $stage) {
            $everReached[$stage] = ConsultationStatusHistory::where('new_status', $stage)
                ->distinct('consultation_id')
                ->count('consultation_id');
        }
        $everReached[Consultation::STATUS_NEW_INQUIRY] = max(
            $everReached[Consultation::STATUS_NEW_INQUIRY] ?? 0,
            $total
        );

        $dropOffByPreviousStage = ConsultationStatusHistory::query()
            ->whereIn('new_status', [Consultation::STATUS_CANCELLED, Consultation::STATUS_REJECTED])
            ->whereNotNull('previous_status')
            ->select('previous_status', DB::raw('count(*) as total'))
            ->groupBy('previous_status')
            ->pluck('total', 'previous_status')
            ->toArray();

        $histories = ConsultationStatusHistory::query()
            ->orderBy('consultation_id')
            ->orderBy('created_at')
            ->get(['consultation_id', 'previous_status', 'new_status', 'created_at']);

        $durationsByStage = [];
        foreach ($histories->groupBy('consultation_id') as $rows) {
            $rows = $rows->values();
            foreach ($rows as $i => $row) {
                $next = $rows[$i + 1] ?? null;
                if ($next === null) {
                    continue;
                }
                $durationsByStage[$row->new_status][] = $row->created_at->diffInHours($next->created_at);
            }
        }

        $avgHoursInStage = [];
        foreach ($durationsByStage as $stage => $vals) {
            $avgHoursInStage[$stage] = round(array_sum($vals) / count($vals), 1);
        }

        $now = now();
        $lostLast30d = Consultation::whereIn('status', [Consultation::STATUS_CANCELLED, Consultation::STATUS_REJECTED])
            ->where('updated_at', '>=', $now->copy()->subDays(30))
            ->count();
        $lostPrev30d = Consultation::whereIn('status', [Consultation::STATUS_CANCELLED, Consultation::STATUS_REJECTED])
            ->whereBetween('updated_at', [$now->copy()->subDays(60), $now->copy()->subDays(30)])
            ->count();

        return [
            'total_consultations' => $total,
            'counts_by_current_status' => $countsByCurrentStatus,
            'consultations_that_ever_reached_stage' => $everReached,
            'cancelled_or_rejected_count_by_previous_stage' => $dropOffByPreviousStage,
            'average_hours_spent_in_stage_before_moving_on' => $avgHoursInStage,
            'cancelled_or_rejected_last_30_days' => $lostLast30d,
            'cancelled_or_rejected_previous_30_days' => $lostPrev30d,
            'stage_order' => self::STAGES,
            'stage_labels' => Consultation::STATUS_LABELS,
        ];
    }

    private function buildShopAndMerchandisingSnapshot(): array
    {
        $since = now()->subDays(30);

        $cartsTotal = Schema::hasTable('shop_carts')
            ? (int) DB::table('shop_carts')->where('created_at', '>=', $since)->count()
            : 0;
        $cartsClaimed = Schema::hasTable('shop_carts')
            ? (int) DB::table('shop_carts')->where('created_at', '>=', $since)->whereNotNull('claimed_phone')->count()
            : 0;

        $ordersTotal = Schema::hasTable('shop_orders')
            ? (int) DB::table('shop_orders')->where('created_at', '>=', $since)->count()
            : 0;
        $ordersPaidOrCompleted = Schema::hasTable('shop_orders')
            ? (int) DB::table('shop_orders')->where('created_at', '>=', $since)->whereIn('status', ['diproses', 'siap_kirim', 'dikirim', 'diterima', 'selesai', 'dibayar'])->count()
            : 0;

        $waInquiriesTotal = Schema::hasTable('wa_price_inquiries')
            ? (int) DB::table('wa_price_inquiries')->where('created_at', '>=', $since)->count()
            : 0;
        $waInquiriesPending = Schema::hasTable('wa_price_inquiries')
            ? (int) DB::table('wa_price_inquiries')->where('status', 'pending')->count()
            : 0;

        $funnelEvents = Schema::hasTable('funnel_events')
            ? DB::table('funnel_events')
                ->where('created_at', '>=', $since)
                ->selectRaw('event, COUNT(*) as total')
                ->groupBy('event')
                ->pluck('total', 'event')
                ->toArray()
            : [];

        $highDurationLowPromoItems = [];
        if (Schema::hasTable('item_views') && Schema::hasTable('items')) {
            $highDurationLowPromoItems = DB::table('item_views')
                ->join('items', 'items.id', '=', 'item_views.target_id')
                ->where('item_views.target_type', 'item')
                ->where('item_views.viewed_at', '>=', $since)
                ->selectRaw('items.id, items.title, COUNT(*) as views, ROUND(AVG(item_views.duration_seconds), 1) as avg_sec')
                ->groupBy('items.id', 'items.title')
                ->orderByDesc('views')
                ->limit(8)
                ->get()
                ->map(fn ($r) => [
                    'item_id' => (int) $r->id,
                    'title' => $r->title,
                    'views_30d' => (int) $r->views,
                    'avg_duration_seconds' => (float) $r->avg_sec,
                ])->all();
        }

        return [
            'shop_carts_30d' => $cartsTotal,
            'shop_carts_claimed_in_wa_30d' => $cartsClaimed,
            'cart_to_wa_claim_rate_percent' => $cartsTotal > 0 ? round($cartsClaimed / $cartsTotal * 100, 1) : null,
            'shop_orders_30d' => $ordersTotal,
            'shop_orders_paid_30d' => $ordersPaidOrCompleted,
            'wa_inquiries_30d' => $waInquiriesTotal,
            'wa_inquiries_currently_pending' => $waInquiriesPending,
            'funnel_events_30d' => $funnelEvents,
            'top_viewed_items_engagement' => $highDurationLowPromoItems,
        ];
    }

    private function systemPrompt(int $limit): string
    {
        return <<<PROMPT
Kamu adalah CRO (Conversion Rate Optimization) Analyst untuk Livora Studio, platform interior design, arsitektur & custom/loose furniture di Indonesia (Jakarta). Konversi terjadi melalui form konsultasi, appointment showroom, WhatsApp LiviBot (keranjang CRT-XXXX & cek harga), serta halaman promo.

ATURAN KETAT — WAJIB DIIKUTI:
- Analisis HANYA berdasarkan angka nyata di pesan user. JANGAN mengarang angka atau channel.
- Fokus pada titik bocor konversi: tahap konsultasi dengan drop-off atau waktu tunggu tertinggi, rasio keranjang Web -> klaim WhatsApp LiviBot, antrean cek harga WA yang tertunda, serta produk yang sering dilihat lama tapi belum dikonversi.
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
      "reasoning": "sebutkan angka konkret dari data",
      "what_happened": "temuan jelas untuk tim non-teknis",
      "why_it_matters": "dampak ke konversi & omzet Livora",
      "expected_impact": "dampak kualitatif realistis",
      "recommendation": {
        "title": "judul singkat",
        "description": "ringkasan 1-2 kalimat",
        "action_type": "process_change" | "follow_up" | "content" | "training" | "other",
        "risk": "low" | "medium" | "high",
        "priority": "low" | "medium" | "high",
        "expected_impact": "string",
        "confidence": 0-100,
        "why": "alasan berdasarkan data",
        "suggested_action": "langkah konkret yang bisa langsung dieksekusi"
      } | null
    }
  ]
}
PROMPT;
    }

    private function userPrompt(array $snapshot): string
    {
        $json = json_encode($snapshot, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

        return "Data funnel konsultasi, LiviBot WhatsApp, Shop & katalog Livora (angka nyata dari DB):\n\n{$json}\n\nAnalisis data di atas dan hasilkan insight sesuai skema.";
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

        if (! in_array($item['type'], ['opportunity', 'warning', 'trend', 'anomaly', 'recommendation', 'lead_intelligence'], true)) {
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
