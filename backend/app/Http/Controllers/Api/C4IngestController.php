<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\C4\FrontendIngest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Endpoint untuk CI (npm run c4:scan). Dilindungi token statis C4_INGEST_TOKEN
 * (header X-C4-Token). Kosong = endpoint mati. Hanya menulis ke tabel c4_*.
 */
class C4IngestController extends Controller
{
    public function frontend(Request $r, FrontendIngest $ingest): JsonResponse
    {
        $token = (string) config('c4.ingest_token');
        if ($token === '' || !hash_equals($token, (string) $r->header('X-C4-Token'))) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }
        $payload = $r->json()->all();
        if (!isset($payload['pages']) || !is_array($payload['pages'])) {
            return response()->json(['message' => 'Format tidak valid'], 422);
        }
        $run = $ingest->ingest($payload, 'ingest');

        return response()->json(['status' => $run->status, 'stats' => $run->stats, 'warnings' => $run->warnings]);
    }
}
