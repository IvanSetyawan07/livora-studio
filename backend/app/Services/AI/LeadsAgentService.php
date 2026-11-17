<?php

namespace App\Services\AI;

use App\Services\Marketing\MarketingPeriod;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Leads Agent — menggabungkan data konsultasi, wishlist, repeat item_views,
 * antrean cek harga WhatsApp (`wa_price_inquiries`), percakapan LiviBot
 * (`wa_conversations`), dan pesanan shop (`shop_orders`).
 */
class LeadsAgentService extends BaseAgentService
{
    private const WINDOW_DAYS = 30;

    public const MIN_LEADS = 3;

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
        return ['Lead Data', 'WhatsApp & Shop'];
    }

    protected function emptyMessage(): string
    {
        return 'Belum ada cukup aktivitas lead (konsultasi + WA inquiry + wishlist) dalam 30 hari terakhir untuk dianalisis secara jujur.';
    }

    protected function roleBrief(): string
    {
        return 'Kamu adalah Lead Intelligence Analyst untuk Livora Studio (interior design, arsitek & custom/loose furniture di Jakarta). '
            .'Tugasmu memprioritaskan prospek berniat beli tinggi (konsultasi yang belum di-follow up, pertanyaan harga WhatsApp di LiviBot, '
            .'pengguna dengan wishlist berulang & view durasi tinggi), serta merekomendasikan tindak lanjut via WhatsApp / Email (`follow_up`). '
            .'Jika merujuk ke konsultasi spesifik, isi target_type="consultation" dan target_id=<id>; jika cek harga WA, isi target_type="wa_inquiry" dan target_id=<id>.';
    }

    protected function buildSnapshot(): ?array
    {
        $period = MarketingPeriod::fromRequest(new Request(['days' => self::WINDOW_DAYS]), self::WINDOW_DAYS);
        $prev = $period->previous();

        $current = $this->window($period->fromDate(), $period->toDate());
        $waStats = $this->whatsappSnapshot($period->fromDate(), $period->toDate());

        $totalSignals = $current['leads'] + ($waStats['price_inquiries_total'] ?? 0) + $current['wishlist'];
        if ($totalSignals < self::MIN_LEADS) {
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
            'whatsapp_livibot' => $waStats,
            'stalled_consultations' => $this->stalledConsultations(),
            'utm_sources_30d' => $this->utmBreakdown($period->fromDate(), $period->toDate()),
            'daily_series' => $current['series'],
        ];
    }

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

    private function whatsappSnapshot(string $fromDate, string $toDate): array
    {
        $from = $fromDate.' 00:00:00';
        $to = $toDate.' 23:59:59';

        $inquiriesTotal = 0;
        $inquiriesPending = 0;
        $pendingDetails = [];

        if (Schema::hasTable('wa_price_inquiries')) {
            $inquiriesTotal = (int) DB::table('wa_price_inquiries')->whereBetween('created_at', [$from, $to])->count();
            $inquiriesPending = (int) DB::table('wa_price_inquiries')->where('status', 'pending')->count();
            $pendingDetails = DB::table('wa_price_inquiries')
                ->where('status', 'pending')
                ->orderBy('created_at')
                ->limit(8)
                ->get(['id', 'phone', 'items', 'created_at'])
                ->map(function ($r) {
                    $items = json_decode((string) $r->items, true) ?: [];

                    return [
                        'id' => (int) $r->id,
                        'phone' => substr((string) $r->phone, 0, 6).'***'.substr((string) $r->phone, -3),
                        'item_count' => count($items),
                        'first_item' => $items[0]['title'] ?? null,
                        'age_hours' => now()->diffInHours($r->created_at),
                    ];
                })->all();
        }

        $waitingAdmin = Schema::hasTable('wa_conversations')
            ? (int) DB::table('wa_conversations')->where('mode', 'menunggu_admin')->count()
            : 0;
        $ordersPendingWa = Schema::hasTable('shop_orders')
            ? (int) DB::table('shop_orders')->whereIn('status', ['menunggu_wa', 'menunggu_harga', 'penawaran'])->count()
            : 0;

        return [
            'price_inquiries_total' => $inquiriesTotal,
            'price_inquiries_pending' => $inquiriesPending,
            'pending_price_inquiry_samples' => $pendingDetails,
            'conversations_waiting_admin' => $waitingAdmin,
            'shop_orders_awaiting_closing' => $ordersPendingWa,
        ];
    }

    private function stalledConsultations(): array
    {
        return DB::table('consultations')
            ->whereIn('status', ['new_inquiry', 'under_review', 'contacted'])
            ->where('updated_at', '<=', now()->subDays(2))
            ->orderBy('updated_at')
            ->limit(10)
            ->get(['id', 'first_name', 'status', 'service_type', 'project_type', 'updated_at'])
            ->map(fn ($c) => [
                'id' => (int) $c->id,
                'name' => $c->first_name,
                'status' => $c->status,
                'service_type' => $c->service_type,
                'project_type' => $c->project_type,
                'idle_hours' => now()->diffInHours($c->updated_at),
            ])->all();
    }

    private function utmBreakdown(string $fromDate, string $toDate): array
    {
        if (! Schema::hasColumn('consultations', 'utm_source')) {
            return [];
        }

        return DB::table('consultations')
            ->whereBetween('created_at', [$fromDate.' 00:00:00', $toDate.' 23:59:59'])
            ->selectRaw("COALESCE(NULLIF(utm_source, ''), '(direct/organic)') as source, COUNT(*) as total")
            ->groupBy('source')
            ->orderByDesc('total')
            ->limit(8)
            ->get()
            ->map(fn ($r) => ['source' => $r->source, 'leads' => (int) $r->total])
            ->all();
    }
}
