<?php

namespace App\Http\Controllers\Api\Ai;

use App\Http\Controllers\Controller;
use App\Services\Marketing\MarketingPeriod;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

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

    /**
     * GET /api/ai/leads/high-intent
     * Skor intent nyata dari database (konsultasi, cek harga WA LiviBot,
     * wishlist, keranjang shop, dan views katalog 30 hari terakhir).
     */
    public function highIntent(Request $request)
    {
        $limit = max(5, min(50, (int) $request->query('limit', 25)));
        $since = now()->subDays(30);
        $leads = [];

        // 1. Konsultasi aktif / pending (nilai project tinggi)
        if (Schema::hasTable('consultations')) {
            $consultations = DB::table('consultations')
                ->where('created_at', '>=', $since)
                ->orderByDesc('updated_at')
                ->limit(40)
                ->get();

            foreach ($consultations as $c) {
                $score = 55;
                $signals = [];
                if (in_array($c->status, ['new_inquiry', 'under_review', 'contacted'], true)) {
                    $score += 20;
                    $signals[] = 'Butuh tindak lanjut ('.$c->status.')';
                } elseif (in_array($c->status, ['meeting_scheduled', 'in_progress', 'agreement_pending', 'dp_pending'], true)) {
                    $score += 35;
                    $signals[] = 'Tahap lanjutan ('.$c->status.')';
                }
                if (! empty($c->service_type)) {
                    $signals[] = $c->service_type;
                }
                if (! empty($c->estimated_area)) {
                    $score += 10;
                    $signals[] = $c->estimated_area;
                }
                if (! empty($c->utm_source)) {
                    $signals[] = 'UTM: '.$c->utm_source;
                }

                $leads[] = [
                    'id' => 'consult_'.$c->id,
                    'name' => trim(($c->first_name ?? '').' '.($c->last_name ?? '')) ?: $c->email,
                    'contact' => $c->phone ?: $c->email,
                    'source' => ! empty($c->utm_source) ? 'Paid / '.$c->utm_source : 'Consultation Form',
                    'channel' => $c->contact_method ?: 'Web / Consultation',
                    'score' => min(100, $score),
                    'signals' => $signals,
                    'lastActivity' => $c->updated_at ?? $c->created_at,
                    'status' => $c->status,
                    'href' => '/admin/consultations/'.$c->id,
                ];
            }
        }

        // 2. WA Price Inquiries (LiviBot cek harga — intent beli loose furniture sangat kuat)
        if (Schema::hasTable('wa_price_inquiries')) {
            $inquiries = DB::table('wa_price_inquiries')
                ->where('created_at', '>=', $since)
                ->orderByDesc('created_at')
                ->limit(30)
                ->get();

            foreach ($inquiries as $inq) {
                $items = json_decode((string) $inq->items, true) ?: [];
                $titles = collect($items)->pluck('title')->filter()->take(2)->implode(', ');
                $score = $inq->status === 'pending' ? 92 : ($inq->status === 'answered' ? 78 : 45);
                $signals = [
                    'Tanya harga WA ('.count($items).' item)',
                    $titles ?: 'Produk katalog',
                ];

                $leads[] = [
                    'id' => 'wa_inq_'.$inq->id,
                    'name' => 'WA '.$inq->phone,
                    'contact' => $inq->phone,
                    'source' => 'WhatsApp LiviBot',
                    'channel' => 'WhatsApp',
                    'score' => $score,
                    'signals' => $signals,
                    'lastActivity' => $inq->updated_at ?? $inq->created_at,
                    'status' => $inq->status === 'pending' ? 'menunggu_harga_admin' : $inq->status,
                    'href' => '/admin/shop/inbox',
                ];
            }
        }

        // 3. Registered users dengan aktivitas Wishlist + repeat item_views tertinggi
        if (Schema::hasTable('wishlists') && Schema::hasTable('users')) {
            $wishUsers = DB::table('wishlists')
                ->join('users', 'users.id', '=', 'wishlists.user_id')
                ->where('wishlists.created_at', '>=', $since)
                ->selectRaw('users.id, users.name, users.email, users.phone, COUNT(*) as saves, MAX(wishlists.created_at) as last_saved')
                ->groupBy('users.id', 'users.name', 'users.email', 'users.phone')
                ->orderByDesc('saves')
                ->limit(20)
                ->get();

            foreach ($wishUsers as $wu) {
                $views = Schema::hasTable('item_views')
                    ? (int) DB::table('item_views')->where('user_id', $wu->id)->where('viewed_at', '>=', $since)->count()
                    : 0;
                $score = min(98, 45 + ((int) $wu->saves * 12) + min(25, $views * 3));

                $leads[] = [
                    'id' => 'user_'.$wu->id,
                    'name' => $wu->name ?: $wu->email,
                    'contact' => $wu->phone ?: $wu->email,
                    'source' => 'Wishlist & Browse',
                    'channel' => 'Website Member',
                    'score' => $score,
                    'signals' => array_filter([
                        "{$wu->saves} item disimpan ke wishlist",
                        $views > 0 ? "{$views} product views" : null,
                    ]),
                    'lastActivity' => $wu->last_saved,
                    'status' => $wu->saves >= 2 ? 'high_intent' : 'warming',
                    'href' => '/admin/wishlists',
                ];
            }
        }

        usort($leads, fn ($a, $b) => $b['score'] <=> $a['score']);

        return response()->json([
            'status' => 'ok',
            'total' => count($leads),
            'leads' => array_slice($leads, 0, $limit),
        ]);
    }
}
