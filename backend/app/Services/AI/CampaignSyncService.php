<?php

namespace App\Services\AI;

use App\Models\AiCampaign;
use App\Models\AiRecommendation;
use App\Services\Marketing\GoogleAdsClient;
use App\Services\Marketing\MarketingPeriod;
use App\Services\Marketing\MetaAdsClient;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Throwable;

/**
 * Menyinkronkan workspace `ai_campaigns` dari sumber kampanye nyata milik Livora:
 *  - Meta Ads campaigns (kalau tersambung)
 *  - Google Ads campaigns (kalau tersambung)
 *  - Email Marketing campaigns (`marketing_campaigns`)
 *  - Active Promo Showcase (`/promo` banners & item promo aktif)
 *  - Rencana kampanye yang lahir dari rekomendasi Ads/Content Agent
 */
class CampaignSyncService
{
    public function __construct(
        private MetaAdsClient $metaAds,
        private GoogleAdsClient $googleAds,
    ) {
    }

    public function syncIfStale(int $ttlMinutes = 10): void
    {
        if (Cache::has('ai:campaigns:synced_at')) {
            return;
        }

        $this->sync();
        Cache::put('ai:campaigns:synced_at', now()->toIso8601String(), now()->addMinutes($ttlMinutes));
    }

    /** @return int jumlah campaign aktif/tercatat setelah sync */
    public function sync(): int
    {
        $period = MarketingPeriod::fromRequest(new Request(['days' => 30]), 30);
        $count = 0;

        // 1. Meta Ads campaigns
        if ($this->metaAds->isConfigured()) {
            try {
                foreach ($this->metaAds->campaigns($period) as $c) {
                    $spend = (float) ($c['spend'] ?? 0);
                    $leads = (float) ($c['leads'] ?? 0);
                    $cpl = $leads > 0 ? round($spend / $leads, 0) : null;
                    $rawStatus = strtoupper((string) ($c['status'] ?? 'ACTIVE'));
                    $status = $rawStatus === 'ACTIVE' ? 'Active' : ($rawStatus === 'PAUSED' ? 'Paused' : 'Ended');
                    $health = $leads > 0 ? 'Good' : ($spend > 0 ? 'Needs Attention' : 'Fair');

                    $this->upsertCampaign(
                        name: (string) ($c['name'] ?? 'Meta Campaign '.$c['id']),
                        channel: 'Meta Ads',
                        data: [
                            'health' => $health,
                            'status' => $status,
                            'summary' => "Campaign Meta Ads aktif 30 hari terakhir. Spend IDR ".number_format($spend, 0, ',', '.').", leads {$leads}.",
                            'budget_daily' => isset($c['daily_budget']) && $c['daily_budget'] !== null
                                ? 'IDR '.number_format((float) $c['daily_budget'], 0, ',', '.')
                                : null,
                            'goals' => [
                                ['label' => 'Leads 30d', 'target' => '≥ 10', 'current' => (string) $leads, 'onTrack' => $leads >= 5],
                                ['label' => 'Cost per Lead', 'target' => 'Efisien', 'current' => $cpl ? 'IDR '.number_format($cpl, 0, ',', '.') : 'Belum ada lead', 'onTrack' => $leads > 0],
                            ],
                            'metric' => [
                                'label' => 'Cost per Lead (30d)',
                                'value' => $cpl ? 'IDR '.number_format($cpl, 0, ',', '.') : 'IDR '.number_format($spend, 0, ',', '.').' spent',
                                'deltaLabel' => "{$leads} leads · {$c['clicks']} clicks",
                                'deltaDirection' => $leads > 0 ? 'up' : 'flat',
                            ],
                        ]
                    );
                    $count++;
                }
            } catch (Throwable) {
                // Non-fatal: platform lain tetap disinkronkan
            }
        }

        // 2. Google Ads campaigns
        if ($this->googleAds->isConfigured()) {
            try {
                foreach ($this->googleAds->campaigns($period) as $c) {
                    $spend = (float) ($c['spend'] ?? 0);
                    $leads = (float) ($c['leads'] ?? 0);
                    $rawStatus = strtoupper((string) ($c['status'] ?? 'ENABLED'));
                    $status = $rawStatus === 'ENABLED' ? 'Active' : ($rawStatus === 'PAUSED' ? 'Paused' : 'Ended');
                    $health = $leads > 0 ? 'Good' : ($spend > 0 ? 'Needs Attention' : 'Fair');

                    $this->upsertCampaign(
                        name: (string) ($c['name'] ?? 'Google Ads Campaign'),
                        channel: 'Google Ads',
                        data: [
                            'health' => $health,
                            'status' => $status,
                            'summary' => "Campaign Google Ads 30 hari terakhir. Spend IDR ".number_format($spend, 0, ',', '.').", konversi {$leads}.",
                            'goals' => [
                                ['label' => 'Conversions 30d', 'target' => '≥ 5', 'current' => (string) $leads, 'onTrack' => $leads >= 3],
                            ],
                            'metric' => [
                                'label' => 'Conversions (30d)',
                                'value' => (string) $leads,
                                'deltaLabel' => 'Spend IDR '.number_format($spend, 0, ',', '.'),
                                'deltaDirection' => $leads > 0 ? 'up' : 'flat',
                            ],
                        ]
                    );
                    $count++;
                }
            } catch (Throwable) {
            }
        }

        // 3. Active Promo Banners + Item Promo Showcase
        if (Schema::hasTable('promo_banners')) {
            $activeBanners = DB::table('promo_banners')->where('is_active', true)->orderBy('order_index')->limit(5)->get();
            $promoItemsCount = Schema::hasTable('items') && Schema::hasColumn('items', 'is_on_promo')
                ? DB::table('items')->where('is_on_promo', true)->count()
                : 0;

            foreach ($activeBanners as $banner) {
                $promoViews = Schema::hasTable('funnel_events')
                    ? DB::table('funnel_events')->whereIn('event', ['view_promo', 'promo_cta_click'])
                        ->where('created_at', '>=', now()->subDays(30))->count()
                    : 0;

                $this->upsertCampaign(
                    name: 'Promo Showcase: '.$banner->title,
                    channel: 'Website Promo & WhatsApp',
                    data: [
                        'health' => $promoItemsCount > 0 ? 'Good' : 'Fair',
                        'status' => 'Active',
                        'summary' => ($banner->subtitle ?: $banner->label ?: 'Promo aktif Livora')." — {$promoItemsCount} item promo terdaftar di katalog.",
                        'goals' => [
                            ['label' => 'Promo items aktif', 'target' => '≥ 3 items', 'current' => "{$promoItemsCount} items", 'onTrack' => $promoItemsCount > 0],
                            ['label' => 'Interaksi Promo (30d)', 'target' => 'Tracking aktif', 'current' => "{$promoViews} events", 'onTrack' => $promoViews > 0],
                        ],
                        'plan' => [
                            ['id' => 'p1', 'label' => 'Tayangkan Promo Banner & Float Modal di Landing Page', 'state' => 'done'],
                            ['id' => 'p2', 'label' => 'Tandai item unggulan sebagai promo di /promo', 'state' => $promoItemsCount > 0 ? 'done' : 'active'],
                            ['id' => 'p3', 'label' => 'Distribusi ke Email Blast & LiviBot WhatsApp', 'state' => 'upcoming'],
                        ],
                        'metric' => [
                            'label' => 'Promo Catalog Items',
                            'value' => (string) $promoItemsCount,
                            'deltaLabel' => "{$promoViews} promo events (30d)",
                            'deltaDirection' => $promoItemsCount > 0 ? 'up' : 'flat',
                        ],
                    ]
                );
                $count++;
            }
        }

        // 4. Email Marketing campaigns
        if (Schema::hasTable('marketing_campaigns')) {
            $emailCampaigns = DB::table('marketing_campaigns')->orderByDesc('created_at')->limit(5)->get();
            foreach ($emailCampaigns as $ec) {
                $status = match ($ec->status) {
                    'sent' => 'Ended',
                    'scheduled' => 'Active',
                    default => 'Draft',
                };
                $this->upsertCampaign(
                    name: 'Email: '.($ec->campaign_name ?: $ec->subject),
                    channel: 'Email Marketing',
                    data: [
                        'health' => ($ec->sent_count ?? 0) > 0 ? 'Good' : 'Fair',
                        'status' => $status,
                        'summary' => "Subject: {$ec->subject} — status {$ec->status}.",
                        'metric' => [
                            'label' => 'Emails Delivered',
                            'value' => (string) ($ec->sent_count ?? 0),
                            'deltaLabel' => $ec->sent_at ? 'Sent '.substr((string) $ec->sent_at, 0, 10) : 'Draft ready',
                            'deltaDirection' => ($ec->sent_count ?? 0) > 0 ? 'up' : 'flat',
                        ],
                    ]
                );
                $count++;
            }
        }

        // 5. Conversion Funnel Recovery Program (konsultasi & WA price inquiry internal Livora)
        $consultTotal = Schema::hasTable('consultations') ? DB::table('consultations')->count() : 0;
        $waTotal = Schema::hasTable('wa_price_inquiries') ? DB::table('wa_price_inquiries')->count() : 0;
        if ($consultTotal > 0 || $waTotal > 0) {
            $pendingConsult = DB::table('consultations')->where('status', 'new_inquiry')->count();
            $pendingWa = Schema::hasTable('wa_price_inquiries')
                ? DB::table('wa_price_inquiries')->where('status', 'pending')->count()
                : 0;
            $health = ($pendingConsult + $pendingWa) > 5 ? 'Needs Attention' : 'Good';
            $relatedRecs = AiRecommendation::whereIn('agent_key', ['cro', 'leads'])
                ->latest()->limit(5)->pluck('id')->map(fn ($id) => (string) $id)->values()->all();

            $this->upsertCampaign(
                name: 'Livora Lead & LiviBot Conversion Funnel',
                channel: 'Consultations & WhatsApp',
                data: [
                    'health' => $health,
                    'status' => 'Active',
                    'summary' => "{$consultTotal} konsultasi & {$waTotal} cek harga WA LiviBot tercatat. Antrean menunggu balasan: {$pendingConsult} konsultasi, {$pendingWa} WA inquiry.",
                    'goals' => [
                        ['label' => 'New Inquiries Waiting', 'target' => '0 stalled', 'current' => (string) $pendingConsult, 'onTrack' => $pendingConsult <= 2],
                        ['label' => 'Pending WA Price Inquiries', 'target' => '< 2 open', 'current' => (string) $pendingWa, 'onTrack' => $pendingWa <= 2],
                    ],
                    'plan' => [
                        ['id' => 'f1', 'label' => 'Audit drop-off konsultasi via CRO Agent', 'state' => 'done'],
                        ['id' => 'f2', 'label' => 'Skor Lead High-Intent (Wishlist + WA + Views)', 'state' => 'active'],
                        ['id' => 'f3', 'label' => 'Otomatisasi follow-up WhatsApp & Email', 'state' => 'upcoming'],
                    ],
                    'related_recommendation_ids' => $relatedRecs,
                    'metric' => [
                        'label' => 'Total Funnel Leads',
                        'value' => (string) ($consultTotal + $waTotal),
                        'deltaLabel' => "{$pendingConsult} consult + {$pendingWa} WA pending",
                        'deltaDirection' => $health === 'Good' ? 'up' : 'down',
                    ],
                ]
            );
            $count++;
        }

        return $count;
    }

    private function upsertCampaign(string $name, string $channel, array $data): void
    {
        $existing = AiCampaign::where('name', $name)->where('channel', $channel)->first();
        $payload = array_merge([
            'health' => 'Fair',
            'status' => 'Active',
            'summary' => '',
            'goals' => [],
            'plan' => [],
            'active_experiments' => [],
            'related_recommendation_ids' => [],
            'spark' => [],
        ], $data);

        if ($existing) {
            $existing->update($payload);
        } else {
            AiCampaign::create(['name' => $name, 'channel' => $channel] + $payload);
        }
    }
}
