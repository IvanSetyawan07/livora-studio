<?php

namespace App\Http\Controllers\Api\Ai;

use App\Http\Controllers\Controller;
use App\Services\Marketing\GoogleAdsClient;
use App\Services\Marketing\MarketingPeriod;
use App\Services\Marketing\MarketingSection;
use App\Services\Marketing\MetaAdsClient;
use Illuminate\Http\Request;

class AdsController extends Controller
{
    public function __construct(private MetaAdsClient $meta, private GoogleAdsClient $google)
    {
    }

    /** GET /api/ai/ads/summary?from&to|days */
    public function summary(Request $request)
    {
        $period = MarketingPeriod::fromRequest($request, 30);

        $platforms = [
            'meta' => MarketingSection::attempt($period->cacheKey('ads:meta'), fn () => [
                'label' => 'Meta Ads',
                'accountId' => $this->meta->accountId(),
                'daily' => $this->meta->dailySeries($period),
                'campaigns' => $this->meta->campaigns($period),
            ]),
            'google' => MarketingSection::attempt($period->cacheKey('ads:google'), fn () => [
                'label' => 'Google Ads',
                'accountId' => $this->google->customerId(),
                'daily' => $this->google->dailySeries($period),
                'campaigns' => $this->google->campaigns($period),
            ]),
        ];

        $byDate = [];
        $campaigns = [];
        $split = [];
        $totals = ['spend' => 0.0, 'leads' => 0.0, 'clicks' => 0, 'impressions' => 0, 'revenue' => 0.0];

        foreach ($platforms as $key => $p) {
            if (($p['status'] ?? null) !== 'ok') {
                continue;
            }
            $platformSpend = 0.0;
            foreach ($p['daily'] as $row) {
                $d = $row['date'];
                $byDate[$d] ??= ['date' => $d, 'spend' => 0.0, 'leads' => 0.0, 'clicks' => 0, 'impressions' => 0, 'revenue' => 0.0];
                foreach (['spend', 'leads', 'clicks', 'impressions', 'revenue'] as $f) {
                    $byDate[$d][$f] += $row[$f];
                    $totals[$f] += $row[$f];
                }
                $platformSpend += $row['spend'];
            }
            $split[] = ['platform' => $key, 'label' => $p['label'], 'spend' => round($platformSpend, 2)];
            foreach ($p['campaigns'] as $c) {
                $campaigns[] = $c + [
                    'platform' => $key,
                    'cpl' => $c['leads'] > 0 ? round($c['spend'] / $c['leads'], 2) : null,
                    'status' => $c['status'] ?? 'active',
                ];
            }
        }
        ksort($byDate);
        $series = array_values(array_map(function ($r) {
            $r['spend'] = round($r['spend'], 2);
            $r['cpl'] = $r['leads'] > 0 ? round($r['spend'] / $r['leads'], 2) : null;

            return $r;
        }, $byDate));

        $anyOk = collect($platforms)->contains(fn ($p) => ($p['status'] ?? null) === 'ok');
        $status = $anyOk ? 'ok' : (collect($platforms)->pluck('status')->unique()->count() === 1
            ? $platforms['meta']['status'] : 'not_configured');

        return response()->json([
            'status' => $status,
            'period' => $period->toArray(),
            'generatedAt' => now()->toIso8601String(),
            'kpis' => [
                'spend' => round($totals['spend'], 2),
                'leads' => round($totals['leads'], 1),
                'cpl' => $totals['leads'] > 0 ? round($totals['spend'] / $totals['leads'], 2) : null,
                'roas' => $totals['spend'] > 0 ? round($totals['revenue'] / $totals['spend'], 2) : null,
                'ctr' => $totals['impressions'] > 0 ? round($totals['clicks'] / $totals['impressions'] * 100, 2) : null,
            ],
            'series' => $series,
            'budgetSplit' => $split,
            'campaigns' => $campaigns,
            'platforms' => collect($platforms)->map(fn ($p) => collect($p)->except(['daily', 'campaigns'])->all())->all(),
        ]);
    }
}
