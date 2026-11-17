<?php

namespace App\Services\AI;

use App\Models\AiAgent;
use App\Services\Google\GoogleBusinessProfileClient;
use App\Services\Google\GoogleOAuthTokenStore;
use App\Services\Marketing\Ga4Client;
use App\Services\Marketing\GoogleAdsClient;
use App\Services\Marketing\MetaAdsClient;
use App\Services\Meta\MetaGraphClient;
use App\Services\WhatsApp\NullWhatsAppProvider;
use App\Services\WhatsApp\WhatsAppNotifier;

/**
 * Menyegarkan badge dependency + connection_state kartu agent berdasarkan
 * kredensial & sumber data internal yang benar-benar tersedia saat ini.
 */
class AgentDependencyHealth
{
    public function __construct(
        private GoogleOAuthTokenStore $googleTokens,
        private Ga4Client $ga4,
        private GoogleBusinessProfileClient $gbp,
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
        $hasAnalytics = $this->ga4->isConfigured()
            || ($googleConnected && str_contains((string) ($googleInfo['scope'] ?? ''), 'analytics.readonly'))
            || filled(config('services.ga4.measurement_id'));
        $gbpReady = $googleConnected && $this->gbp->isConfigured();
        $aiReady = count($this->providers->availableProviders()) > 0;
        $waReady = ! (WhatsAppNotifier::provider() instanceof NullWhatsAppProvider);
        $mailHost = (string) config('mail.mailers.smtp.host', '');
        $mailReady = filled(config('mail.default')) && $mailHost !== '' && $mailHost !== 'mailpit';
        $adsReady = $this->metaAds->isConfigured() || $this->googleAds->isConfigured();
        $pixelReady = filled(config('services.meta_pixel.pixel_id'));

        $definitions = [
            'seo' => [
                'dependencies' => [
                    'Web Analytics' => $hasAnalytics,
                    'Google Search Console' => $googleConnected,
                    'Google Business Profile' => $gbpReady,
                    'LLM Orchestration' => $aiReady,
                ],
                'ready' => $aiReady,
            ],
            'content' => [
                'dependencies' => [
                    'Collection & Product Data' => true,
                    'Social publishing APIs' => $this->metaGraph->isConfigured(),
                    'LLM Orchestration' => $aiReady,
                ],
                'ready' => $aiReady,
            ],
            'ads' => [
                'dependencies' => [
                    'Meta Ads API' => $this->metaAds->isConfigured(),
                    'Google Ads API' => $this->googleAds->isConfigured(),
                    'Meta Pixel & CAPI' => $pixelReady,
                    'LLM Orchestration' => $aiReady,
                ],
                'ready' => $aiReady && $adsReady,
            ],
            'leads' => [
                'dependencies' => [
                    'Lead & CRM Data' => true,
                    'WhatsApp (LiviBot)' => $waReady,
                    'Email sequencing' => $mailReady,
                    'LLM Orchestration' => $aiReady,
                ],
                'ready' => $aiReady,
            ],
            'cro' => [
                'dependencies' => [
                    'Web Analytics' => $hasAnalytics,
                    'Session behaviour capture' => true,
                    'LLM Orchestration' => $aiReady,
                ],
                'ready' => $aiReady,
            ],
        ];

        foreach ($definitions as $agentKey => $config) {
            $agent = AiAgent::where('key', $agentKey)->first();
            if (! $agent) {
                continue;
            }

            $deps = [];
            foreach ($config['dependencies'] as $depName => $connected) {
                $deps[] = [
                    'name' => $depName,
                    'state' => $connected ? 'connected' : 'not_connected',
                ];
            }

            $status = $agent->status;
            if ($status === 'coming_soon' || ! $status) {
                $status = $agent->last_run_at ? 'active' : ($config['ready'] ? 'paused' : 'paused');
            }

            $agent->update([
                'dependencies' => $deps,
                'connection_state' => $config['ready'] ? 'connected' : 'not_connected',
                'status' => $status,
            ]);
        }
    }
}
