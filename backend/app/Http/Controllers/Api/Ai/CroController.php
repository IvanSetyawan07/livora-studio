<?php

namespace App\Http\Controllers\Api\Ai;

use App\Http\Controllers\Controller;
use App\Models\Consultation;
use App\Services\AI\CroAgentService;

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
            'unavailable' => $this->unavailableMetrics(),
        ]);
    }

    /** Metrik yang JELAS belum punya sumber — dikirim apa adanya, bukan diisi 0. */
    private function unavailableMetrics(): array
    {
        return [
            [
                'metric' => 'CTA click rate',
                'reason' => 'Butuh web analytics (GA4 Data API) — belum tersambung.',
            ],
            [
                'metric' => 'Session-level behaviour / scroll depth',
                'reason' => 'Butuh capture layer di frontend — belum dipasang.',
            ],
        ];
    }
}
