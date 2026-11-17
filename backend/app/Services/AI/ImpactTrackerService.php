<?php

namespace App\Services\AI;

use App\Models\AiImpactRecord;
use App\Models\AiRecommendation;
use App\Models\Consultation;
use Carbon\CarbonInterface;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Mengukur dampak nyata dari setiap rekomendasi AI yang sudah dieksekusi:
 * 1) Mencatat nilai baseline "Before" saat action dieksekusi (`recordExecution`).
 * 2) Membandingkan metrik sesudah 7 / 14 / 30 hari dari data DB aktual (`refreshAll`).
 */
class ImpactTrackerService
{
    public function recordExecution(AiRecommendation $recommendation, ?CarbonInterface $approvedAt = null): AiImpactRecord
    {
        $approvedAt = $approvedAt ? Carbon::parse($approvedAt) : now();

        $existing = AiImpactRecord::where('recommendation_id', $recommendation->id)->first();
        if ($existing) {
            return $existing;
        }

        $spec = $this->specFor($recommendation);
        $before = $this->measureWindow($spec['metric_key'], $spec['target_type'], $spec['target_id'], $approvedAt->copy()->subDays(14), $approvedAt);

        return AiImpactRecord::create([
            'recommendation_id' => $recommendation->id,
            'title' => $recommendation->title,
            'agent_key' => $recommendation->agent_key,
            'approved_at' => $approvedAt,
            'metric_label' => $spec['label'],
            'metric_key' => $spec['metric_key'],
            'target_type' => $spec['target_type'],
            'target_id' => $spec['target_id'],
            'before_value' => $before['display'],
            'before_numeric' => $before['numeric'],
            'after' => [],
            'change_pct' => [],
            'result' => 'monitoring',
            'ai_conclusion' => 'Sedang memantau performa 7, 14, dan 30 hari setelah eksekusi.',
        ]);
    }

    /** @return int jumlah record yang diperbarui */
    public function refreshAll(): int
    {
        $updated = 0;
        $records = AiImpactRecord::all();

        foreach ($records as $record) {
            $approvedAt = Carbon::parse($record->approved_at);
            $metricKey = $record->metric_key ?: $this->fallbackKeyForAgent($record->agent_key);
            $beforeDaily = $record->before_numeric !== null ? (float) $record->before_numeric / 14.0 : null;

            $after = is_array($record->after) ? $record->after : [];
            $changePct = is_array($record->change_pct) ? $record->change_pct : [];

            foreach ([7, 14, 30] as $days) {
                if (now()->lt($approvedAt->copy()->addDays($days))) {
                    continue;
                }

                $end = $approvedAt->copy()->addDays($days);
                $m = $this->measureWindow($metricKey, $record->target_type, $record->target_id, $approvedAt, $end);
                $after[(string) $days] = $m['display'];

                if ($beforeDaily !== null && $beforeDaily > 0) {
                    $afterDaily = $m['numeric'] / max(1, $days);
                    $changePct[(string) $days] = round((($afterDaily - $beforeDaily) / $beforeDaily) * 100, 1);
                } elseif ($beforeDaily === 0.0 && $m['numeric'] > 0) {
                    $changePct[(string) $days] = 100.0;
                }
            }

            $latestPct = $changePct['30'] ?? $changePct['14'] ?? $changePct['7'] ?? null;
            $result = 'monitoring';
            $conclusion = 'Belum genap 7 hari sejak eksekusi — pemantauan masih berjalan.';

            if (! empty($after)) {
                if ($latestPct === null) {
                    $result = 'neutral';
                    $conclusion = "Baseline belum punya cukup aktivitas untuk menghitung persentase, namun data sesudah eksekusi sudah terekam ({$record->metric_label}).";
                } elseif ($latestPct >= 5) {
                    $result = 'positive';
                    $conclusion = "Tren {$record->metric_label} meningkat +{$latestPct}% (laju harian dibanding 14 hari sebelum eksekusi).";
                } elseif ($latestPct <= -5) {
                    $result = 'negative';
                    $conclusion = "Tren {$record->metric_label} turun {$latestPct}% setelah perubahan. Evaluasi target atau copywriting.";
                } else {
                    $result = 'neutral';
                    $conclusion = "Performa {$record->metric_label} relatif stabil ({$latestPct}%) dibanding sebelum eksekusi.";
                }
            }

            $record->update([
                'metric_key' => $metricKey,
                'after' => $after,
                'change_pct' => $changePct,
                'result' => $result,
                'ai_conclusion' => $conclusion,
            ]);
            $updated++;
        }

        return $updated;
    }

    private function specFor(AiRecommendation $rec): array
    {
        if (in_array($rec->target_type, ['item', 'project'], true) && $rec->target_id) {
            return [
                'metric_key' => 'target_engagement',
                'target_type' => $rec->target_type,
                'target_id' => $rec->target_id,
                'label' => ucfirst($rec->target_type).' Views + Clicks',
            ];
        }

        return match ($rec->agent_key) {
            'leads' => [
                'metric_key' => 'leads_progressed',
                'target_type' => $rec->target_type,
                'target_id' => $rec->target_id,
                'label' => 'Leads Ditindaklanjuti & WA Inquiry',
            ],
            'cro' => [
                'metric_key' => 'cro_conversions',
                'target_type' => $rec->target_type,
                'target_id' => $rec->target_id,
                'label' => 'Konversi Konsultasi & Shop Order',
            ],
            'content' => [
                'metric_key' => 'content_engagement',
                'target_type' => $rec->target_type,
                'target_id' => $rec->target_id,
                'label' => 'Interaksi Katalog & Wishlist',
            ],
            default => [
                'metric_key' => 'site_engagement',
                'target_type' => $rec->target_type,
                'target_id' => $rec->target_id,
                'label' => 'Total Engagement Situs',
            ],
        };
    }

    private function fallbackKeyForAgent(string $agentKey): string
    {
        return match ($agentKey) {
            'leads' => 'leads_progressed',
            'cro' => 'cro_conversions',
            'content' => 'content_engagement',
            default => 'site_engagement',
        };
    }

    /** @return array{numeric: float, display: string} */
    private function measureWindow(string $metricKey, ?string $targetType, ?int $targetId, Carbon $from, Carbon $to): array
    {
        $days = max(1, $from->diffInDays($to));

        if ($metricKey === 'target_engagement' && $targetType && $targetId) {
            $clicks = DB::table('item_clicks')
                ->where('target_type', $targetType)
                ->where('target_id', $targetId)
                ->whereBetween('clicked_at', [$from, $to])
                ->count();
            $views = DB::table('item_views')
                ->where('target_type', $targetType)
                ->where('target_id', $targetId)
                ->whereBetween('viewed_at', [$from, $to])
                ->count();
            $total = $clicks + $views;

            return [
                'numeric' => (float) $total,
                'display' => "{$total} ({$views} views, {$clicks} clicks)",
            ];
        }

        if ($metricKey === 'leads_progressed') {
            $progressed = Consultation::whereBetween('updated_at', [$from, $to])
                ->whereNotIn('status', [Consultation::STATUS_NEW_INQUIRY, Consultation::STATUS_CANCELLED, Consultation::STATUS_REJECTED])
                ->count();
            $waAnswered = Schema::hasTable('wa_price_inquiries')
                ? DB::table('wa_price_inquiries')->whereBetween('updated_at', [$from, $to])->where('status', 'answered')->count()
                : 0;
            $total = $progressed + $waAnswered;

            return [
                'numeric' => (float) $total,
                'display' => "{$total} progressed ({$days}d)",
            ];
        }

        if ($metricKey === 'cro_conversions') {
            $scheduledOrMore = Consultation::whereBetween('created_at', [$from, $to])
                ->whereIn('status', [
                    Consultation::STATUS_MEETING_SCHEDULED,
                    Consultation::STATUS_IN_PROGRESS,
                    Consultation::STATUS_DP_PENDING,
                    Consultation::STATUS_PROJECT_PAID,
                    Consultation::STATUS_PROJECT_RUNNING,
                    Consultation::STATUS_COMPLETED,
                ])->count();
            $orders = Schema::hasTable('shop_orders')
                ? DB::table('shop_orders')->whereBetween('created_at', [$from, $to])->whereNotIn('status', ['dibatalkan', 'kedaluwarsa'])->count()
                : 0;
            $total = $scheduledOrMore + $orders;

            return [
                'numeric' => (float) $total,
                'display' => "{$total} conv ({$scheduledOrMore} konsultasi, {$orders} order)",
            ];
        }

        if ($metricKey === 'content_engagement') {
            $clicks = DB::table('item_clicks')->whereBetween('clicked_at', [$from, $to])->count();
            $wishlists = Schema::hasTable('wishlists')
                ? DB::table('wishlists')->whereBetween('created_at', [$from, $to])->count()
                : 0;
            $total = $clicks + $wishlists;

            return [
                'numeric' => (float) $total,
                'display' => "{$total} ({$clicks} clicks, {$wishlists} saves)",
            ];
        }

        $clicks = DB::table('item_clicks')->whereBetween('clicked_at', [$from, $to])->count();
        $views = DB::table('item_views')->whereBetween('viewed_at', [$from, $to])->count();
        $total = $clicks + $views;

        return [
            'numeric' => (float) $total,
            'display' => "{$total} ({$views} views, {$clicks} clicks)",
        ];
    }
}
