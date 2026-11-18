<?php

namespace App\Services\Marketing;

use App\Http\Controllers\Api\Ai\BusinessProfileController;
use App\Http\Controllers\Api\Ai\SeoController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Throwable;

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

        $metaAccountKey = 'default';
        try {
            $metaAccountKey = app(MetaAdsClient::class)->accountId() ?: 'default';
        } catch (Throwable) {
        }

        $metaCached = Cache::get($period->cacheKey("ads:meta:{$metaAccountKey}")) ?? Cache::get($period->cacheKey('ads:meta'));
        $googleCached = Cache::get($period->cacheKey('ads:google'));

        foreach (['Meta Ads (Periode)' => $metaCached, 'Google Ads (Periode)' => $googleCached] as $label => $p) {
            if (is_array($p)) {
                $spend = array_sum(array_column($p['daily'] ?? [], 'spend'));
                $leads = array_sum(array_column($p['daily'] ?? [], 'leads'));
                $rev = array_sum(array_column($p['daily'] ?? [], 'revenue'));
                $out[] = sprintf('- %s: spend=%.2f, leads=%.1f, CPL=%s, ROAS=%s, campaigns=%d', $label, $spend, $leads,
                    $leads > 0 ? number_format($spend / $leads, 2) : 'n/a',
                    $spend > 0 ? number_format($rev / $spend, 2).'x' : 'n/a', count($p['campaigns'] ?? []));
            } else {
                $out[] = "- {$label}: tidak ada data (belum tersambung atau belum dimuat)";
            }
        }

        $metaLife = Cache::get("ads:meta:lifetime:{$metaAccountKey}");
        if (is_array($metaLife) && ($metaLife['status'] ?? null) === 'ok') {
            $out[] = sprintf(
                '- Meta Ads / IG Boost ALL-TIME (%s): total spend=%s %s, reach=%d, impressions=%d, clicks=%d, leads=%.1f, rentang=%s s/d %s, total campaigns=%d',
                $metaLife['accountId'] ?? $metaAccountKey,
                number_format((float) ($metaLife['spend'] ?? 0), 0, ',', '.'),
                $metaLife['currency'] ?? 'IDR',
                (int) ($metaLife['reach'] ?? 0),
                (int) ($metaLife['impressions'] ?? 0),
                (int) ($metaLife['clicks'] ?? 0),
                (float) ($metaLife['leads'] ?? 0),
                $metaLife['dateStart'] ?? 'n/a',
                $metaLife['dateStop'] ?? 'n/a',
                count($metaLife['campaigns'] ?? [])
            );
        }

        foreach (['instagram', 'facebook', 'tiktok', 'youtube'] as $key) {
            $p = Cache::get($period->cacheKey("content:{$key}"));
            $out[] = is_array($p)
                ? sprintf('- %s: followers=%d, reach=%d, engagements=%d', $p['label'], $p['followers'], $p['reach'], $p['engagements'])
                : "- {$key}: tidak ada data (belum tersambung atau belum dimuat)";
        }

        $out[] = $this->searchConsoleLine($period);
        $out[] = $this->localSeoLine($period);
        $out[] = $this->internalLivoraLine($period);

        return implode("\n", $out);
    }

    private function internalLivoraLine(MarketingPeriod $period): string
    {
        $from = $period->fromDate().' 00:00:00';
        $to = $period->toDate().' 23:59:59';

        $clicks = Schema::hasTable('item_clicks') ? DB::table('item_clicks')->whereBetween('clicked_at', [$from, $to])->count() : 0;
        $views = Schema::hasTable('item_views') ? DB::table('item_views')->whereBetween('viewed_at', [$from, $to])->count() : 0;
        $consults = Schema::hasTable('consultations') ? DB::table('consultations')->whereBetween('created_at', [$from, $to])->count() : 0;
        $wishlists = Schema::hasTable('wishlists') ? DB::table('wishlists')->whereBetween('created_at', [$from, $to])->count() : 0;
        $waInquiries = Schema::hasTable('wa_price_inquiries') ? DB::table('wa_price_inquiries')->whereBetween('created_at', [$from, $to])->count() : 0;
        $waPending = Schema::hasTable('wa_price_inquiries') ? DB::table('wa_price_inquiries')->where('status', 'pending')->count() : 0;
        $orders = Schema::hasTable('shop_orders') ? DB::table('shop_orders')->whereBetween('created_at', [$from, $to])->count() : 0;
        $promoItems = Schema::hasTable('items') && Schema::hasColumn('items', 'is_on_promo')
            ? DB::table('items')->where('is_on_promo', true)->count() : 0;

        return sprintf(
            '- Internal Livora (DB %s s/d %s): views=%d, clicks=%d, wishlist=%d, konsultasi=%d, WA cek harga=%d (pending=%d), shop orders=%d, promo items aktif=%d',
            $period->fromDate(),
            $period->toDate(),
            $views,
            $clicks,
            $wishlists,
            $consults,
            $waInquiries,
            $waPending,
            $orders,
            $promoItems
        );
    }

    /**
     * Search Console dan Business Profile punya cache sendiri (dikelola
     * SeoController/BusinessProfileController). Kita panggil controller-nya
     * lewat container supaya cache & TTL-nya dipakai ulang — chat tidak
     * pernah menembak API Google sendiri di luar jalur itu.
     */
    private function summaryVia(string $controller, string $method, int $days): ?array
    {
        try {
            $response = app($controller)->{$method}(Request::create('/', 'GET', ['days' => $days]));
            $data = json_decode($response->getContent(), true);

            return is_array($data) ? $data : null;
        } catch (Throwable) {
            return null;
        }
    }

    private function searchConsoleLine(MarketingPeriod $period): string
    {
        $days = max(7, min($period->days(), 90));
        $data = $this->summaryVia(SeoController::class, 'searchConsoleSummary', $days);

        if (! is_array($data) || ! ($data['connected'] ?? false)) {
            return '- Search Console (SEO): belum tersambung ke akun Google';
        }
        if (! ($data['hasData'] ?? false) || ! is_array($data['totals'] ?? null)) {
            return '- Search Console (SEO): tersambung, tapi belum ada data ('.($data['message'] ?? 'tidak ada detail').')';
        }

        $t = $data['totals'];

        return sprintf(
            '- Search Console (SEO, %d hari, %s): clicks=%d, impressions=%d, CTR=%s%%, posisi rata-rata=%s',
            $days,
            $data['siteUrl'] ?? 'property tidak diketahui',
            (int) $t['clicks'],
            (int) $t['impressions'],
            $t['ctr'],
            $t['position']
        );
    }

    private function localSeoLine(MarketingPeriod $period): string
    {
        $days = max(7, min($period->days(), 90));
        $data = $this->summaryVia(BusinessProfileController::class, 'localSummary', $days);

        if (! is_array($data) || ! ($data['connected'] ?? false)) {
            return '- Google Business Profile (Local SEO): belum tersambung';
        }
        if (! ($data['hasData'] ?? false) || ! is_array($data['totals'] ?? null)) {
            return '- Google Business Profile (Local SEO): tersambung, tapi belum ada data ('.($data['message'] ?? 'tidak ada detail').')';
        }

        $t = $data['totals'];
        $listing = is_array($data['listing'] ?? null) ? ($data['listing']['title'] ?? null) : null;

        return sprintf(
            '- Google Business Profile (Local SEO, %d hari%s): map views=%d, permintaan rute=%d, telepon=%d, rating=%s, jumlah review=%s',
            $days,
            $listing ? ', listing '.$listing : '',
            (int) $t['mapViews'],
            (int) $t['directionRequests'],
            (int) $t['calls'],
            $t['averageRating'] ?? 'n/a',
            $t['totalReviewCount'] ?? 'n/a'
        );
    }
}
