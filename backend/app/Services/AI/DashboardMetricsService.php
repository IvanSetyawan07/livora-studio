<?php

namespace App\Services\AI;

use App\Models\AiCampaign;
use App\Models\AiRecommendation;
use App\Models\Consultation;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Fase 4 — perhitungan data ASLI (menggantikan stub honest-empty Fase 3).
 *
 * Prinsip yang dipegang di sini: kalau data mentahnya belum cukup untuk
 * dihitung dengan jujur, kembalikan state netral/kosong dan bilang terus
 * terang di `summary`/`deltaLabel` — jangan pernah mengarang angka yang
 * terlihat meyakinkan. Controller & route TIDAK berubah dari Fase 3.
 */
class DashboardMetricsService
{
    public function businessHealth(): array
    {
        $total = Consultation::count();
        $pendingRecommendations = AiRecommendation::where('status', 'pending')->count();

        if ($total === 0) {
            return [
                'score' => 0,
                'status' => 'Needs Attention',
                'deltaLabel' => 'Not enough data yet',
                'deltaDirection' => 'flat',
                'summary' => "Business health can't be scored yet — no consultations have come "
                    ."through the funnel so far.",
                'areasNeedingAttention' => $pendingRecommendations,
            ];
        }

        $completed = Consultation::where('status', Consultation::STATUS_COMPLETED)->count();
        $lost = Consultation::whereIn('status', [
            Consultation::STATUS_CANCELLED,
            Consultation::STATUS_REJECTED,
        ])->count();
        $active = $total - $lost;

        // Retention (masih di funnel / selesai, tidak cancel/reject) dibobot lebih
        // berat daripada conversion murni, karena funnel-nya panjang (9 tahap) dan
        // banyak consultation yang sah tapi masih berjalan, bukan berarti gagal.
        $retentionRate = ($active / $total) * 100;
        $conversionRate = ($completed / $total) * 100;

        $score = (int) round(($retentionRate * 0.6) + ($conversionRate * 0.4));
        $score = max(0, min(100, $score));

        $status = match (true) {
            $score >= 75 => 'Healthy',
            $score >= 50 => 'Needs Attention',
            default => 'At Risk',
        };

        return [
            'score' => $score,
            'status' => $status,
            // Belum ada snapshot historis skor mingguan — jujur, bukan dikarang.
            'deltaLabel' => 'Not enough history yet to compare vs last week',
            'deltaDirection' => 'flat',
            'summary' => "From {$total} consultations, {$completed} completed and {$lost} were "
                ."cancelled or rejected. {$pendingRecommendations} AI recommendation(s) awaiting review.",
            'areasNeedingAttention' => $pendingRecommendations,
        ];
    }

    public function priorities(): array
    {
        $items = AiRecommendation::query()
            ->where('status', 'pending')
            ->orderByRaw("FIELD(priority, 'high', 'medium', 'low')")
            ->orderByDesc('confidence')
            ->limit(6)
            ->get();

        return $items->map(fn ($r) => [
            'id' => 'pri_'.$r->id,
            'priority' => $r->priority ?? 'low',
            'title' => $r->title,
            'explanation' => $r->why ?: $r->description,
            'agent' => $r->agent_key,
            'expectedImpact' => $r->expected_impact,
            'href' => '/admin/ai-marketing/ai-center/recommendations',
            'recommendationId' => (string) $r->id,
        ])->values()->all();
    }

    public function overviewKpis(): array
    {
        $now = now();
        $periodEnd = $now->copy();
        $periodStart = $now->copy()->subDays(30);
        $prevStart = $periodStart->copy()->subDays(30);
        $prevEnd = $periodStart->copy();

        $clicksNow = DB::table('item_clicks')
            ->whereBetween('clicked_at', [$periodStart, $periodEnd])->count();
        $clicksPrev = DB::table('item_clicks')
            ->whereBetween('clicked_at', [$prevStart, $prevEnd])->count();

        $leadsNow = Consultation::whereBetween('created_at', [$periodStart, $periodEnd])->count();
        $leadsPrev = Consultation::whereBetween('created_at', [$prevStart, $prevEnd])->count();

        $pendingRecommendations = AiRecommendation::where('status', 'pending')->count();
        $activeCampaigns = AiCampaign::where('status', 'Active')->count();

        return [
            [
                'id' => 'site_engagement',
                'label' => 'Site Engagement',
                'value' => $clicksNow,
                'deltaLabel' => $this->pctDeltaLabel($clicksNow, $clicksPrev),
                'deltaDirection' => $this->pctDeltaDirection($clicksNow, $clicksPrev),
                'footnote' => 'Item & project clicks, last 30 days',
                'spark' => $this->dailyCounts('item_clicks', 'clicked_at', 8),
                'live' => true,
            ],
            [
                'id' => 'new_leads',
                'label' => 'New Leads',
                'value' => $leadsNow,
                'deltaLabel' => $this->pctDeltaLabel($leadsNow, $leadsPrev),
                'deltaDirection' => $this->pctDeltaDirection($leadsNow, $leadsPrev),
                'footnote' => 'New consultations, last 30 days',
                'spark' => $this->dailyCounts('consultations', 'created_at', 8),
                'live' => true,
            ],
            [
                'id' => 'ai_recommendations',
                'label' => 'AI Recommendations',
                'value' => $pendingRecommendations,
                'deltaLabel' => $pendingRecommendations > 0 ? 'Awaiting your review' : 'No pending recommendations yet',
                'deltaDirection' => 'flat',
                'footnote' => 'Pending review, across all agents',
                'spark' => [],
            ],
            [
                'id' => 'active_campaigns',
                'label' => 'Active Campaigns',
                'value' => $activeCampaigns,
                'deltaLabel' => $activeCampaigns > 0 ? "{$activeCampaigns} running" : 'No AI campaigns yet',
                'deltaDirection' => 'flat',
                'footnote' => 'AI-managed marketing campaigns',
                'spark' => [],
            ],
        ];
    }

    /** Persentase perubahan periode sekarang vs periode sebelumnya, dibungkus label siap-tampil. */
    protected function pctDeltaLabel(int $current, int $previous): string
    {
        if ($previous === 0) {
            return $current > 0 ? 'New this period' : 'No change';
        }

        $pct = round((($current - $previous) / $previous) * 100, 1);
        $sign = $pct > 0 ? '+' : '';

        return "{$sign}{$pct}% vs previous 30 days";
    }

    protected function pctDeltaDirection(int $current, int $previous): string
    {
        if ($current === $previous) {
            return 'flat';
        }

        return $current > $previous ? 'up' : 'down';
    }

    /** Hitungan harian dari sebuah tabel/kolom tanggal, untuk `spark` — generik dipakai di beberapa KPI. */
    protected function dailyCounts(string $table, string $column, int $days): array
    {
        $end = now()->endOfDay();
        $start = $end->copy()->subDays($days - 1)->startOfDay();

        $rows = DB::table($table)
            ->selectRaw("DATE({$column}) as d, COUNT(*) as c")
            ->whereBetween($column, [$start, $end])
            ->groupBy('d')
            ->pluck('c', 'd');

        $out = [];
        for ($c = $start->copy(); $c->lte($end); $c->addDay()) {
            $out[] = (int) ($rows[$c->toDateString()] ?? 0);
        }

        return $out;
    }
}