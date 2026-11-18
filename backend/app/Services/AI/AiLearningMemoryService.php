<?php

namespace App\Services\AI;

use App\Models\AiImpactRecord;
use App\Models\AiRecommendation;
use App\Models\AiSetting;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Throwable;

/**
 * Otak Pembelajaran Adaptif & Grounding Profit Nyata untuk Livora AI Marketing.
 *
 * 1) Membaca sinyal bisnis & profit nyata dari seluruh tabel Livora:
 *    - shop_orders & shop_order_items (omzet terealisasi, AOV, pipeline order belum bayar, produk terlaris)
 *    - consultations (pipeline proyek interior high-ticket per stage, estimasi area, sumber UTM)
 *    - wa_price_inquiries (prospek panas LiviBot WhatsApp yang tanya harga produk)
 *    - items, projects, promo_banners, wishlists, item_views, item_clicks
 * 2) Mengekstrak pembelajaran (Self-Learning Loop) dari:
 *    - ai_impact_records (aksi mana yang terbukti positif menaikkan metrik vs negatif)
 *    - pola persetujuan/penolakan admin pada ai_recommendations
 *    - aturan strategi & fokus profit yang diajarkan admin (disimpan di AiSetting 'ai_learning_rules')
 */
class AiLearningMemoryService
{
    private const SETTING_KEY = 'ai_learning_rules';
    private const IG_BOOST_KEY = 'ai_ig_boost_entries_v1';

    /**
     * Ringkasan lengkap bisnis, profit, kebocoran konversi, dan memori pembelajaran AI.
     *
     * @return array<string, mixed>
     */
    public function summary(int $days = 30): array
    {
        $profit = $this->profitAndBusinessGrounding($days);
        $memory = $this->learningMemorySnapshot();
        $roi = $this->roiAndRoasAttribution($days, 0.0, 0.0, 0.0, 0, 0, $profit);

        return [
            'generatedAt' => now()->toIso8601String(),
            'periodDays' => $days,
            'profitGrounding' => $profit,
            'learningMemory' => $memory,
            'roiAttribution' => $roi,
        ];
    }

    /**
     * Ambil daftar catatan biaya Instagram Boost (baik dari IG App langsung maupun manual).
     *
     * @return array<int, array{id: string, title: string, spendRp: float, date: string, reach: int, clicks: int, leads: int, notes: ?string, createdAt: string}>
     */
    public function getIgBoostEntries(): array
    {
        try {
            if (! Schema::hasTable('ai_settings')) {
                return [];
            }

            $raw = AiSetting::get(self::IG_BOOST_KEY);
            if (! is_string($raw) || trim($raw) === '') {
                return [];
            }

            $decoded = json_decode($raw, true);

            return is_array($decoded) ? array_values(array_filter($decoded, 'is_array')) : [];
        } catch (Throwable) {
            return [];
        }
    }

    /**
     * Catat biaya Instagram Boost baru untuk perhitungan ROI & ROAS nyata.
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function addIgBoostEntry(array $data): array
    {
        $entries = $this->getIgBoostEntries();
        $title = trim((string) ($data['title'] ?? 'Instagram Boost Post'));
        if ($title === '') {
            $title = 'Instagram Boost Post';
        }

        $spendRp = max(0.0, (float) ($data['spendRp'] ?? $data['spend_rp'] ?? $data['spend'] ?? 0));
        $date = trim((string) ($data['date'] ?? now()->toDateString()));
        if (! preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
            $date = now()->toDateString();
        }

        $entry = [
            'id' => 'igb_'.now()->format('YmdHis').'_'.substr(md5($title.$spendRp.$date), 0, 5),
            'title' => mb_substr($title, 0, 160),
            'spendRp' => round($spendRp, 0),
            'date' => $date,
            'reach' => max(0, (int) ($data['reach'] ?? 0)),
            'clicks' => max(0, (int) ($data['clicks'] ?? 0)),
            'leads' => max(0, (int) ($data['leads'] ?? 0)),
            'notes' => isset($data['notes']) && is_string($data['notes']) && trim($data['notes']) !== ''
                ? mb_substr(trim($data['notes']), 0, 300)
                : null,
            'createdAt' => now()->toIso8601String(),
        ];

        array_unshift($entries, $entry);
        $entries = array_slice($entries, 0, 60);
        $this->saveIgBoostEntries($entries);

        return $entry;
    }

    public function removeIgBoostEntry(string $id): bool
    {
        $entries = $this->getIgBoostEntries();
        $filtered = array_values(array_filter($entries, fn ($e) => ($e['id'] ?? '') !== $id));
        $this->saveIgBoostEntries($filtered);

        return count($filtered) < count($entries);
    }

    /**
     * @param  array<int, array<string, mixed>>  $entries
     */
    private function saveIgBoostEntries(array $entries): void
    {
        try {
            if (Schema::hasTable('ai_settings')) {
                AiSetting::set(self::IG_BOOST_KEY, json_encode(array_values($entries), JSON_UNESCAPED_UNICODE));
            }
        } catch (Throwable) {
            // ignore storage failure
        }
    }

    /**
     * Hitung True ROI (%) & Blended ROAS Livora dengan menggabungkan:
     * - Spend dari Meta/Google Ads API + Spend dari Instagram Boost App
     * - Omzet Shop Real (Lunas + Pipeline Order) + Nilai Produk yang Ditanyakan di WA LiviBot
     * - Cost per Consultation & Cost per WA Inquiry
     *
     * @param  array<string, mixed>|null  $precomputedProfit
     * @return array<string, mixed>
     */
    public function roiAndRoasAttribution(
        int $days = 30,
        float $apiSpendRp = 0.0,
        float $apiPlatformRevenueRp = 0.0,
        float $apiLeads = 0.0,
        int $apiClicks = 0,
        int $apiImpressions = 0,
        ?array $precomputedProfit = null
    ): array {
        $profit = $precomputedProfit ?? $this->profitAndBusinessGrounding($days);
        $fromDate = now()->subDays(max(1, $days) - 1)->toDateString();
        $toDate = now()->toDateString();

        $allBoosts = $this->getIgBoostEntries();
        $periodBoosts = array_values(array_filter($allBoosts, function ($b) use ($fromDate, $toDate) {
            $d = (string) ($b['date'] ?? '');

            return $d === '' || ($d >= $fromDate && $d <= $toDate);
        }));

        $igBoostManualSpendRp = 0.0;
        $igBoostManualLeads = 0;
        $igBoostManualClicks = 0;
        $igBoostManualReach = 0;

        foreach ($periodBoosts as $b) {
            $igBoostManualSpendRp += (float) ($b['spendRp'] ?? 0);
            $igBoostManualLeads += (int) ($b['leads'] ?? 0);
            $igBoostManualClicks += (int) ($b['clicks'] ?? 0);
            $igBoostManualReach += (int) ($b['reach'] ?? 0);
        }

        $totalSpendRp = round($apiSpendRp + $igBoostManualSpendRp, 0);

        $orders = $profit['ordersAndRevenue'] ?? [];
        $paidRevenueRp = (float) ($orders['paidRevenueRp'] ?? 0);
        $pipelineOrderRevenueRp = (float) ($orders['pipelineValueRp'] ?? 0);
        $grossShopOrderRevenueRp = $paidRevenueRp + $pipelineOrderRevenueRp;

        $wa = $profit['whatsappLiviBot'] ?? [];
        $waInquiredValueRp = (float) ($wa['inquiredValueRp'] ?? 0);
        $waInquiriesCount = (int) ($wa['totalPeriod'] ?? 0);

        $consults = $profit['consultationsPipeline'] ?? [];
        $consultationsCount = (int) ($consults['totalPeriod'] ?? 0);

        // Total nilai bisnis yang digerakkan: order shop + nilai produk yang ditanyakan di WA LiviBot
        $totalPipelineAndRevenueRp = $grossShopOrderRevenueRp + $waInquiredValueRp;

        $platformRoas = $totalSpendRp > 0 && $apiPlatformRevenueRp > 0
            ? round($apiPlatformRevenueRp / $totalSpendRp, 2)
            : null;
        $realShopRoas = $totalSpendRp > 0
            ? round($grossShopOrderRevenueRp / $totalSpendRp, 2)
            : null;
        $blendedPipelineRoas = $totalSpendRp > 0
            ? round($totalPipelineAndRevenueRp / $totalSpendRp, 2)
            : null;

        $realShopRoiPct = $totalSpendRp > 0
            ? round((($grossShopOrderRevenueRp - $totalSpendRp) / $totalSpendRp) * 100, 1)
            : null;
        $blendedPipelineRoiPct = $totalSpendRp > 0
            ? round((($totalPipelineAndRevenueRp - $totalSpendRp) / $totalSpendRp) * 100, 1)
            : null;

        $effectiveRoas = ($realShopRoas !== null && $realShopRoas > 0)
            ? $realShopRoas
            : (($blendedPipelineRoas !== null && $blendedPipelineRoas > 0) ? $blendedPipelineRoas : $platformRoas);

        $effectiveRoiPct = ($grossShopOrderRevenueRp > 0 && $realShopRoiPct !== null)
            ? $realShopRoiPct
            : $blendedPipelineRoiPct;

        $totalRealLeads = max((float) ($apiLeads + $igBoostManualLeads), (float) ($consultationsCount + $waInquiriesCount));
        $realCplRp = ($totalSpendRp > 0 && $totalRealLeads > 0)
            ? round($totalSpendRp / $totalRealLeads, 0)
            : null;
        $costPerConsultationRp = ($totalSpendRp > 0 && $consultationsCount > 0)
            ? round($totalSpendRp / $consultationsCount, 0)
            : null;
        $costPerWaLeadRp = ($totalSpendRp > 0 && $waInquiriesCount > 0)
            ? round($totalSpendRp / $waInquiriesCount, 0)
            : null;

        if ($totalSpendRp <= 0) {
            $verdict = 'Belum Ada Data Biaya Boost';
            $tone = 'neutral';
            $explanation = 'Belum ada biaya iklan dari Meta Ads API maupun catatan Boost Instagram pada periode ini. Tambahkan biaya Boost IG Anda di panel kalkulator atau hubungkan Ad Account yang aktif melakukan Boost.';
        } elseif (($effectiveRoas ?? 0) >= 3.0) {
            $verdict = 'Sangat Profitabel (High ROAS)';
            $tone = 'success';
            $explanation = sprintf(
                'Biaya iklan/Boost Rp %s menghasilkan nilai omzet & pipeline Rp %s (ROAS %sx, ROI %s%%). Pertahankan konten & audiens dengan konversi WA/konsultasi tertinggi.',
                number_format($totalSpendRp, 0, ',', '.'),
                number_format($totalPipelineAndRevenueRp, 0, ',', '.'),
                (string) $effectiveRoas,
                (string) ($effectiveRoiPct ?? 0)
            );
        } elseif (($effectiveRoas ?? 0) >= 1.0) {
            $verdict = 'Positif / Menutup Modal (Break-Even+)';
            $tone = 'info';
            $explanation = sprintf(
                'Biaya Boost Rp %s menggerakkan nilai bisnis Rp %s (ROAS %sx, ROI %s%%). Percepat follow-up %d prospek WA LiviBot & %d konsultasi agar pipeline berubah menjadi pembayaran lunas.',
                number_format($totalSpendRp, 0, ',', '.'),
                number_format($totalPipelineAndRevenueRp, 0, ',', '.'),
                (string) $effectiveRoas,
                (string) ($effectiveRoiPct ?? 0),
                $waInquiriesCount,
                $consultationsCount
            );
        } else {
            $verdict = 'Perlu Optimasi Konversi Funnel';
            $tone = 'warning';
            $explanation = sprintf(
                'Biaya Boost Rp %s baru menghasilkan nilai terukur Rp %s. Arahkan tombol CTA Instagram Boost langsung ke WhatsApp LiviBot atau halaman produk high-demand agar trafik tidak berhenti di kunjungan profil.',
                number_format($totalSpendRp, 0, ',', '.'),
                number_format($totalPipelineAndRevenueRp, 0, ',', '.')
            );
        }

        return [
            'periodDays' => $days,
            'fromDate' => $fromDate,
            'toDate' => $toDate,
            'metaApiSpendRp' => round($apiSpendRp, 0),
            'igBoostManualSpendRp' => round($igBoostManualSpendRp, 0),
            'totalSpendRp' => $totalSpendRp,
            'paidShopRevenueRp' => round($paidRevenueRp, 0),
            'pipelineOrderRevenueRp' => round($pipelineOrderRevenueRp, 0),
            'grossShopOrderRevenueRp' => round($grossShopOrderRevenueRp, 0),
            'waInquiredValueRp' => round($waInquiredValueRp, 0),
            'totalAttributedValueRp' => round($totalPipelineAndRevenueRp, 0),
            'platformRoas' => $platformRoas,
            'realShopRoas' => $realShopRoas,
            'blendedPipelineRoas' => $blendedPipelineRoas,
            'effectiveRoas' => $effectiveRoas,
            'realShopRoiPct' => $realShopRoiPct,
            'blendedPipelineRoiPct' => $blendedPipelineRoiPct,
            'effectiveRoiPct' => $effectiveRoiPct,
            'consultationsCount' => $consultationsCount,
            'waInquiriesCount' => $waInquiriesCount,
            'totalRealLeads' => $totalRealLeads,
            'realCplRp' => $realCplRp,
            'costPerConsultationRp' => $costPerConsultationRp,
            'costPerWaLeadRp' => $costPerWaLeadRp,
            'verdict' => $verdict,
            'tone' => $tone,
            'explanation' => $explanation,
            'igBoostEntries' => $periodBoosts,
            'allIgBoostEntries' => array_slice($allBoosts, 0, 20),
        ];
    }

    /**
     * Tambah aturan/pembelajaran baru ke memori persisten AI.
     *
     * @return array{id: string, rule: string, category: string, source: string, createdAt: string}
     */
    public function addRule(string $rule, string $category = 'profit_focus', string $source = 'admin'): array
    {
        $rules = $this->getRules();
        $cleanRule = trim($rule);

        foreach ($rules as $existing) {
            if (mb_strtolower($existing['rule'] ?? '') === mb_strtolower($cleanRule)) {
                return $existing;
            }
        }

        $entry = [
            'id' => 'learn_'.now()->format('YmdHis').'_'.substr(md5($cleanRule), 0, 6),
            'rule' => mb_substr($cleanRule, 0, 500),
            'category' => in_array($category, ['profit_focus', 'brand_voice', 'target_audience', 'channel_strategy', 'empirical_win', 'empirical_avoid'], true)
                ? $category
                : 'profit_focus',
            'source' => $source,
            'createdAt' => now()->toIso8601String(),
        ];

        array_unshift($rules, $entry);
        $rules = array_slice($rules, 0, 30);

        $this->saveRules($rules);

        return $entry;
    }

    public function removeRule(string $id): bool
    {
        $rules = $this->getRules();
        $filtered = array_values(array_filter($rules, fn ($r) => ($r['id'] ?? '') !== $id));

        $this->saveRules($filtered);

        return count($filtered) < count($rules);
    }

    /**
     * @return array<int, array{id: string, rule: string, category: string, source: string, createdAt: string}>
     */
    public function getRules(): array
    {
        try {
            if (! Schema::hasTable('ai_settings')) {
                return [];
            }

            $raw = AiSetting::get(self::SETTING_KEY);
            if (! is_string($raw) || trim($raw) === '') {
                return [];
            }

            $decoded = json_decode($raw, true);

            return is_array($decoded) ? array_values(array_filter($decoded, 'is_array')) : [];
        } catch (Throwable) {
            return [];
        }
    }

    /**
     * @param  array<int, array<string, mixed>>  $rules
     */
    private function saveRules(array $rules): void
    {
        try {
            if (Schema::hasTable('ai_settings')) {
                AiSetting::set(self::SETTING_KEY, json_encode(array_values($rules), JSON_UNESCAPED_UNICODE));
            }
        } catch (Throwable) {
            // ignore storage failure so requests never 500
        }
    }

    /**
     * Otomatis menyerap pembelajaran baru dari hasil pengukuran ImpactTrackerService.
     */
    public function syncFromImpact(): int
    {
        try {
            if (! Schema::hasTable('ai_impact_records')) {
                return 0;
            }

            $added = 0;
            $records = AiImpactRecord::query()
                ->whereIn('result', ['positive', 'negative'])
                ->orderByDesc('updated_at')
                ->limit(15)
                ->get();

            foreach ($records as $r) {
                $changeArr = is_array($r->change_pct) ? $r->change_pct : [];
                $pct = $changeArr['30'] ?? $changeArr['14'] ?? $changeArr['7'] ?? null;
                if ($pct === null) {
                    continue;
                }
                $numPct = (float) $pct;
                if ($r->result === 'positive' && $numPct >= 10) {
                    $this->addRule(
                        "[TERBUKTI POSITIF +{$numPct}%] Aksi {$r->agent_key} \"{$r->title}\" meningkatkan {$r->metric_label}. Prioritaskan pola serupa.",
                        'empirical_win',
                        'impact_tracker'
                    );
                    $added++;
                } elseif ($r->result === 'negative' && $numPct <= -10) {
                    $this->addRule(
                        "[EVALUASI / HINDARI {$numPct}%] Aksi {$r->agent_key} \"{$r->title}\" menurunkan {$r->metric_label}. Ubah pendekatan/sudut copywriting.",
                        'empirical_avoid',
                        'impact_tracker'
                    );
                    $added++;
                }
            }

            return $added;
        } catch (Throwable) {
            return 0;
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function profitAndBusinessGrounding(int $days = 30): array
    {
        $since = now()->subDays(max(1, $days));

        // 1. Shop Orders & Real Revenue (Rupiah)
        $ordersSummary = [
            'paidOrdersCount' => 0,
            'paidRevenueRp' => 0,
            'pipelineOrdersCount' => 0,
            'pipelineValueRp' => 0,
            'avgOrderValueRp' => 0,
            'topSellingItems' => [],
        ];

        try {
            if (Schema::hasTable('shop_orders')) {
                $paidStatuses = ['dibayar', 'diproses', 'dikirim', 'selesai', 'paid', 'completed'];
                $pipelineStatuses = ['menunggu_wa', 'penawaran_dikirim', 'menunggu_pembayaran', 'menunggu_verifikasi'];

                $paidQuery = DB::table('shop_orders')
                    ->where('created_at', '>=', $since)
                    ->where(function ($q) use ($paidStatuses) {
                        $q->whereNotNull('paid_at')->orWhereIn('status', $paidStatuses);
                    });

                $paidCount = (int) (clone $paidQuery)->count();
                $paidRev = (int) (clone $paidQuery)->sum('grand_total');

                $pipeQuery = DB::table('shop_orders')
                    ->where('created_at', '>=', $since)
                    ->whereNull('paid_at')
                    ->whereIn('status', $pipelineStatuses);

                $pipeCount = (int) (clone $pipeQuery)->count();
                $pipeVal = (int) (clone $pipeQuery)->sum('grand_total');

                $ordersSummary['paidOrdersCount'] = $paidCount;
                $ordersSummary['paidRevenueRp'] = $paidRev;
                $ordersSummary['pipelineOrdersCount'] = $pipeCount;
                $ordersSummary['pipelineValueRp'] = $pipeVal;
                $ordersSummary['avgOrderValueRp'] = $paidCount > 0 ? (int) round($paidRev / $paidCount) : 0;

                if (Schema::hasTable('shop_order_items')) {
                    $topSold = DB::table('shop_order_items')
                        ->selectRaw('item_id, title, SUM(quantity) as total_qty, SUM((unit_price - unit_discount) * quantity) as total_rev')
                        ->where('created_at', '>=', $since)
                        ->groupBy('item_id', 'title')
                        ->orderByDesc('total_rev')
                        ->limit(6)
                        ->get();

                    $ordersSummary['topSellingItems'] = $topSold->map(fn ($r) => [
                        'itemId' => $r->item_id ? (int) $r->item_id : null,
                        'title' => (string) $r->title,
                        'qty' => (int) $r->total_qty,
                        'revenueRp' => (int) $r->total_rev,
                    ])->values()->all();
                }
            }
        } catch (Throwable) {
        }

        // 2. Consultations Pipeline (Proyek Interior & Arsitektur High-Ticket)
        $consultSummary = [
            'totalPeriod' => 0,
            'unrespondedNew' => 0,
            'activeHighIntent' => 0,
            'completedCount' => 0,
            'cancelledCount' => 0,
            'byStage' => [],
            'topServiceTypes' => [],
            'recentHighPriority' => [],
        ];

        try {
            if (Schema::hasTable('consultations')) {
                $consultSummary['totalPeriod'] = (int) DB::table('consultations')->where('created_at', '>=', $since)->count();
                $consultSummary['unrespondedNew'] = (int) DB::table('consultations')->where('status', 'new_inquiry')->count();
                $consultSummary['activeHighIntent'] = (int) DB::table('consultations')
                    ->whereIn('status', ['meeting_scheduled', 'in_progress', 'agreement_pending', 'dp_pending'])
                    ->count();
                $consultSummary['completedCount'] = (int) DB::table('consultations')
                    ->where('created_at', '>=', $since)
                    ->whereIn('status', ['project_paid', 'project_running', 'completed'])
                    ->count();
                $consultSummary['cancelledCount'] = (int) DB::table('consultations')
                    ->where('created_at', '>=', $since)
                    ->whereIn('status', ['cancelled', 'rejected', 'declined'])
                    ->count();

                $consultSummary['byStage'] = DB::table('consultations')
                    ->selectRaw('status, COUNT(*) as total')
                    ->groupBy('status')
                    ->pluck('total', 'status')
                    ->all();

                if (Schema::hasColumn('consultations', 'service_type')) {
                    $consultSummary['topServiceTypes'] = DB::table('consultations')
                        ->whereNotNull('service_type')
                        ->where('service_type', '!=', '')
                        ->selectRaw('service_type, COUNT(*) as total')
                        ->groupBy('service_type')
                        ->orderByDesc('total')
                        ->limit(5)
                        ->pluck('total', 'service_type')
                        ->all();
                }

                $recentConsults = DB::table('consultations')
                    ->whereIn('status', ['new_inquiry', 'under_review', 'contacted', 'meeting_scheduled', 'agreement_pending', 'dp_pending'])
                    ->orderByDesc('updated_at')
                    ->limit(6)
                    ->get();

                $consultSummary['recentHighPriority'] = $recentConsults->map(fn ($c) => [
                    'id' => (int) $c->id,
                    'name' => trim(($c->first_name ?? '').' '.($c->last_name ?? '')) ?: ($c->email ?? 'Lead'),
                    'status' => (string) $c->status,
                    'serviceType' => $c->service_type ?? null,
                    'area' => $c->estimated_area ?? null,
                    'phone' => $c->phone ?? null,
                ])->values()->all();
            }
        } catch (Throwable) {
        }

        // 3. WhatsApp LiviBot Price Inquiries
        $waSummary = [
            'totalPeriod' => 0,
            'pendingCount' => 0,
            'answeredCount' => 0,
            'inquiredValueRp' => 0,
            'pendingInquiries' => [],
        ];

        try {
            if (Schema::hasTable('wa_price_inquiries')) {
                $waSummary['totalPeriod'] = (int) DB::table('wa_price_inquiries')->where('created_at', '>=', $since)->count();
                $waSummary['pendingCount'] = (int) DB::table('wa_price_inquiries')->where('status', 'pending')->count();
                $waSummary['answeredCount'] = (int) DB::table('wa_price_inquiries')->where('status', 'answered')->count();

                // Hitung nilai katalog dari produk yang ditanyakan di WA selama periode ini
                $itemPriceById = [];
                $itemPriceByTitle = [];
                if (Schema::hasTable('items') && Schema::hasColumn('items', 'price')) {
                    $priceRows = DB::table('items')->select(['id', 'title', 'price'])->get();
                    foreach ($priceRows as $pr) {
                        $pVal = (float) ($pr->price ?? 0);
                        if ($pVal > 0) {
                            $itemPriceById[(int) $pr->id] = $pVal;
                            $itemPriceByTitle[mb_strtolower(trim((string) $pr->title))] = $pVal;
                        }
                    }
                }

                $periodWaRows = DB::table('wa_price_inquiries')
                    ->where('created_at', '>=', $since)
                    ->get(['items']);
                $inquiredVal = 0.0;
                foreach ($periodWaRows as $wRow) {
                    $arr = json_decode((string) ($wRow->items ?? '[]'), true) ?: [];
                    foreach ($arr as $it) {
                        $qty = max(1, (int) ($it['qty'] ?? $it['quantity'] ?? 1));
                        $unitPrice = (float) ($it['price'] ?? $it['final_price'] ?? 0);
                        if ($unitPrice <= 0 && ! empty($it['id']) && isset($itemPriceById[(int) $it['id']])) {
                            $unitPrice = $itemPriceById[(int) $it['id']];
                        }
                        if ($unitPrice <= 0 && ! empty($it['title'])) {
                            $tKey = mb_strtolower(trim((string) $it['title']));
                            $unitPrice = $itemPriceByTitle[$tKey] ?? 0.0;
                        }
                        $inquiredVal += ($unitPrice * $qty);
                    }
                }
                $waSummary['inquiredValueRp'] = (int) round($inquiredVal);

                $pendingRows = DB::table('wa_price_inquiries')
                    ->where('status', 'pending')
                    ->orderByDesc('created_at')
                    ->limit(6)
                    ->get();

                $waSummary['pendingInquiries'] = $pendingRows->map(function ($w) {
                    $items = json_decode($w->items ?? '[]', true) ?: [];
                    $titles = array_values(array_filter(array_map(fn ($i) => $i['title'] ?? null, $items)));
                    $phone = $w->phone ?? $w->customer_phone ?? null;

                    return [
                        'id' => (int) $w->id,
                        'customerName' => $w->customer_name ?? ($phone ? 'WA '.$phone : 'Prospek WA'),
                        'phone' => $phone,
                        'itemsAsked' => $titles,
                        'question' => $w->customer_question ?? null,
                        'createdAt' => (string) $w->created_at,
                    ];
                })->values()->all();
            }
        } catch (Throwable) {
        }

        // 4. Top Catalog Demand & High-Margin Products
        $catalogDemand = [
            'topItems' => [],
            'projects' => [],
            'activePromos' => [],
        ];

        try {
            if (Schema::hasTable('items')) {
                $clicksByItem = Schema::hasTable('item_clicks')
                    ? DB::table('item_clicks')
                        ->where('target_type', 'item')
                        ->where('clicked_at', '>=', $since)
                        ->selectRaw('target_id, COUNT(*) as c')
                        ->groupBy('target_id')
                        ->pluck('c', 'target_id')
                    : collect();

                $viewsByItem = Schema::hasTable('item_views')
                    ? DB::table('item_views')
                        ->where('target_type', 'item')
                        ->where('viewed_at', '>=', $since)
                        ->selectRaw('target_id, COUNT(*) as v')
                        ->groupBy('target_id')
                        ->pluck('v', 'target_id')
                    : collect();

                $wishByItem = Schema::hasTable('wishlists') && Schema::hasColumn('wishlists', 'wishlistable_id')
                    ? DB::table('wishlists')
                        ->where('created_at', '>=', $since)
                        ->selectRaw('wishlistable_id, COUNT(*) as w')
                        ->groupBy('wishlistable_id')
                        ->pluck('w', 'wishlistable_id')
                    : collect();

                $hasPrice = Schema::hasColumn('items', 'price');
                $hasFinalPrice = Schema::hasColumn('items', 'final_price');
                $hasPromo = Schema::hasColumn('items', 'is_on_promo');
                $cols = ['id', 'title'];
                if ($hasPrice) {
                    $cols[] = 'price';
                }
                if ($hasFinalPrice) {
                    $cols[] = 'final_price';
                }
                if ($hasPromo) {
                    $cols[] = 'is_on_promo';
                }

                $allItems = DB::table('items')->select($cols)->limit(120)->get();
                $scoredItems = $allItems->map(function ($it) use ($clicksByItem, $viewsByItem, $wishByItem) {
                    $v = (int) ($viewsByItem[$it->id] ?? 0);
                    $c = (int) ($clicksByItem[$it->id] ?? 0);
                    $w = (int) ($wishByItem[$it->id] ?? 0);
                    $price = isset($it->final_price) && $it->final_price > 0
                        ? (int) $it->final_price
                        : (isset($it->price) ? (int) $it->price : null);

                    return [
                        'id' => (int) $it->id,
                        'title' => (string) $it->title,
                        'priceRp' => $price,
                        'isOnPromo' => (bool) ($it->is_on_promo ?? false),
                        'views' => $v,
                        'clicks' => $c,
                        'wishlists' => $w,
                        'demandScore' => $v + ($c * 3) + ($w * 5),
                    ];
                })->sortByDesc('demandScore')->take(8)->values()->all();

                $catalogDemand['topItems'] = $scoredItems;
            }

            if (Schema::hasTable('projects')) {
                $catalogDemand['projects'] = DB::table('projects')
                    ->select(['id', 'title', 'location', 'is_highlighted'])
                    ->orderByDesc('is_highlighted')
                    ->orderByDesc('id')
                    ->limit(6)
                    ->get()
                    ->map(fn ($p) => [
                        'id' => (int) $p->id,
                        'title' => (string) $p->title,
                        'location' => $p->location,
                    ])->values()->all();
            }

            if (Schema::hasTable('promo_banners')) {
                $catalogDemand['activePromos'] = DB::table('promo_banners')
                    ->where('is_active', true)
                    ->orderBy('order_index')
                    ->limit(5)
                    ->get(['id', 'title', 'label', 'cta_text'])
                    ->map(fn ($b) => [
                        'id' => (int) $b->id,
                        'title' => (string) $b->title,
                        'label' => $b->label,
                        'cta' => $b->cta_text,
                    ])->values()->all();
            }
        } catch (Throwable) {
        }

        // 5. Deteksi Kebocoran Profit Otomatis (Immediate Profit Leaks)
        $profitLeaks = [];
        if ($waSummary['pendingCount'] > 0) {
            $profitLeaks[] = "Ada {$waSummary['pendingCount']} prospek WhatsApp LiviBot berstatus PENDING yang menanyakan harga produk dan belum dijawab — potensi closing langsung bila di-follow up hari ini.";
        }
        if ($consultSummary['unrespondedNew'] > 0) {
            $profitLeaks[] = "Ada {$consultSummary['unrespondedNew']} pengajuan konsultasi desain interior baru (new_inquiry) yang belum ditindaklanjuti.";
        }
        if ($ordersSummary['pipelineOrdersCount'] > 0) {
            $rpFormatted = 'Rp '.number_format($ordersSummary['pipelineValueRp'], 0, ',', '.');
            $profitLeaks[] = "Ada {$ordersSummary['pipelineOrdersCount']} pesanan shop senilai {$rpFormatted} yang masih tertahan di tahap penawaran/menunggu pembayaran.";
        }

        return [
            'ordersAndRevenue' => $ordersSummary,
            'consultationsPipeline' => $consultSummary,
            'whatsappLiviBot' => $waSummary,
            'catalogDemand' => $catalogDemand,
            'profitLeaks' => $profitLeaks,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function learningMemorySnapshot(): array
    {
        $this->syncFromImpact();

        $impactStats = [
            'positive' => 0,
            'negative' => 0,
            'neutral' => 0,
            'monitoring' => 0,
            'provenWinners' => [],
            'underperforming' => [],
        ];

        try {
            if (Schema::hasTable('ai_impact_records')) {
                $records = AiImpactRecord::orderByDesc('approved_at')->limit(30)->get();
                foreach ($records as $r) {
                    $res = $r->result ?: 'monitoring';
                    if (isset($impactStats[$res])) {
                        $impactStats[$res]++;
                    }
                    $changeArr = is_array($r->change_pct) ? $r->change_pct : [];
                    $pct = $changeArr['30'] ?? $changeArr['14'] ?? $changeArr['7'] ?? null;
                    if ($res === 'positive' && count($impactStats['provenWinners']) < 5) {
                        $impactStats['provenWinners'][] = [
                            'agent' => $r->agent_key,
                            'title' => $r->title,
                            'metric' => $r->metric_label,
                            'changePct' => $pct,
                            'conclusion' => $r->ai_conclusion,
                        ];
                    } elseif ($res === 'negative' && count($impactStats['underperforming']) < 5) {
                        $impactStats['underperforming'][] = [
                            'agent' => $r->agent_key,
                            'title' => $r->title,
                            'metric' => $r->metric_label,
                            'changePct' => $pct,
                            'conclusion' => $r->ai_conclusion,
                        ];
                    }
                }
            }
        } catch (Throwable) {
        }

        $governanceStats = [
            'approvedOrExecuted' => 0,
            'rejected' => 0,
            'pending' => 0,
            'preferredActionTypes' => [],
            'recentlyRejectedTitles' => [],
        ];

        try {
            if (Schema::hasTable('ai_recommendations')) {
                $governanceStats['approvedOrExecuted'] = AiRecommendation::whereIn('status', ['approved', 'executed'])->count();
                $governanceStats['rejected'] = AiRecommendation::where('status', 'rejected')->count();
                $governanceStats['pending'] = AiRecommendation::where('status', 'pending')->count();

                $preferred = AiRecommendation::query()
                    ->whereIn('status', ['approved', 'executed'])
                    ->selectRaw('action_type, COUNT(*) as total')
                    ->groupBy('action_type')
                    ->orderByDesc('total')
                    ->limit(4)
                    ->pluck('total', 'action_type')
                    ->all();
                $governanceStats['preferredActionTypes'] = $preferred;

                $governanceStats['recentlyRejectedTitles'] = AiRecommendation::query()
                    ->where('status', 'rejected')
                    ->latest('updated_at')
                    ->limit(5)
                    ->pluck('title')
                    ->all();
            }
        } catch (Throwable) {
        }

        return [
            'impact' => $impactStats,
            'governance' => $governanceStats,
            'rules' => $this->getRules(),
        ];
    }

    /**
     * Format ringkas namun komprehensif untuk di-inject ke prompt AI (Chat & seluruh Agent).
     */
    public function promptBlock(int $days = 30): string
    {
        $profit = $this->profitAndBusinessGrounding($days);
        $memory = $this->learningMemorySnapshot();
        $roi = $this->roiAndRoasAttribution($days, 0.0, 0.0, 0.0, 0, 0, $profit);

        $rev = $profit['ordersAndRevenue'];
        $paidRp = 'Rp '.number_format($rev['paidRevenueRp'], 0, ',', '.');
        $pipeRp = 'Rp '.number_format($rev['pipelineValueRp'], 0, ',', '.');
        $aovRp = 'Rp '.number_format($rev['avgOrderValueRp'], 0, ',', '.');
        $waValRp = 'Rp '.number_format($profit['whatsappLiviBot']['inquiredValueRp'] ?? 0, 0, ',', '.');
        $boostSpendRp = 'Rp '.number_format($roi['totalSpendRp'] ?? 0, 0, ',', '.');

        $lines = [];
        $lines[] = "=== DATA PROFIT, PENJUALAN & PIPELINE NYATA LIVORA ({$days} HARI TERAKHIR) ===";
        $lines[] = "- Shop Revenue Terealisasi: {$paidRp} dari {$rev['paidOrdersCount']} order lunas (AOV: {$aovRp})";
        $lines[] = "- Pipeline Order Shop Aktif (belum lunas): {$pipeRp} dari {$rev['pipelineOrdersCount']} order";
        $lines[] = "- Nilai Produk Ditanyakan via WA LiviBot: {$waValRp} ({$profit['whatsappLiviBot']['totalPeriod']} inquiry)";
        $lines[] = sprintf(
            "- Analisis Biaya Boost IG & ROAS/ROI: Total Spend=%s, Blended ROAS=%s, Real ROI=%s, Cost per Lead=%s (%s)",
            $boostSpendRp,
            $roi['effectiveRoas'] !== null ? $roi['effectiveRoas'].'x' : 'belum ada spend tercatat',
            $roi['effectiveRoiPct'] !== null ? $roi['effectiveRoiPct'].'%' : 'n/a',
            $roi['realCplRp'] !== null ? 'Rp '.number_format($roi['realCplRp'], 0, ',', '.') : 'n/a',
            $roi['verdict'] ?? ''
        );

        if (! empty($rev['topSellingItems'])) {
            $soldStr = implode('; ', array_map(
                fn ($i) => "{$i['title']} ({$i['qty']} unit, Rp ".number_format($i['revenueRp'], 0, ',', '.').')',
                $rev['topSellingItems']
            ));
            $lines[] = "- Produk Terlaris: {$soldStr}";
        }

        $c = $profit['consultationsPipeline'];
        $lines[] = "- Pipeline Konsultasi Desain Interior: total={$c['totalPeriod']}, belum dijawab (new_inquiry)={$c['unrespondedNew']}, tahap aktif high-intent (meeting/agreement/DP)={$c['activeHighIntent']}, closing/berjalan={$c['completedCount']}, batal={$c['cancelledCount']}";
        if (! empty($c['recentHighPriority'])) {
            $cList = implode('; ', array_map(
                fn ($row) => "#{$row['id']} {$row['name']} [{$row['status']}]".($row['serviceType'] ? " ({$row['serviceType']})" : ''),
                $c['recentHighPriority']
            ));
            $lines[] = "- Prospek Konsultasi Prioritas: {$cList}";
        }

        $wa = $profit['whatsappLiviBot'];
        $lines[] = "- WhatsApp LiviBot Cek Harga: total={$wa['totalPeriod']}, PENDING belum dijawab={$wa['pendingCount']}, sudah dijawab={$wa['answeredCount']}";
        if (! empty($wa['pendingInquiries'])) {
            $waList = implode('; ', array_map(
                fn ($w) => "#{$w['id']} {$w['customerName']} ({$w['phone']}): ".implode(', ', $w['itemsAsked'] ?: ['tanya harga']),
                $wa['pendingInquiries']
            ));
            $lines[] = "- Antrean WA LiviBot Menunggu Follow-Up: {$waList}";
        }

        if (! empty($profit['catalogDemand']['topItems'])) {
            $itemList = implode('; ', array_map(
                fn ($it) => "[item#{$it['id']}] {$it['title']} (".($it['priceRp'] ? 'Rp '.number_format($it['priceRp'], 0, ',', '.') : 'custom').", views={$it['views']}, clicks={$it['clicks']}, wishlist={$it['wishlists']})",
                array_slice($profit['catalogDemand']['topItems'], 0, 6)
            ));
            $lines[] = "- Katalog Produk Demand Tertinggi: {$itemList}";
        }

        if (! empty($profit['catalogDemand']['projects'])) {
            $projList = implode('; ', array_map(
                fn ($p) => "[project#{$p['id']}] {$p['title']}".($p['location'] ? " ({$p['location']})" : ''),
                $profit['catalogDemand']['projects']
            ));
            $lines[] = "- Portofolio Proyek Interior: {$projList}";
        }

        if (! empty($profit['profitLeaks'])) {
            $lines[] = "\nKEBOCORAN PROFIT YANG WAJIB DIPRIORITASKAN:";
            foreach ($profit['profitLeaks'] as $leak) {
                $lines[] = "- [URGENT] {$leak}";
            }
        }

        $lines[] = "\n=== MEMORI PEMBELAJARAN ADAPTIF AI (SELF-LEARNING PLAYBOOK) ===";
        $imp = $memory['impact'];
        $lines[] = "- Rekam Jejak Eksperimen AI: {$imp['positive']} berdampak POSITIF, {$imp['monitoring']} sedang dipantau, {$imp['negative']} negatif.";
        if (! empty($imp['provenWinners'])) {
            foreach ($imp['provenWinners'] as $win) {
                $lines[] = "  * [WIN] ({$win['agent']}) {$win['title']} -> {$win['conclusion']}";
            }
        }
        if (! empty($imp['underperforming'])) {
            foreach ($imp['underperforming'] as $loss) {
                $lines[] = "  * [AVOID] ({$loss['agent']}) {$loss['title']} -> {$loss['conclusion']}";
            }
        }

        $gov = $memory['governance'];
        if (! empty($gov['recentlyRejectedTitles'])) {
            $lines[] = '- Ide yang Pernah Ditolak Admin (JANGAN diulang): '.implode(' | ', $gov['recentlyRejectedTitles']);
        }

        if (! empty($memory['rules'])) {
            $lines[] = '- Aturan Strategi & Fokus Profit Livora:';
            foreach (array_slice($memory['rules'], 0, 10) as $rule) {
                $lines[] = "  * [{$rule['category']}] {$rule['rule']}";
            }
        }

        return implode("\n", $lines);
    }
}
