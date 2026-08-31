<?php

namespace App\Http\Controllers;

use App\Models\AiAgent;
use App\Services\Google\GoogleOAuthState;
use App\Services\Google\GoogleOAuthTokenStore;
use Google_Client;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * Target redirect dari Google OAuth consent screen. SENGAJA tidak pakai
 * middleware auth:sanctum — Google redirect browser biasa, tidak bawa
 * Bearer token. Proteksinya lewat verifikasi `state` (GoogleOAuthState),
 * bukan lewat sesi admin.
 *
 * Kalau state invalid/expired atau Google mengirim error, JANGAN simpan
 * apapun — redirect balik ke frontend dengan status gagal yang jujur.
 */
class GoogleOAuthCallbackController extends Controller
{
    private const FRONTEND_RETURN_URL = 'https://livoralcr.com/admin/ai-marketing/seo';

    public function handle(Request $request, GoogleOAuthTokenStore $tokens)
    {
        if ($request->query('error')) {
            Log::warning('Google OAuth callback error', ['error' => $request->query('error')]);
            return redirect(self::FRONTEND_RETURN_URL.'?google=denied');
        }

        if (!GoogleOAuthState::verify($request->query('state'))) {
            Log::warning('Google OAuth callback: state tidak valid atau kadaluarsa');
            return redirect(self::FRONTEND_RETURN_URL.'?google=invalid_state');
        }

        $code = $request->query('code');

        if (!$code) {
            return redirect(self::FRONTEND_RETURN_URL.'?google=missing_code');
        }

        $client = new Google_Client();
        $client->setClientId(config('services.google_marketing.client_id'));
        $client->setClientSecret(config('services.google_marketing.client_secret'));
        $client->setRedirectUri(config('services.google_marketing.redirect_uri'));

        $tokenResponse = $client->fetchAccessTokenWithAuthCode($code);

        if (isset($tokenResponse['error'])) {
            Log::error('Google OAuth token exchange gagal', ['error' => $tokenResponse]);
            return redirect(self::FRONTEND_RETURN_URL.'?google=exchange_failed');
        }

        $email = null;
        if (!empty($tokenResponse['id_token'])) {
            try {
                $payload = $client->verifyIdToken($tokenResponse['id_token']);
                $email = $payload['email'] ?? null;
            } catch (\Throwable $e) {
                Log::warning('Gagal decode id_token Google (non-fatal): '.$e->getMessage());
            }
        }

        $tokens->save($tokenResponse, $email);
        AiAgent::setDependencyState('seo', 'Google Search Console', 'connected');

        return redirect(self::FRONTEND_RETURN_URL.'?google=connected');
    }
}