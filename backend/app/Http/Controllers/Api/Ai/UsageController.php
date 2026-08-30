<?php

namespace App\Http\Controllers\Api\Ai;

use App\Http\Controllers\Controller;
use App\Models\AiUsageLog;

class UsageController extends Controller
{
    public function totals()
    {
        $today = AiUsageLog::whereDate('created_at', now()->toDateString());
        $month = AiUsageLog::whereBetween('created_at', [now()->startOfMonth(), now()->endOfMonth()]);

        return response()->json([
            'requests' => AiUsageLog::count(),
            'inputTokens' => (int) AiUsageLog::sum('input_tokens'),
            'outputTokens' => (int) AiUsageLog::sum('output_tokens'),
            'costToday' => (float) $today->sum('cost'),
            'costMonth' => (float) $month->sum('cost'),
            // Belum ada baseline historis (minggu lalu, dsb) untuk dibandingkan.
            'requestsDeltaLabel' => '',
        ]);
    }

    public function byAgent()
    {
        $rows = AiUsageLog::select('agent_key')
            ->selectRaw('SUM(cost) as cost, COUNT(*) as requests, SUM(input_tokens + output_tokens) as tokens')
            ->whereNotNull('agent_key')
            ->groupBy('agent_key')
            ->get();

        return response()->json($rows->map(fn ($r) => [
            'agent' => $r->agent_key,
            'cost' => (float) $r->cost,
            'requests' => (int) $r->requests,
            'tokens' => (int) $r->tokens,
        ]));
    }

    public function byProvider()
    {
        $totalCost = (float) AiUsageLog::sum('cost');

        $rows = AiUsageLog::select('provider')
            ->selectRaw('SUM(cost) as cost')
            ->groupBy('provider')
            ->get();

        return response()->json($rows->map(fn ($r) => [
            'provider' => $r->provider,
            'cost' => (float) $r->cost,
            'share' => $totalCost > 0 ? round(((float) $r->cost / $totalCost) * 100, 1) : 0,
        ]));
    }
}