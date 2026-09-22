<?php

namespace App\Http\Controllers;

use App\Models\AiAgent;
use App\Services\Meta\MetaAdsOAuthState;
use App\Services\Meta\MetaAdsOAuthTokenStore;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Target redirect dari Meta (Facebook) OAuth consent screen. SENGAJA tidak
 * pakai middleware auth:sanctum — Meta redirect browser biasa, tidak bawa
 * Bearer token. Proteksinya lewat verifikasi `state` (MetaAdsOAuthState),
 * bukan lewat sesi admin. Pola ini 1:1 dengan GoogleOAuthCallbackController.
 *
 * Kalau state invalid/expired atau Meta mengirim error, JANGAN simpan
 * apapun — redirect balik ke frontend dengan status gagal yang jujur.
 */
class MetaAdsOAuthCallbackController extends Controller
{
    private const FRONTEND_RETURN_URL = 'https://livoralcr.com/admin/ai-marketing/settings';

    public function handle(Request $request, MetaAdsOAuthTokenStore $tokens)
    {
        if ($request->query('error')) {
            Log::warning('Meta Ads OAuth callback error', ['error' => $request->query('error')]);
            return redirect(self::FRONTEND_RETURN_URL.'?meta_ads=denied');
        }

        if (!MetaAdsOAuthState::verify($request->query('state'))) {
            Log::warning('Meta Ads OAuth callback: state tidak valid atau kadaluarsa');
            return redirect(self::FRONTEND_RETURN_URL.'?meta_ads=invalid_state');
        }

        $code = $request->query('code');

        if (!$code) {
            return redirect(self::FRONTEND_RETURN_URL.'?meta_ads=missing_code');
        }

        $version = (string) config('services.meta_ads.api_version', 'v21.0');
        $appId = config('services.meta_ads_oauth.app_id');
        $appSecret = config('services.meta_ads_oauth.app_secret');
        $redirectUri = config('services.meta_ads_oauth.redirect_uri');

        // 1) Code → short-lived user access token.
        $shortLived = Http::get("https://graph.facebook.com/{$version}/oauth/access_token", [
            'client_id' => $appId,
            'client_secret' => $appSecret,
            'redirect_uri' => $redirectUri,
            'code' => $code,
        ]);

        if (!$shortLived->successful() || !$shortLived->json('access_token')) {
            Log::error('Meta Ads OAuth: tukar code gagal', ['body' => $shortLived->body()]);
            return redirect(self::FRONTEND_RETURN_URL.'?meta_ads=exchange_failed');
        }

        // 2) Short-lived → long-lived token (~60 hari), supaya tidak perlu
        // login ulang tiap jam seperti short-lived token bawaan Facebook.
        $longLived = Http::get("https://graph.facebook.com/{$version}/oauth/access_token", [
            'grant_type' => 'fb_exchange_token',
            'client_id' => $appId,
            'client_secret' => $appSecret,
            'fb_exchange_token' => $shortLived->json('access_token'),
        ]);

        if (!$longLived->successful() || !$longLived->json('access_token')) {
            Log::error('Meta Ads OAuth: tukar long-lived token gagal', ['body' => $longLived->body()]);
            return redirect(self::FRONTEND_RETURN_URL.'?meta_ads=exchange_failed');
        }

        $accessToken = (string) $longLived->json('access_token');
        // Meta biasanya balas expires_in di sini; kalau tidak ada, asumsikan
        // default long-lived token (~60 hari) supaya tidak ketahan null.
        $expiresIn = (int) ($longLived->json('expires_in') ?? 5184000);

        // 3) Nama ad account buat ditampilkan di UI (best-effort, non-fatal
        // kalau gagal — token tetap disimpan, cuma accountName-nya null).
        $accountId = $this->normalizedAccountId(config('services.meta_ads.account_id'));
        $accountName = null;

        if ($accountId) {
            $accountInfo = Http::get("https://graph.facebook.com/{$version}/{$accountId}", [
                'fields' => 'name',
                'access_token' => $accessToken,
            ]);

            if ($accountInfo->successful()) {
                $accountName = $accountInfo->json('name');
            } else {
                Log::warning('Meta Ads OAuth: gagal ambil nama ad account (non-fatal)', [
                    'body' => $accountInfo->body(),
                ]);
            }
        }

        $tokens->save($accessToken, $expiresIn, $accountId, $accountName);
        AiAgent::setDependencyState('ads', 'Meta Ads API', 'connected');

        return redirect(self::FRONTEND_RETURN_URL.'?meta_ads=connected');
    }

    private function normalizedAccountId(?string $id): ?string
    {
        if (!filled($id)) {
            return null;
        }

        return str_starts_with($id, 'act_') ? $id : 'act_'.$id;
    }
}