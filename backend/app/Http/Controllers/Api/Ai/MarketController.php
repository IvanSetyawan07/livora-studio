<?php

namespace App\Http\Controllers\Api\Ai;

use App\Http\Controllers\Controller;
use App\Services\AI\MarketIntelligenceService;
use Illuminate\Http\Request;

class MarketController extends Controller
{
    public function __construct(private MarketIntelligenceService $market)
    {
    }

    /** GET /api/ai/market/insights?focus=... */
    public function insights(Request $request)
    {
        $focus = (string) $request->query('focus', '');

        return response()->json($this->market->analyze($focus, false));
    }

    /** POST /api/ai/market/analyze { focus?, refresh? } */
    public function analyze(Request $request)
    {
        $data = $request->validate([
            'focus' => ['nullable', 'string', 'max:160'],
            'refresh' => ['nullable', 'boolean'],
        ]);

        return response()->json(
            $this->market->analyze((string) ($data['focus'] ?? ''), (bool) ($data['refresh'] ?? true))
        );
    }
}
