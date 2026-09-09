<?php

namespace App\Services\AI;

use App\Services\Marketing\GoogleAdsClient;
use App\Services\Marketing\MarketingPeriod;
use App\Services\Marketing\MarketingSection;
use App\Services\Marketing\MetaAdsClient;
use Illuminate\Http\Request;

/**
 * Ads Agent — menganalisis performa campaign berbayar (Meta Ads & Google Ads).
 *
 * Sumber datanya PERSIS sama dengan yang dipakai AdsController::summary(),
 * jadi angka yang dianalisis AI selalu sama dengan angka yang dilihat user
 * di halaman Ads. Kalau tidak ada satu pun platform yang tersambung, agent
 * berhenti jujur — tidak ada insight karangan.
 */
class AdsAgentService extends BaseAgentService
{
    private const WINDOW_DAYS = 30;

    public function __construct(
        AIProviderManager $ai,
        private MetaAdsClient $meta,
        private GoogleAdsClient $google,
    ) {
        parent::__construct($ai);
    }

    protected function agentKey(): string
    {
        return 'ads';
    }

    protected function agentLabel(): string
    {
        return 'Ads Agent';
    }

    protected function defaultActionType(): string
    {
        return 'budget_shift';
    }

    protected function sourceLabels(array $snapshot): array
    {
        return $snapshot['connected_platforms'] ?? ['Ads'];
    }

    protected function emptyMessage(): string
    {
        return 'Belum ada platform iklan yang tersambung (Meta Ads / Google Ads) atau belum ada '
            .'belanja iklan pada 30 hari terakhir. Tidak ada insight yang dibuat.';
    }

    protected function roleBrief(): string
    {
        return 'Kamu adalah Paid Ads Analyst untuk Livora Studio, platform interior design & '
            .'furniture custom di Indonesia. Tugasmu menganalisis performa campaign berbayar '
            .'(spend, leads, CPL, CTR, ROAS) per platform dan per campaign, lalu menemukan '
            .'campaign yang boros, campaign yang layak dinaikkan budget-nya, dan anomali '
            .'biaya per lead.';
    }

    protected function buildSnapshot(): ?array
    {
        $period = MarketingPeriod::fromRequest(new Request(['days' => self::WINDOW_DAYS]), self::WINDOW_DAYS);

        $platforms = [
            'meta' => MarketingSection::attempt($period->cacheKey('ads:meta'), fn () => [
                'label' => 'Meta Ads',
                'daily' => $this->meta->dailySeries($period),
                'campaigns' => $this->meta->campaigns($period),
            ]),
            'google' => MarketingSection::attempt($period->cacheKey('ads:google'), fn () => [
                'label' => 'Google Ads',
                'daily' => $this->google->dailySeries($period),
                'campaigns' => $this->google->campaigns($period),
            ]),
        ];

        $connected = [];
        $campaigns = [];
        $perPlatform = [];
        $totals = ['spend' => 0.0, 'leads' => 0.0, 'clicks' => 0, 'impressions' => 0, 'revenue' => 0.0];

        foreach ($platforms as $p) {
            if (($p['status'] ?? null) !== 'ok') {
                continue;
            }

            $connected[] = $p['label'];
            $platformTotals = ['spend' => 0.0, 'leads' => 0.0, 'clicks' => 0, 'impressions' => 0, 'revenue' => 0.0];

            foreach ($p['daily'] as $row) {
                foreach (array_keys($platformTotals) as $f) {
                    $platformTotals[$f] += $row[$f] ?? 0;
                    $totals[$f] += $row[$f] ?? 0;
                }
            }

            $perPlatform[] = [
                'platform' => $p['label'],
                'spend' => round($platformTotals['spend'], 2),
                'leads' => round($platformTotals['leads'], 1),
                'cost_per_lead' => $platformTotals['leads'] > 0
                    ? round($platformTotals['spend'] / $platformTotals['leads'], 2) : null,
            ];

            foreach ($p['campaigns'] as $c) {
                $campaigns[] = [
                    'platform' => $p['label'],
                    'name' => $c['name'] ?? null,
                    'status' => $c['status'] ?? 'active',
                    'spend' => $c['spend'] ?? 0,
                    'leads' => $c['leads'] ?? 0,
                    'clicks' => $c['clicks'] ?? null,
                    'impressions' => $c['impressions'] ?? null,
                    'cost_per_lead' => ! empty($c['leads']) ? round($c['spend'] / $c['leads'], 2) : null,
                ];
            }
        }

        if (empty($connected) || $totals['spend'] <= 0) {
            return null;
        }

        return [
            'window' => [
                'from' => $period->fromDate(),
                'to' => $period->toDate(),
                'days' => $period->days(),
            ],
            'currency' => 'IDR',
            'connected_platforms' => $connected,
            'totals' => [
                'spend' => round($totals['spend'], 2),
                'leads' => round($totals['leads'], 1),
                'cost_per_lead' => $totals['leads'] > 0 ? round($totals['spend'] / $totals['leads'], 2) : null,
                'clicks' => (int) $totals['clicks'],
                'impressions' => (int) $totals['impressions'],
                'ctr_percent' => $totals['impressions'] > 0
                    ? round($totals['clicks'] / $totals['impressions'] * 100, 2) : null,
                'roas' => $totals['spend'] > 0 ? round($totals['revenue'] / $totals['spend'], 2) : null,
            ],
            'per_platform' => $perPlatform,
            'campaigns' => $campaigns,
        ];
    }
}
