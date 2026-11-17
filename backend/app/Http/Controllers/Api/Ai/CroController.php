<?php

namespace App\Http\Controllers\Api\Ai;

use App\Http\Controllers\Controller;
use App\Models\Consultation;
use App\Services\AI\CroAgentService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * KPI funnel CRO — dihitung LANGSUNG dari tabel consultations dan
 * consultation_status_histories, bukan dari LLM dan bukan dari fixture.
 *
 * Sama seperti SeoController: respons selalu eksplisit soal keadaan data
 * (`hasData` + `message`) supaya frontend bisa membedakan "belum ada data"
 * dengan "datanya nol". Metrik yang sumbernya memang belum ada (mis. CTA
 * click rate yang butuh web analytics) TIDAK dikirim sebagai 0 — field-nya
 * null dan alasannya ikut dikirim.
 */
class CroController extends Controller
{
    public function __construct(private CroAgentService $cro)
    {
    }

    /** GET /api/ai/cro/funnel-summary */
    public function funnelSummary()
    {
        $snapshot = $this->cro->buildFunnelSnapshot();

        if ($snapshot === null) {
            return response()->json([
                'hasData' => false,
                'message' => 'Data konsultasi belum cukup (minimal '.CroAgentService::MIN_SAMPLE
                    .' consultation) untuk menghitung funnel secara jujur.',
                'totals' => null,
                'stages' => [],
                'unavailable' => $this->unavailableMetrics(),
            ]);
        }

        $total = (int) $snapshot['total_consultations'];
        $reached = $snapshot['consultations_that_ever_reached_stage'];
        $labels = $snapshot['stage_labels'];

        $completed = (int) ($reached[Consultation::STATUS_COMPLETED] ?? 0);
        $completionRate = $total > 0 ? round($completed / $total * 100, 1) : null;

        $dropOff = $snapshot['cancelled_or_rejected_count_by_previous_stage'];
        arsort($dropOff);
        $topDropStage = array_key_first($dropOff);

        $stages = [];
        foreach ($snapshot['stage_order'] as $stage) {
            $stages[] = [
                'key' => $stage,
                'label' => $labels[$stage] ?? $stage,
                'reached' => (int) ($reached[$stage] ?? 0),
                'rate' => $total > 0 ? round((int) ($reached[$stage] ?? 0) / $total * 100, 1) : null,
                'avgHoursInStage' => $snapshot['average_hours_spent_in_stage_before_moving_on'][$stage] ?? null,
                'lost' => (int) ($dropOff[$stage] ?? 0),
            ];
        }

        return response()->json([
            'hasData' => true,
            'message' => null,
            'totals' => [
                'consultations' => $total,
                'completed' => $completed,
                'completionRate' => $completionRate,
                'topDropOffStage' => $topDropStage ? ($labels[$topDropStage] ?? $topDropStage) : null,
                'topDropOffCount' => $topDropStage ? (int) $dropOff[$topDropStage] : null,
                'lostLast30d' => (int) $snapshot['cancelled_or_rejected_last_30_days'],
                'lostPrev30d' => (int) $snapshot['cancelled_or_rejected_previous_30_days'],
            ],
            'stages' => $stages,
            'funnelEvents' => $this->funnelEvents30d(),
            'unavailable' => $this->unavailableMetrics(),
        ]);
    }

    private function funnelEvents30d(): array
    {
        if (! Schema::hasTable('funnel_events')) {
            return [];
        }

        return DB::table('funnel_events')
            ->where('created_at', '>=', now()->subDays(30))
            ->selectRaw('event, COUNT(*) as total')
            ->groupBy('event')
            ->orderByDesc('total')
            ->get()
            ->map(fn ($r) => ['event' => $r->event, 'count' => (int) $r->total])
            ->values()
            ->all();
    }

    /** Metrik yang belum terpasang sumber eksternalnya dinyatakan apa adanya. */
    private function unavailableMetrics(): array
    {
        $items = [];
        if (! filled(config('services.ga4.measurement_id'))) {
            $items[] = [
                'metric' => 'GA4 client tag (gtag.js)',
                'reason' => 'Event internal (funnel_events) sudah aktif, namun GA4_MEASUREMENT_ID belum diset di backend/.env.',
            ];
        }
        $items[] = [
            'metric' => 'Scroll depth heatmap',
            'reason' => 'Membutuhkan integrasi GA4 Enhanced Measurement / Microsoft Clarity terpisah.',
        ];

        return $items;
    }
}
