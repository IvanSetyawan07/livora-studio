<?php

namespace App\Http\Controllers\Api\Ai;

use App\Http\Controllers\Controller;
use App\Services\Meta\MetaGraphClient;
use App\Services\Meta\MetaGraphException;

/**
 * Status koneksi Meta Graph API (Facebook Page + Instagram Business) untuk
 * kartu "Instagram & Facebook" di halaman Content Agent.
 *
 * Read-only, tidak ada OAuth baru, tidak publishing. Access token dibaca
 * dari backend/.env lewat MetaGraphClient dan TIDAK PERNAH ikut dikirim ke
 * frontend — hanya page_id / account_id (bukan rahasia) dan hasil baca API.
 */
class MetaIntegrationController extends Controller
{
    public function __construct(private MetaGraphClient $meta)
    {
    }

    /**
     * GET /api/ai/content/meta/status
     */
    public function status()
    {
        $facebook = $this->facebookStatus();
        $instagram = $this->instagramStatus();

        return response()->json([
            'connected' => $facebook['connected'] && $instagram['connected'],
            'status' => $this->overallStatus($facebook['status'], $instagram['status']),
            'lastCheckedAt' => now()->toIso8601String(),
            'facebook' => $facebook,
            'instagram' => $instagram,
        ]);
    }

    /**
     * GET /api/ai/content/meta/facebook
     */
    public function facebook()
    {
        return response()->json($this->facebookStatus());
    }

    /**
     * GET /api/ai/content/meta/instagram
     */
    public function instagram()
    {
        return response()->json($this->instagramStatus());
    }

    /**
     * @return array{connected: bool, status: string, page_id: ?string, name: ?string}
     */
    private function facebookStatus(): array
    {
        try {
            $page = $this->meta->getFacebookPage();

            return [
                'connected' => true,
                'status' => 'ok',
                'page_id' => $page['id'],
                'name' => $page['name'],
            ];
        } catch (MetaGraphException $e) {
            return [
                'connected' => false,
                'status' => $e->status,
                'page_id' => $this->meta->pageId(),
                'name' => null,
            ];
        }
    }

    /**
     * @return array{connected: bool, status: string, account_id: ?string, username: ?string}
     */
    private function instagramStatus(): array
    {
        try {
            $account = $this->meta->getInstagramAccount();

            return [
                'connected' => true,
                'status' => 'ok',
                'account_id' => $account['id'],
                'username' => $account['username'],
            ];
        } catch (MetaGraphException $e) {
            return [
                'connected' => false,
                'status' => $e->status,
                'account_id' => $this->meta->instagramBusinessId(),
                'username' => null,
            ];
        }
    }

    /**
     * Gabungkan status Facebook + Instagram jadi satu status ringkasan.
     * Prioritas: invalid_token > permission_required > api_error >
     * not_configured > ok — supaya masalah yang paling butuh perhatian admin
     * (token invalid) tidak ketutup status "belum dikonfigurasi".
     */
    private function overallStatus(string $facebookStatus, string $instagramStatus): string
    {
        if ($facebookStatus === 'ok' && $instagramStatus === 'ok') {
            return 'ok';
        }

        $priority = ['invalid_token', 'permission_required', 'api_error', 'not_configured'];

        foreach ($priority as $candidate) {
            if ($facebookStatus === $candidate || $instagramStatus === $candidate) {
                return $candidate;
            }
        }

        return 'api_error';
    }
}