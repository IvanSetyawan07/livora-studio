<?php

namespace App\Services\AI;

use App\Models\AiAgent;
use App\Services\Google\GoogleOAuthTokenStore;
use App\Services\Marketing\GoogleAdsClient;
use App\Services\Marketing\MetaAdsClient;
use App\Services\Meta\MetaGraphClient;

/**
 * Menyegarkan badge dependency di kartu agent berdasarkan kredensial yang
 * BENAR-BENAR ada saat ini. Sebelumnya hanya dependency "Google Search Console"
 * milik SEO Agent yang pernah di-set, sehingga Ads Agent selamanya menampilkan
 * "not_connected" walau data Meta/Google Ads sudah live di tab Ads.
 *
 * Sengaja hanya memeriksa konfigurasi/kredensial lokal (tanpa memanggil API
 * luar) supaya murah dan bisa dipanggil setiap kali daftar agent dimuat atau
 * setelah proses connect/disconnect selesai.
 */
class AgentDependencyHealth
{
    public function __construct(
        private GoogleOAuthTokenStore $googleTokens,
        private MetaAdsClient $metaAds,
        private GoogleAdsClient $googleAds,
        private MetaGraphClient $metaGraph,
        private AIProviderManager $providers,
    ) {
    }

    public function refresh(): void
    {
        $googleInfo = $this->googleTokens->connectionInfo();
        $googleConnected = $googleInfo !== null;
        $hasAnalytics = $googleConnected && str_contains((string) ($googleInfo['scope'] ?? ''), 'analytics.readonly');
        $aiReady = count($this->providers->availableProviders()) > 0;

        $map = [
            'seo' => [
                'Google Search Console' => $googleConnected,
                'Web Analytics' => $hasAnalytics,
                'Claude via Laravel API' => $aiReady,
            ],
            'cro' => [
                'Web Analytics' => $hasAnalytics,
                'Claude via Laravel API' => $aiReady,
            ],
            'ads' => [
                'Meta Ads API' => $this->metaAds->isConfigured(),
                'Google Ads API' => $this->googleAds->isConfigured(),
                'Claude via Laravel API' => $aiReady,
            ],
            'content' => [
                'Social publishing APIs' => $this->metaGraph->isConfigured(),
                'Claude via Laravel API' => $aiReady,
            ],
            'leads' => [
                'Claude via Laravel API' => $aiReady,
            ],
        ];

        foreach ($map as $agentKey => $dependencies) {
            foreach ($dependencies as $name => $connected) {
                AiAgent::setDependencyState($agentKey, $name, $connected ? 'connected' : 'not_connected');
            }
        }
    }
}
