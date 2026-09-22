<?php

namespace App\Http\Controllers\Api\Ai;

use App\Http\Controllers\Controller;
use App\Models\AiAgent;
use App\Services\Meta\MetaAdsOAuthState;
use App\Services\Meta\MetaAdsOAuthTokenStore;

/**
 * Connect/Disconnect Meta Ads lewat OAuth — padanan GoogleIntegrationController
 * untuk Meta. Dipakai kartu "Meta Ads API" di Settings, pola UX-nya sama
 * seperti Google Search Console (klik Connect → redirect ke Facebook login
 * → balik ke dashboard dengan status Connected).
 *
 * Ad account yang dipakai TETAP dari META_ADS_ACCOUNT_ID di backend/.env
 * (lihat MetaAdsClient::accountId()) — OAuth di sini cuma menggantikan cara
 * dapetin access token-nya (yang sebelumnya paste manual System User token),
 * bukan mengganti cara pilih ad account. Kalau butuh ganti akun, tetap lewat
 * .env, bukan lewat UI ini.
 */
class MetaAdsOAuthController extends Controller
{
    private const SCOPES = ['ads_read', 'ads_management', 'business_management'];

    public function __construct(private MetaAdsOAuthTokenStore $tokens)
    {
    }

    /**
     * GET /api/ai/integrations/meta-ads/authorize-url
     * Frontend redirect browser ke URL ini (window.location.href = url).
     */
    public function authorizeUrl()
    {
        $params = http_build_query([
            'client_id' => config('services.meta_ads_oauth.app_id'),
            'redirect_uri' => config('services.meta_ads_oauth.redirect_uri'),
            'scope' => implode(',', self::SCOPES),
            'response_type' => 'code',
            'state' => MetaAdsOAuthState::generate(),
        ]);

        $version = (string) config('services.meta_ads.api_version', 'v21.0');

        return response()->json([
            'url' => "https://www.facebook.com/{$version}/dialog/oauth?{$params}",
        ]);
    }

    /**
     * GET /api/ai/integrations/meta-ads/status
     */
    public function status()
    {
        $info = $this->tokens->connectionInfo();

        return response()->json([
            'connected' => $info !== null,
            'accountId' => $info['accountId'] ?? null,
            'accountName' => $info['accountName'] ?? null,
            'expiresAt' => $info['expiresAt'] ?? null,
            'connectedAt' => $info['connectedAt'] ?? null,
        ]);
    }

    /**
     * POST /api/ai/integrations/meta-ads/disconnect
     */
    public function disconnect()
    {
        $this->tokens->clear();
        AiAgent::setDependencyState('ads', 'Meta Ads API', 'not_connected');

        return response()->json(['connected' => false]);
    }
}