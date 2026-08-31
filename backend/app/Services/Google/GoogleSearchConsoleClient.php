<?php

namespace App\Services\Google;

use Google_Client;
use Google_Service_SearchConsole;
use Google_Service_SearchConsole_SearchAnalyticsQueryRequest;
use RuntimeException;

/**
 * Wrapper tipis di atas Search Console API v1. `listSites()` dipakai untuk
 * verifikasi awal (bukti koneksi OAuth benar dan property livoralcr.com
 * kelihatan dari sisi Google). `searchAnalytics()` disiapkan untuk dipakai
 * SeoAgentService di langkah berikutnya — belum dipanggil di mana pun saat
 * ini.
 */
class GoogleSearchConsoleClient
{
    public function __construct(private GoogleOAuthTokenStore $tokens)
    {
    }

    /**
     * @return array<int, array{siteUrl: string, permissionLevel: string}>
     * @throws RuntimeException kalau belum connect / token invalid
     */
    public function listSites(): array
    {
        $service = $this->service();
        $response = $service->sites->listSites();

        return array_map(
            fn ($site) => [
                'siteUrl' => $site->getSiteUrl(),
                'permissionLevel' => $site->getPermissionLevel(),
            ],
            $response->getSiteEntry() ?? []
        );
    }

    /**
     * @param string $siteUrl format Search Console, mis. "sc-domain:livoralcr.com" atau "https://livoralcr.com/"
     * @param string[] $dimensions mis. ['query'], ['page'], ['query', 'page']
     * @return array<int, array{keys: string[], clicks: int, impressions: int, ctr: float, position: float}>
     */
    public function searchAnalytics(
        string $siteUrl,
        string $startDate,
        string $endDate,
        array $dimensions = ['query'],
        int $rowLimit = 25
    ): array {
        $service = $this->service();

        $request = new Google_Service_SearchConsole_SearchAnalyticsQueryRequest();
        $request->setStartDate($startDate);
        $request->setEndDate($endDate);
        $request->setDimensions($dimensions);
        $request->setRowLimit($rowLimit);

        $response = $service->searchanalytics->query($siteUrl, $request);

        return array_map(
            fn ($row) => [
                'keys' => $row->getKeys() ?? [],
                'clicks' => (int) $row->getClicks(),
                'impressions' => (int) $row->getImpressions(),
                'ctr' => (float) $row->getCtr(),
                'position' => (float) $row->getPosition(),
            ],
            $response->getRows() ?? []
        );
    }

    private function service(): Google_Service_SearchConsole
    {
        $accessToken = $this->tokens->getValidAccessToken();

        if ($accessToken === null) {
            throw new RuntimeException('Google Search Console belum terhubung atau token perlu connect ulang.');
        }

        $client = new Google_Client();
        $client->setAccessToken($accessToken);

        return new Google_Service_SearchConsole($client);
    }
}