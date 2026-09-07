<?php

namespace App\Http\Controllers\Api\Ai;

use App\Http\Controllers\Controller;
use App\Services\Marketing\MarketingPeriod;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * Lead Intelligence — funnel dari data INTERNAL yang sudah nyata ada di
 * database: konsultasi (leads) dan wishlist. Tidak butuh kredensial pihak
 * ketiga, jadi panel ini langsung hidup begitu ada aktivitas pengunjung.
 *
 * Metrik email (open/click rate) sengaja TIDAK dihitung di sini — itu ranah
 * penyedia email (Resend/Mailgun) dan tetap tampil "Not connected" di UI
 * sampai API statistik mereka disambungkan.
 */
class LeadsController extends Controller
{
    private const CACHE_TTL = 10 * 60;

    /**
     * GET /api/ai/leads/funnel?from=YYYY-MM-DD&to=YYYY-MM-DD
     */
    public function funnel()
    {
        $period = MarketingPeriod::fromRequest(request());

        $payload = Cache::remember($period->cacheKey('leads:funnel'), self::CACHE_TTL, function () use ($period) {
            $from = $period->fromDate().' 00:00:00';
            $to = $period->toDate().' 23:59:59';

            // Seri harian: konsultasi baru + wishlist adds.
            $consultByDay = DB::table('consultations')
                ->selectRaw('DATE(created_at) as d, COUNT(*) as n')
                ->whereBetween('created_at', [$from, $to])
                ->groupBy('d')->pluck('n', 'd');

            $wishlistByDay = DB::table('wishlists')
                ->selectRaw('DATE(created_at) as d, COUNT(*) as n')
                ->whereBetween('created_at', [$from, $to])
                ->groupBy('d')->pluck('n', 'd');

            // Lead yang ditindaklanjuti = status sudah bukan inquiry baru.
            $respondedByDay = DB::table('consultations')
                ->selectRaw('DATE(created_at) as d, COUNT(*) as n')
                ->whereBetween('created_at', [$from, $to])
                ->whereNotIn('status', ['new_inquiry'])
                ->groupBy('d')->pluck('n', 'd');

            $series = [];
            $cursor = new \DateTimeImmutable($period->fromDate());
            $end = new \DateTimeImmutable($period->toDate());
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

            $totalLeads = array_sum(array_column($series, 'leads'));
            $totalWishlist = array_sum(array_column($series, 'wishlistAdds'));
            $totalResponded = array_sum(array_column($series, 'responded'));

            // Periode sebelumnya untuk delta KPI.
            $prev = $period->previous();
            $prevFrom = $prev->fromDate().' 00:00:00';
            $prevTo = $prev->toDate().' 23:59:59';
            $prevLeads = DB::table('consultations')->whereBetween('created_at', [$prevFrom, $prevTo])->count();
            $prevWishlist = DB::table('wishlists')->whereBetween('created_at', [$prevFrom, $prevTo])->count();
            $prevResponded = DB::table('consultations')
                ->whereBetween('created_at', [$prevFrom, $prevTo])
                ->whereNotIn('status', ['new_inquiry'])->count();

            $delta = fn (float $now, float $before) => $before > 0
                ? round((($now - $before) / $before) * 100, 1)
                : null;

            $responseRate = $totalLeads > 0 ? round(($totalResponded / $totalLeads) * 100, 1) : null;
            $prevResponseRate = $prevLeads > 0 ? round(($prevResponded / $prevLeads) * 100, 1) : null;

            return [
                'status' => 'ok',
                'period' => $period->toArray(),
                'generatedAt' => now()->toIso8601String(),
                'kpis' => [
                    'leads' => $totalLeads,
                    'wishlistAdds' => $totalWishlist,
                    'responded' => $totalResponded,
                    'responseRate' => $responseRate,
                ],
                'deltas' => [
                    'leads' => $delta($totalLeads, $prevLeads),
                    'wishlistAdds' => $delta($totalWishlist, $prevWishlist),
                    'responseRate' => $responseRate !== null && $prevResponseRate !== null
                        ? round($responseRate - $prevResponseRate, 1)
                        : null,
                ],
                'series' => $series,
                // Status per tahap konsultasi (untuk funnel agregat).
                'byStatus' => DB::table('consultations')
                    ->selectRaw('status, COUNT(*) as n')
                    ->whereBetween('created_at', [$from, $to])
                    ->groupBy('status')->orderByDesc('n')->get()
                    ->map(fn ($r) => ['status' => $r->status, 'count' => (int) $r->n])->all(),
            ];
        });

        return response()->json($payload);
    }
}
