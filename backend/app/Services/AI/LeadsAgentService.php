<?php

namespace App\Services\AI;

use App\Services\Marketing\MarketingPeriod;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Leads Agent — menganalisis kualitas & kecepatan penanganan lead.
 *
 * Sumber datanya sama persis dengan LeadsController::funnel(): konsultasi baru,
 * wishlist adds, lead yang sudah ditindaklanjuti, sebaran status, plus delta
 * terhadap periode sebelumnya.
 */
class LeadsAgentService extends BaseAgentService
{
    private const WINDOW_DAYS = 30;

    /** Minimal lead supaya polanya tidak sekadar kebetulan. */
    public const MIN_LEADS = 5;

    protected function agentKey(): string
    {
        return 'leads';
    }

    protected function agentLabel(): string
    {
        return 'Leads Agent';
    }

    protected function defaultActionType(): string
    {
        return 'follow_up';
    }

    protected function sourceLabels(array $snapshot): array
    {
        return ['Lead Data'];
    }

    protected function emptyMessage(): string
    {
        return 'Lead pada 30 hari terakhir masih di bawah '.self::MIN_LEADS
            .' — belum cukup untuk dianalisis secara jujur. Tidak ada insight yang dibuat.';
    }

    protected function roleBrief(): string
    {
        return 'Kamu adalah Lead Management Analyst untuk Livora Studio, platform interior design '
            .'& furniture custom di Indonesia. Tugasmu menganalisis volume lead, response rate, '
            .'sebaran status konsultasi, dan tren dibanding periode sebelumnya, lalu menemukan '
            .'lead yang menumpuk tanpa ditindaklanjuti serta penurunan kualitas penanganan.';
    }

    protected function buildSnapshot(): ?array
    {
        $period = MarketingPeriod::fromRequest(new Request(['days' => self::WINDOW_DAYS]), self::WINDOW_DAYS);
        $prev = $period->previous();

        $current = $this->window($period->fromDate(), $period->toDate());

        if ($current['leads'] < self::MIN_LEADS) {
            return null;
        }

        $previous = $this->window($prev->fromDate(), $prev->toDate());

        $delta = fn (float $now, float $before) => $before > 0
            ? round((($now - $before) / $before) * 100, 1)
            : null;

        return [
            'window' => [
                'from' => $period->fromDate(),
                'to' => $period->toDate(),
                'days' => $period->days(),
            ],
            'previous_window' => ['from' => $prev->fromDate(), 'to' => $prev->toDate()],
            'kpis' => [
                'leads' => $current['leads'],
                'wishlist_adds' => $current['wishlist'],
                'responded' => $current['responded'],
                'response_rate_percent' => $current['leads'] > 0
                    ? round($current['responded'] / $current['leads'] * 100, 1) : null,
                'still_unhandled' => $current['leads'] - $current['responded'],
            ],
            'previous_kpis' => [
                'leads' => $previous['leads'],
                'wishlist_adds' => $previous['wishlist'],
                'responded' => $previous['responded'],
                'response_rate_percent' => $previous['leads'] > 0
                    ? round($previous['responded'] / $previous['leads'] * 100, 1) : null,
            ],
            'deltas_percent' => [
                'leads' => $delta($current['leads'], $previous['leads']),
                'wishlist_adds' => $delta($current['wishlist'], $previous['wishlist']),
                'responded' => $delta($current['responded'], $previous['responded']),
            ],
            'leads_by_status' => $current['byStatus'],
            'daily_series' => $current['series'],
        ];
    }

    /** Agregat satu jendela waktu — logika sama dengan LeadsController::funnel(). */
    private function window(string $fromDate, string $toDate): array
    {
        $from = $fromDate.' 00:00:00';
        $to = $toDate.' 23:59:59';

        $consultByDay = DB::table('consultations')
            ->selectRaw('DATE(created_at) as d, COUNT(*) as n')
            ->whereBetween('created_at', [$from, $to])
            ->groupBy('d')->pluck('n', 'd');

        $wishlistByDay = DB::table('wishlists')
            ->selectRaw('DATE(created_at) as d, COUNT(*) as n')
            ->whereBetween('created_at', [$from, $to])
            ->groupBy('d')->pluck('n', 'd');

        $respondedByDay = DB::table('consultations')
            ->selectRaw('DATE(created_at) as d, COUNT(*) as n')
            ->whereBetween('created_at', [$from, $to])
            ->whereNotIn('status', ['new_inquiry'])
            ->groupBy('d')->pluck('n', 'd');

        $series = [];
        $cursor = new \DateTimeImmutable($fromDate);
        $end = new \DateTimeImmutable($toDate);
        while ($cursor <= $end) {
            $d = $cursor->format('Y-m-d');
            $series[] = [
                'date' => $d,
                'leads' => (int) ($consultByDay[$d] ?? 0),
                'wishlistAdds' => (int) ($wishlistByDay[$d] ?? 0),
                'responded' => (int) ($respondedByDay[$d] ?? 0),
            ];
            $cursor = $cursor->modify('+1 day');
        }

        $byStatus = DB::table('consultations')
            ->selectRaw('status, COUNT(*) as n')
            ->whereBetween('created_at', [$from, $to])
            ->groupBy('status')->orderByDesc('n')->get()
            ->map(fn ($r) => ['status' => $r->status, 'count' => (int) $r->n])->all();

        return [
            'leads' => array_sum(array_column($series, 'leads')),
            'wishlist' => array_sum(array_column($series, 'wishlistAdds')),
            'responded' => array_sum(array_column($series, 'responded')),
            'series' => $series,
            'byStatus' => $byStatus,
        ];
    }
}
