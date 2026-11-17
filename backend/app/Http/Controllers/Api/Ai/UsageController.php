<?php

namespace App\Http\Controllers\Api\Ai;

use App\Http\Controllers\Controller;
use App\Models\AiUsageLog;
use App\Services\Marketing\MarketingPeriod;
use Illuminate\Http\Request;

class UsageController extends Controller
{
    public function totals(Request $request)
    {
        $period = MarketingPeriod::fromRequest($request, 30);
        $from = $period->fromDate().' 00:00:00';
        $to = $period->toDate().' 23:59:59';

        $scoped = AiUsageLog::whereBetween('created_at', [$from, $to]);
        $today = AiUsageLog::whereDate('created_at', now()->toDateString());
        $month = AiUsageLog::whereBetween('created_at', [now()->startOfMonth(), now()->endOfMonth()]);

        $prev = $period->previous();
        $prevRequests = AiUsageLog::whereBetween('created_at', [
            $prev->fromDate().' 00:00:00',
            $prev->toDate().' 23:59:59',
        ])->count();

        $requests = (clone $scoped)->count();
        $deltaLabel = '';
        if ($prevRequests > 0) {
            $pct = round((($requests - $prevRequests) / $prevRequests) * 100, 1);
            $deltaLabel = ($pct > 0 ? '+' : '')."{$pct}% vs prev {$period->days()}d";
        } elseif ($requests > 0) {
            $deltaLabel = "{$period->days()}d window";
        }

        return response()->json([
            'requests' => $requests,
            'inputTokens' => (int) (clone $scoped)->sum('input_tokens'),
            'outputTokens' => (int) (clone $scoped)->sum('output_tokens'),
            'costToday' => (float) (clone $today)->sum('cost'),
            'costMonth' => (float) (clone $month)->sum('cost'),
            'costPeriod' => (float) (clone $scoped)->sum('cost'),
            'untrackedToday' => (int) (clone $today)->whereNull('cost')->count(),
            'untrackedMonth' => (int) (clone $month)->whereNull('cost')->count(),
            'untrackedPeriod' => (int) (clone $scoped)->whereNull('cost')->count(),
            'requestsDeltaLabel' => $deltaLabel,
        ]);
    }

    public function byAgent(Request $request)
    {
        $period = MarketingPeriod::fromRequest($request, 30);
        $from = $period->fromDate().' 00:00:00';
        $to = $period->toDate().' 23:59:59';

        $rows = AiUsageLog::select('agent_key')
            ->selectRaw('SUM(cost) as cost, COUNT(*) as requests, SUM(input_tokens + output_tokens) as tokens, SUM(CASE WHEN cost IS NULL THEN 1 ELSE 0 END) as untracked')
            ->whereNotNull('agent_key')
            ->whereBetween('created_at', [$from, $to])
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

    public function byProvider(Request $request)
    {
        $period = MarketingPeriod::fromRequest($request, 30);
        $from = $period->fromDate().' 00:00:00';
        $to = $period->toDate().' 23:59:59';

        $totalCost = (float) AiUsageLog::whereBetween('created_at', [$from, $to])->sum('cost');

        $rows = AiUsageLog::select('provider')
            ->selectRaw('SUM(cost) as cost, COUNT(*) as requests, SUM(CASE WHEN cost IS NULL THEN 1 ELSE 0 END) as untracked')
            ->whereBetween('created_at', [$from, $to])
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
