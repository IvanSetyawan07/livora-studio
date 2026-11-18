<?php

namespace App\Services\Marketing;

use App\Models\AiSetting;
use App\Services\Meta\MetaAdsOAuthTokenStore;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;

/**
 * Meta Marketing API (Facebook + Instagram Ads) — read-only Insights.
 *
 * Token: diprioritaskan dari MetaAdsOAuthTokenStore (hasil Connect lewat
 * Settings), fallback ke META_ADS_ACCESS_TOKEN statis di .env kalau belum
 * pernah Connect — supaya instalasi lama yang masih pakai System User token
 * manual tidak breaking. Ad account memprioritaskan pilihan user di
 * AiSetting ('meta_ads_selected_account_id') lalu fallback ke META_ADS_ACCOUNT_ID di .env.
 */
class MetaAdsClient
{
    public function __construct(private MetaAdsOAuthTokenStore $oauthTokens)
    {
    }

    public function accountId(): ?string
    {
        $selected = null;
        try {
            if (Schema::hasTable('ai_settings')) {
                $raw = AiSetting::get('meta_ads_selected_account_id');
                if (filled($raw)) {
                    $selected = trim((string) $raw);
                }
            }
        } catch (\Throwable) {
            $selected = null;
        }

        $id = $selected ?: config('services.meta_ads.account_id');
        if (! filled($id)) {
            return null;
        }
        $id = (string) $id;

        return str_starts_with($id, 'act_') ? $id : 'act_'.$id;
    }

    public function setSelectedAccountId(?string $accountId): ?string
    {
        $clean = filled($accountId) ? trim((string) $accountId) : null;
        if ($clean !== null) {
            $clean = str_starts_with($clean, 'act_') ? $clean : 'act_'.$clean;
        }

        if (Schema::hasTable('ai_settings')) {
            AiSetting::set('meta_ads_selected_account_id', $clean);
        }

        return $this->accountId();
    }

    public function isConfigured(): bool
    {
        return filled($this->rawToken()) && filled($this->accountId());
    }

    private function token(): string
    {
        $token = $this->rawToken();
        if (! filled($token) || ! filled($this->accountId())) {
            throw MarketingApiException::notConfigured(
                'Meta Ads belum tersambung. Klik Connect di Settings → Data source & platform connections, atau isi META_ADS_ACCESS_TOKEN dan META_ADS_ACCOUNT_ID di backend/.env.'
            );
        }

        return (string) $token;
    }

    /** Token OAuth (dari Connect di Settings) kalau ada, else fallback .env. */
    private function rawToken(): ?string
    {
        return $this->oauthTokens->getValidAccessToken() ?? config('services.meta_ads.access_token');
    }


    private function baseUrl(): string
    {
        $version = (string) config('services.meta_ads.api_version', 'v21.0');

        return "https://graph.facebook.com/{$version}";
    }

    /** @return array<string, mixed> */
    private function get(string $path, array $query): array
    {
        $response = Http::timeout(30)->get($this->baseUrl().$path, $query + ['access_token' => $this->token()]);

        if (! $response->successful()) {
            $error = $response->json('error.message');

            throw MarketingApiException::fromHttp('Meta Ads', $response->status(), is_string($error) ? $error : $response->body());
        }

        return $response->json() ?? [];
    }

    /** Jumlahkan action tertentu (lead, purchase) dari struktur `actions` Meta. */
    private static function actionValue(array $row, array $types, string $field = 'actions'): float
    {
        $sum = 0.0;
        foreach ($row[$field] ?? [] as $action) {
            if (in_array($action['action_type'] ?? '', $types, true)) {
                $sum += (float) ($action['value'] ?? 0);
            }
        }

        return $sum;
    }

    private const LEAD_ACTIONS = [
        'lead',
        'onsite_conversion.lead_grouped',
        'offsite_conversion.fb_pixel_lead',
        'onsite_conversion.messaging_conversation_started_7d',
        'onsite_conversion.messaging_first_reply',
        'contact_total',
        'click_to_call_call_confirm',
    ];

    private const PURCHASE_ACTIONS = [
        'purchase',
        'offsite_conversion.fb_pixel_purchase',
        'omni_purchase',
        'onsite_web_purchase',
    ];

    /**
     * Deret harian spend / leads / impressions / clicks untuk seluruh akun.
     *
     * @return list<array{date: string, spend: float, leads: float, impressions: int, clicks: int, revenue: float}>
     */
    public function dailySeries(MarketingPeriod $period): array
    {
        $payload = $this->get('/'.$this->accountId().'/insights', [
            'level' => 'account',
            'time_increment' => 1,
            'time_range' => json_encode(['since' => $period->fromDate(), 'until' => $period->toDate()]),
            'fields' => 'spend,impressions,clicks,actions,action_values',
            'limit' => 500,
        ]);

        $rows = [];
        foreach ($payload['data'] ?? [] as $row) {
            $rows[] = [
                'date' => (string) ($row['date_start'] ?? ''),
                'spend' => round((float) ($row['spend'] ?? 0), 2),
                'leads' => self::actionValue($row, self::LEAD_ACTIONS),
                'impressions' => (int) ($row['impressions'] ?? 0),
                'clicks' => (int) ($row['clicks'] ?? 0),
                'revenue' => self::actionValue($row, self::PURCHASE_ACTIONS, 'action_values'),
            ];
        }

        return $rows;
    }

    /**
     * Daftar campaign aktif + metrik per campaign.
     *
     * @return list<array{id: string, name: string, status: string, spend: float, leads: float, impressions: int, clicks: int, revenue: float}>
     */
    public function campaigns(MarketingPeriod $period): array
    {
        $statuses = $this->campaignStatuses();

        $payload = $this->get('/'.$this->accountId().'/insights', [
            'level' => 'campaign',
            'time_range' => json_encode(['since' => $period->fromDate(), 'until' => $period->toDate()]),
            'fields' => 'campaign_id,campaign_name,spend,impressions,clicks,actions,action_values',
            'limit' => 100,
        ]);

        $rows = [];
        foreach ($payload['data'] ?? [] as $row) {
            $rows[] = [
                'id' => (string) ($row['campaign_id'] ?? ''),
                'name' => (string) ($row['campaign_name'] ?? 'Untitled campaign'),
                'status' => $statuses[(string) ($row['campaign_id'] ?? '')] ?? 'unknown',
                'spend' => round((float) ($row['spend'] ?? 0), 2),
                'leads' => self::actionValue($row, self::LEAD_ACTIONS),
                'impressions' => (int) ($row['impressions'] ?? 0),
                'clicks' => (int) ($row['clicks'] ?? 0),
                'revenue' => self::actionValue($row, self::PURCHASE_ACTIONS, 'action_values'),
            ];
        }

        return $rows;
    }

    /**
     * Endpoint /insights tidak pernah mengembalikan status campaign, jadi status
     * asli (ACTIVE/PAUSED/ARCHIVED/...) diambil dari edge /campaigns lalu
     * dipetakan ke nilai lowercase yang dipakai UI. Tanpa ini AdsController
     * terpaksa menebak "active" untuk semua campaign Meta.
     *
     * @return array<string, string>
     */
    private function campaignStatuses(): array
    {
        try {
            $payload = $this->get('/'.$this->accountId().'/campaigns', [
                'fields' => 'id,effective_status,status',
                'limit' => 200,
            ]);
        } catch (MarketingApiException) {
            return [];
        }

        $map = [];
        foreach ($payload['data'] ?? [] as $row) {
            $raw = (string) ($row['effective_status'] ?? $row['status'] ?? '');
            if ($raw === '') {
                continue;
            }
            $map[(string) $row['id']] = strtolower($raw);
        }

        return $map;
    }

    /**
     * Detail satu campaign — dipakai eksekutor untuk memastikan campaign milik
     * ad account Livora dan membaca nilai "before" yang sebenarnya.
     *
     * @return array{id: string, name: string, status: string, daily_budget: ?int, lifetime_budget: ?int, account_id: string}
     */
    public function campaign(string $campaignId): array
    {
        $row = $this->get('/'.$campaignId, ['fields' => 'id,name,status,effective_status,daily_budget,lifetime_budget,account_id']);

        return [
            'id' => (string) ($row['id'] ?? $campaignId),
            'name' => (string) ($row['name'] ?? ''),
            'status' => (string) ($row['status'] ?? ''),
            'daily_budget' => isset($row['daily_budget']) ? (int) $row['daily_budget'] : null,
            'lifetime_budget' => isset($row['lifetime_budget']) ? (int) $row['lifetime_budget'] : null,
            'account_id' => 'act_'.ltrim((string) ($row['account_id'] ?? ''), 'act_'),
        ];
    }

    /** Daftar campaign (id, name, status, daily_budget) untuk grounding AI. */
    public function campaignList(): array
    {
        $payload = $this->get('/'.$this->accountId().'/campaigns', [
            'fields' => 'id,name,status,daily_budget,lifetime_budget',
            'limit' => 100,
        ]);

        return $payload['data'] ?? [];
    }

    /**
     * Ringkasan total pengeluaran SEUMUR HIDUP (all-time / date_preset=maximum) pada Ad Account aktif,
     * agar biaya Instagram Boost & campaign masa lalu tetap terlihat meski di luar filter 28 hari.
     *
     * @return array{accountId: string, accountName: ?string, currency: string, spend: float, impressions: int, reach: int, clicks: int, leads: float, revenue: float, ctr: ?float, cpl: ?float, dateStart: ?string, dateStop: ?string}
     */
    public function lifetimeInsights(): array
    {
        $accountId = $this->accountId();
        $accountName = null;
        $currency = 'IDR';

        try {
            $accInfo = $this->get('/'.$accountId, ['fields' => 'id,name,currency,account_status']);
            $accountName = is_string($accInfo['name'] ?? null) ? $accInfo['name'] : null;
            if (is_string($accInfo['currency'] ?? null) && $accInfo['currency'] !== '') {
                $currency = strtoupper($accInfo['currency']);
            }
        } catch (\Throwable) {
            // Opsional — jika field detail akun terbatas, tetap lanjut ke endpoint insights.
        }

        $payload = $this->get('/'.$accountId.'/insights', [
            'level' => 'account',
            'date_preset' => 'maximum',
            'fields' => 'spend,impressions,reach,clicks,actions,action_values,date_start,date_stop',
            'limit' => 5,
        ]);

        $row = $payload['data'][0] ?? [];
        $spend = round((float) ($row['spend'] ?? 0), 2);
        $impressions = (int) ($row['impressions'] ?? 0);
        $reach = (int) ($row['reach'] ?? 0);
        $clicks = (int) ($row['clicks'] ?? 0);
        $leads = self::actionValue($row, self::LEAD_ACTIONS);
        $revenue = self::actionValue($row, self::PURCHASE_ACTIONS, 'action_values');

        return [
            'accountId' => (string) $accountId,
            'accountName' => $accountName,
            'currency' => $currency,
            'spend' => $spend,
            'impressions' => $impressions,
            'reach' => $reach,
            'clicks' => $clicks,
            'leads' => $leads,
            'revenue' => $revenue,
            'ctr' => $impressions > 0 ? round($clicks / $impressions * 100, 2) : null,
            'cpl' => $leads > 0 ? round($spend / $leads, 2) : null,
            'dateStart' => isset($row['date_start']) ? (string) $row['date_start'] : null,
            'dateStop' => isset($row['date_stop']) ? (string) $row['date_stop'] : null,
        ];
    }

    /**
     * Daftar seluruh campaign & Instagram Boost yang pernah berjalan (date_preset=maximum),
     * diurutkan dari pengeluaran terbesar agar riwayat biaya Boost terlihat jelas.
     *
     * @return list<array<string, mixed>>
     */
    public function lifetimeCampaigns(): array
    {
        $accountId = $this->accountId();
        $metaById = [];

        try {
            $campRes = $this->get('/'.$accountId.'/campaigns', [
                'fields' => 'id,name,effective_status,status,objective,created_time,start_time,stop_time',
                'limit' => 200,
            ]);
            foreach ($campRes['data'] ?? [] as $c) {
                $cid = (string) ($c['id'] ?? '');
                if ($cid === '') {
                    continue;
                }
                $rawStatus = (string) ($c['effective_status'] ?? $c['status'] ?? 'unknown');
                $metaById[$cid] = [
                    'name' => (string) ($c['name'] ?? ''),
                    'status' => strtolower($rawStatus),
                    'objective' => isset($c['objective']) ? (string) $c['objective'] : null,
                    'createdTime' => isset($c['created_time']) ? substr((string) $c['created_time'], 0, 10) : null,
                ];
            }
        } catch (\Throwable) {
            // Lanjutkan dengan insights walaupun edge /campaigns tidak mengembalikan metadata lengkap.
        }

        $payload = $this->get('/'.$accountId.'/insights', [
            'level' => 'campaign',
            'date_preset' => 'maximum',
            'fields' => 'campaign_id,campaign_name,spend,impressions,reach,clicks,actions,action_values,date_start,date_stop',
            'limit' => 150,
        ]);

        $rows = [];
        $seen = [];

        foreach ($payload['data'] ?? [] as $row) {
            $cid = (string) ($row['campaign_id'] ?? '');
            $seen[$cid] = true;
            $spend = round((float) ($row['spend'] ?? 0), 2);
            $leads = self::actionValue($row, self::LEAD_ACTIONS);
            $impressions = (int) ($row['impressions'] ?? 0);
            $reach = (int) ($row['reach'] ?? 0);
            $clicks = (int) ($row['clicks'] ?? 0);
            $revenue = self::actionValue($row, self::PURCHASE_ACTIONS, 'action_values');
            $meta = $metaById[$cid] ?? [];

            $rows[] = [
                'id' => $cid,
                'name' => (string) ($row['campaign_name'] ?? $meta['name'] ?? 'Untitled Boost / Campaign'),
                'platform' => 'meta',
                'status' => $meta['status'] ?? 'unknown',
                'objective' => $meta['objective'] ?? null,
                'spend' => $spend,
                'leads' => $leads,
                'impressions' => $impressions,
                'reach' => $reach,
                'clicks' => $clicks,
                'revenue' => $revenue,
                'cpl' => $leads > 0 ? round($spend / $leads, 2) : null,
                'dateStart' => isset($row['date_start']) ? (string) $row['date_start'] : ($meta['createdTime'] ?? null),
                'dateStop' => isset($row['date_stop']) ? (string) $row['date_stop'] : null,
            ];
        }

        foreach ($metaById as $cid => $meta) {
            if (isset($seen[$cid])) {
                continue;
            }
            $rows[] = [
                'id' => $cid,
                'name' => $meta['name'] ?: 'Meta Campaign '.$cid,
                'platform' => 'meta',
                'status' => $meta['status'],
                'objective' => $meta['objective'],
                'spend' => 0.0,
                'leads' => 0.0,
                'impressions' => 0,
                'reach' => 0,
                'clicks' => 0,
                'revenue' => 0.0,
                'cpl' => null,
                'dateStart' => $meta['createdTime'],
                'dateStop' => null,
            ];
        }

        usort($rows, fn ($a, $b) => ($b['spend'] <=> $a['spend']));

        return $rows;
    }

    /**
     * Daftar Ad Account Meta yang dapat diakses oleh token aktif beserta total pengeluarannya,
     * sangat membantu apabila Instagram Boost mobile memakai Ad Account berbeda dari .env.
     *
     * @return list<array{id: string, name: string, currency: string, accountStatus: int, lifetimeSpend: float}>
     */
    public function accessibleAdAccounts(): array
    {
        $token = $this->rawToken();
        if (! filled($token)) {
            return [];
        }

        try {
            $res = Http::timeout(20)->get($this->baseUrl().'/me/adaccounts', [
                'fields' => 'id,account_id,name,currency,account_status,insights.date_preset(maximum){spend}',
                'limit' => 25,
                'access_token' => $token,
            ]);
            if (! $res->successful()) {
                return [];
            }

            $out = [];
            foreach ($res->json('data') ?? [] as $acc) {
                $id = (string) ($acc['id'] ?? '');
                if ($id === '') {
                    continue;
                }
                $spend = (float) ($acc['insights']['data'][0]['spend'] ?? 0);
                $out[] = [
                    'id' => str_starts_with($id, 'act_') ? $id : 'act_'.$id,
                    'name' => (string) ($acc['name'] ?? $id),
                    'currency' => strtoupper((string) ($acc['currency'] ?? 'IDR')),
                    'accountStatus' => (int) ($acc['account_status'] ?? 1),
                    'lifetimeSpend' => round($spend, 2),
                ];
            }

            usort($out, fn ($a, $b) => ($b['lifetimeSpend'] <=> $a['lifetimeSpend']));

            return $out;
        } catch (\Throwable) {
            return [];
        }
    }

    /**
     * WRITE: ubah campaign di Meta (butuh izin ads_management).
     * Nilai budget dalam satuan minor mata uang akun (IDR: rupiah utuh × 1).
     *
     * @param array{status?: string, daily_budget?: int} $fields
     */
    public function updateCampaign(string $campaignId, array $fields): void
    {
        $response = Http::asForm()->timeout(30)
            ->post($this->baseUrl().'/'.$campaignId, $fields + ['access_token' => $this->token()]);

        if (! $response->successful() || $response->json('success') === false) {
            $error = $response->json('error.message');

            throw MarketingApiException::fromHttp('Meta Ads', $response->status(), is_string($error) ? $error : $response->body());
        }
    }
}
