<?php

namespace App\Services\Marketing;

use App\Services\Meta\MetaAdsOAuthTokenStore;
use Illuminate\Support\Facades\Http;

/**
 * Meta Marketing API (Facebook + Instagram Ads) — read-only Insights.
 *
 * Token: diprioritaskan dari MetaAdsOAuthTokenStore (hasil Connect lewat
 * Settings), fallback ke META_ADS_ACCESS_TOKEN statis di .env kalau belum
 * pernah Connect — supaya instalasi lama yang masih pakai System User token
 * manual tidak breaking. Ad account tetap dari META_ADS_ACCOUNT_ID di .env
 * (OAuth tidak menggantikan itu, lihat MetaAdsOAuthController).
 */
class MetaAdsClient
{
    public function __construct(private MetaAdsOAuthTokenStore $oauthTokens)
    {
    }

    public function accountId(): ?string
    {
        $id = config('services.meta_ads.account_id');
        if (! filled($id)) {
            return null;
        }
        $id = (string) $id;

        return str_starts_with($id, 'act_') ? $id : 'act_'.$id;
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

    private const LEAD_ACTIONS = ['lead', 'onsite_conversion.lead_grouped', 'offsite_conversion.fb_pixel_lead'];
    private const PURCHASE_ACTIONS = ['purchase', 'offsite_conversion.fb_pixel_purchase'];

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
