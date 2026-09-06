<?php

namespace App\Services\Marketing;

use Illuminate\Support\Facades\Http;

/**
 * Meta Marketing API (Facebook + Instagram Ads) — read-only Insights.
 *
 * Kredensial: META_ADS_ACCESS_TOKEN (System User, scope ads_read),
 * META_ADS_ACCOUNT_ID (format act_xxxxxxxx), META_ADS_API_VERSION.
 */
class MetaAdsClient
{
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
        return filled(config('services.meta_ads.access_token')) && filled($this->accountId());
    }

    private function token(): string
    {
        $token = config('services.meta_ads.access_token');
        if (! filled($token) || ! filled($this->accountId())) {
            throw MarketingApiException::notConfigured(
                'Meta Ads belum dikonfigurasi. Isi META_ADS_ACCESS_TOKEN dan META_ADS_ACCOUNT_ID di backend/.env.'
            );
        }

        return (string) $token;
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
     * @return list<array{id: string, name: string, spend: float, leads: float, impressions: int, clicks: int, revenue: float}>
     */
    public function campaigns(MarketingPeriod $period): array
    {
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
                'spend' => round((float) ($row['spend'] ?? 0), 2),
                'leads' => self::actionValue($row, self::LEAD_ACTIONS),
                'impressions' => (int) ($row['impressions'] ?? 0),
                'clicks' => (int) ($row['clicks'] ?? 0),
                'revenue' => self::actionValue($row, self::PURCHASE_ACTIONS, 'action_values'),
            ];
        }

        return $rows;
    }
}
