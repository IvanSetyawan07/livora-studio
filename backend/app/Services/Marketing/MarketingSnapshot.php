<?php

namespace App\Services\Marketing;

use Illuminate\Support\Facades\Cache;

/**
 * Ringkasan angka platform untuk grounding chat. HANYA membaca cache yang sudah
 * diisi endpoint dashboard (tidak memanggil API luar dari chat) — kalau belum ada
 * di cache, dikatakan apa adanya supaya model tidak mengarang.
 */
class MarketingSnapshot
{
    public function lines(MarketingPeriod $period): string
    {
        $out = ["Periode: {$period->fromDate()} s/d {$period->toDate()} ({$period->days()} hari)"];

        $ga4 = Cache::get($period->cacheKey('ga4:overview'));
        $out[] = is_array($ga4)
            ? sprintf('- GA4: sessions=%d (%s%%), users=%d, pageviews=%d, engagement=%s%%, conversions=%s',
                $ga4['totals']['sessions'], $ga4['deltas']['sessions'] ?? 'n/a', $ga4['totals']['users'],
                $ga4['totals']['pageviews'], $ga4['totals']['engagementRate'], $ga4['totals']['conversions'])
            : '- GA4: belum ada data ter-cache untuk periode ini (buka Overview dulu / integrasi belum tersambung)';

        foreach (['ads:meta' => 'Meta Ads', 'ads:google' => 'Google Ads'] as $key => $label) {
            $p = Cache::get($period->cacheKey($key));
            if (is_array($p)) {
                $spend = array_sum(array_column($p['daily'], 'spend'));
                $leads = array_sum(array_column($p['daily'], 'leads'));
                $rev = array_sum(array_column($p['daily'], 'revenue'));
                $out[] = sprintf('- %s: spend=%.2f, leads=%.1f, CPL=%s, ROAS=%s, campaigns=%d', $label, $spend, $leads,
                    $leads > 0 ? number_format($spend / $leads, 2) : 'n/a',
                    $spend > 0 ? number_format($rev / $spend, 2).'x' : 'n/a', count($p['campaigns']));
            } else {
                $out[] = "- {$label}: tidak ada data (belum tersambung atau belum dimuat)";
            }
        }

        foreach (['instagram', 'facebook', 'tiktok', 'youtube'] as $key) {
            $p = Cache::get($period->cacheKey("content:{$key}"));
            $out[] = is_array($p)
                ? sprintf('- %s: followers=%d, reach=%d, engagements=%d', $p['label'], $p['followers'], $p['reach'], $p['engagements'])
                : "- {$key}: tidak ada data (belum tersambung atau belum dimuat)";
        }

        return implode("\n", $out);
    }
}
