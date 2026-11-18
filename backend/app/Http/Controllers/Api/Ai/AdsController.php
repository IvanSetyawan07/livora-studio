<?php

namespace App\Http\Controllers\Api\Ai;

use App\Http\Controllers\Controller;
use App\Services\AI\AiLearningMemoryService;
use App\Services\Marketing\GoogleAdsClient;
use App\Services\Marketing\MarketingPeriod;
use App\Services\Marketing\MarketingSection;
use App\Services\Marketing\MetaAdsClient;
use Illuminate\Http\Request;

class AdsController extends Controller
{
    public function __construct(
        private MetaAdsClient $meta,
        private GoogleAdsClient $google,
        private ?AiLearningMemoryService $learning = null,
    ) {
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
                    'status' => $c['status'] ?? 'unknown',
                ];
            }
        }

        // Hitung True ROI (%) & Blended ROAS berbasis database real Livora + catatan IG Boost
        $apiSpend = $totals['spend'];
        $apiRevenue = $totals['revenue'];
        $apiLeads = $totals['leads'];
        $apiClicks = (int) $totals['clicks'];
        $apiImpressions = (int) $totals['impressions'];

        $roiAttribution = null;
        if ($this->learning !== null) {
            try {
                $roiAttribution = $this->learning->roiAndRoasAttribution(
                    $period->days(),
                    $apiSpend,
                    $apiRevenue,
                    $apiLeads,
                    $apiClicks,
                    $apiImpressions
                );

                // Gabungkan catatan Instagram Boost pada periode ini ke dalam deret harian & tabel campaign
                $igBoostEntries = is_array($roiAttribution['igBoostEntries'] ?? null) ? $roiAttribution['igBoostEntries'] : [];
                $igBoostTotalSpend = 0.0;

                foreach ($igBoostEntries as $boost) {
                    $d = (string) ($boost['date'] ?? now()->toDateString());
                    $bSpend = (float) ($boost['spendRp'] ?? 0);
                    $bLeads = (float) ($boost['leads'] ?? 0);
                    $bClicks = (int) ($boost['clicks'] ?? 0);
                    $bReach = (int) ($boost['reach'] ?? 0);

                    $byDate[$d] ??= ['date' => $d, 'spend' => 0.0, 'leads' => 0.0, 'clicks' => 0, 'impressions' => 0, 'revenue' => 0.0];
                    $byDate[$d]['spend'] += $bSpend;
                    $byDate[$d]['leads'] += $bLeads;
                    $byDate[$d]['clicks'] += $bClicks;
                    $byDate[$d]['impressions'] += $bReach;

                    $totals['spend'] += $bSpend;
                    $totals['leads'] += $bLeads;
                    $totals['clicks'] += $bClicks;
                    $totals['impressions'] += $bReach;
                    $igBoostTotalSpend += $bSpend;

                    $campaigns[] = [
                        'id' => (string) ($boost['id'] ?? uniqid('igb_')),
                        'name' => '[IG Boost] '.((string) ($boost['title'] ?? 'Instagram Boost Post')),
                        'platform' => 'meta',
                        'status' => 'active',
                        'spend' => round($bSpend, 2),
                        'leads' => $bLeads,
                        'impressions' => $bReach,
                        'clicks' => $bClicks,
                        'revenue' => 0.0,
                        'cpl' => $bLeads > 0 ? round($bSpend / $bLeads, 2) : null,
                    ];
                }

                if ($igBoostTotalSpend > 0) {
                    $foundMetaSplit = false;
                    foreach ($split as &$sItem) {
                        if ($sItem['platform'] === 'meta') {
                            $sItem['spend'] = round($sItem['spend'] + $igBoostTotalSpend, 2);
                            $foundMetaSplit = true;
                            break;
                        }
                    }
                    unset($sItem);
                    if (! $foundMetaSplit) {
                        $split[] = ['platform' => 'meta', 'label' => 'Instagram Boost / Meta', 'spend' => round($igBoostTotalSpend, 2)];
                    }
                }
            } catch (\Throwable) {
                $roiAttribution = null;
            }
        }

        ksort($byDate);
        $series = array_values(array_map(function ($r) {
            $r['spend'] = round($r['spend'], 2);
            $r['cpl'] = $r['leads'] > 0 ? round($r['spend'] / $r['leads'], 2) : null;

            return $r;
        }, $byDate));

        $hasIgBoostData = ($roiAttribution['igBoostManualSpendRp'] ?? 0) > 0;
        $anyOk = $hasIgBoostData || collect($platforms)->contains(fn ($p) => ($p['status'] ?? null) === 'ok');
        $status = $anyOk ? 'ok' : (collect($platforms)->pluck('status')->unique()->count() === 1
            ? $platforms['meta']['status'] : 'not_configured');

        $platformRoas = $totals['spend'] > 0 && $totals['revenue'] > 0
            ? round($totals['revenue'] / $totals['spend'], 2)
            : null;
        $effectiveRoas = $roiAttribution['effectiveRoas'] ?? $platformRoas;
        $effectiveRoiPct = $roiAttribution['effectiveRoiPct'] ?? null;
        $effectiveLeads = max($totals['leads'], (float) ($roiAttribution['totalRealLeads'] ?? 0));
        $effectiveCpl = $totals['spend'] > 0 && $effectiveLeads > 0
            ? round($totals['spend'] / $effectiveLeads, 0)
            : ($totals['leads'] > 0 ? round($totals['spend'] / $totals['leads'], 2) : null);

        return response()->json([
            'status' => $status,
            'period' => $period->toArray(),
            'generatedAt' => now()->toIso8601String(),
            'kpis' => [
                'spend' => round($totals['spend'], 2),
                'leads' => round($effectiveLeads, 1),
                'cpl' => $effectiveCpl,
                'roas' => $effectiveRoas,
                'roiPct' => $effectiveRoiPct,
                'platformRoas' => $platformRoas,
                'realShopRoas' => $roiAttribution['realShopRoas'] ?? null,
                'blendedPipelineRoas' => $roiAttribution['blendedPipelineRoas'] ?? null,
                'ctr' => $totals['impressions'] > 0 ? round($totals['clicks'] / $totals['impressions'] * 100, 2) : null,
            ],
            'roiAttribution' => $roiAttribution,
            'series' => $series,
            'budgetSplit' => $split,
            'campaigns' => $campaigns,
            'platforms' => collect($platforms)->map(fn ($p) => collect($p)->except(['daily', 'campaigns'])->all())->all(),
        ]);
    }
}
