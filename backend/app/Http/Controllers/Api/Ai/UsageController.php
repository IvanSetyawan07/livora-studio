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
            'costToday' => (float) (clone $today)->sum('cost'),
            'costMonth' => (float) (clone $month)->sum('cost'),
            // Panggilan yang harganya belum terdaftar di AiPricing: costnya null,
            // bukan 0. Frontend memakai angka ini untuk bilang "not tracked yet"
            // alih-alih menampilkan $0 yang menyesatkan.
            'untrackedToday' => (int) (clone $today)->whereNull('cost')->count(),
            'untrackedMonth' => (int) (clone $month)->whereNull('cost')->count(),
            // Belum ada baseline historis (minggu lalu, dsb) untuk dibandingkan.
            'requestsDeltaLabel' => '',
        ]);
    }

    public function byAgent()
    {
        $rows = AiUsageLog::select('agent_key')
            ->selectRaw('SUM(cost) as cost, COUNT(*) as requests, SUM(input_tokens + output_tokens) as tokens, SUM(CASE WHEN cost IS NULL THEN 1 ELSE 0 END) as untracked')
            ->whereNotNull('agent_key')
            ->groupBy('agent_key')
            ->get();

        return response()->json($rows->map(fn ($r) => [
            'agent' => $r->agent_key,
            'cost' => (float) $r->cost,
            'untracked' => (int) $r->untracked,
            'requests' => (int) $r->requests,
            'tokens' => (int) $r->tokens,
        ]));
    }

    public function byProvider()
    {
        $totalCost = (float) AiUsageLog::sum('cost');

        $rows = AiUsageLog::select('provider')
            ->selectRaw('SUM(cost) as cost, SUM(CASE WHEN cost IS NULL THEN 1 ELSE 0 END) as untracked')
            ->groupBy('provider')
            ->get();

        return response()->json($rows->map(fn ($r) => [
            'provider' => $r->provider,
            'cost' => (float) $r->cost,
            'untracked' => (int) $r->untracked,
            'share' => $totalCost > 0 ? round(((float) $r->cost / $totalCost) * 100, 1) : 0,
        ]));
    }
}