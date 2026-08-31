<?php

namespace App\Http\Controllers\Api\Ai;

use App\Http\Controllers\Controller;
use App\Models\AiAgent;
use App\Services\Google\GoogleOAuthState;
use App\Services\Google\GoogleOAuthTokenStore;
use Google_Client;

class GoogleIntegrationController extends Controller
{
    private const SCOPES = [
        'https://www.googleapis.com/auth/webmasters.readonly',
        'openid',
        'email',
    ];

    public function __construct(private GoogleOAuthTokenStore $tokens)
    {
    }

    /**
     * GET /api/ai/integrations/google/authorize-url
     * Frontend redirect browser ke URL ini (window.location.href = url).
     */
    public function authorizeUrl()
    {
        $client = $this->baseClient();
        $client->setState(GoogleOAuthState::generate());
        $client->setAccessType('offline');
        $client->setPrompt('consent'); // paksa refresh_token keluar tiap kali connect
        $client->addScope(self::SCOPES);

        return response()->json(['url' => $client->createAuthUrl()]);
    }

    /**
     * GET /api/ai/integrations/google/status
     */
    public function status()
    {
        $info = $this->tokens->connectionInfo();

        return response()->json([
            'connected' => $info !== null,
            'email' => $info['email'] ?? null,
            'scope' => $info['scope'] ?? null,
            'connectedAt' => $info['connectedAt'] ?? null,
        ]);
    }

    /**
     * POST /api/ai/integrations/google/disconnect
     */
    public function disconnect()
    {
        $this->tokens->clear();
        AiAgent::setDependencyState('seo', 'Google Search Console', 'not_connected');

        return response()->json(['connected' => false]);
    }

    private function baseClient(): Google_Client
    {
        $client = new Google_Client();
        $client->setClientId(config('services.google_marketing.client_id'));
        $client->setClientSecret(config('services.google_marketing.client_secret'));
        $client->setRedirectUri(config('services.google_marketing.redirect_uri'));

        return $client;
    }
}