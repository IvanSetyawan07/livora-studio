<?php

namespace App\Http\Controllers\Api\Ai;

use App\Http\Controllers\Controller;
use App\Http\Resources\Ai\AiProviderResource;
use App\Models\AiProvider;
use App\Models\AiRoutingStrategy;
use App\Models\AiSetting;
use App\Models\AiUsageLog;
use App\Services\AI\AIProviderManager;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;

class ProviderController extends Controller
{
    public function index(AIProviderManager $manager)
    {
        $manager->syncConfiguredProviders();

        $providers = AiProvider::all();
        $totalCost = 0.0;
        $costByProvider = [];
        $untrackedByProvider = [];

        if (Schema::hasTable('ai_usage_logs')) {
            $stats = AiUsageLog::query()
                ->selectRaw('provider, COALESCE(SUM(cost), 0) as total_cost, SUM(CASE WHEN cost IS NULL THEN 1 ELSE 0 END) as untracked_count')
                ->groupBy('provider')
                ->get();

            foreach ($stats as $row) {
                $c = (float) $row->total_cost;
                $costByProvider[$row->provider] = $c;
                $untrackedByProvider[$row->provider] = (int) $row->untracked_count;
                $totalCost += $c;
            }
        }

        foreach ($providers as $p) {
            $p->precomputed_cost = $costByProvider[$p->provider] ?? 0.0;
            $p->precomputed_total_cost = $totalCost;
            $p->precomputed_untracked = $untrackedByProvider[$p->provider] ?? 0;
        }

        return AiProviderResource::collection($providers);
    }

    public function sync(AIProviderManager $manager)
    {
        $manager->syncConfiguredProviders();

        return $this->index($manager);
    }

    public function test(string $provider, AIProviderManager $manager)
    {
        try {
            $res = $manager->testProvider($provider);

            return response()->json($res);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 404);
        } catch (\Throwable $e) {
            return response()->json([
                'provider' => $provider,
                'status' => 'degraded',
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    public function routingStrategy()
    {
        $strategy = AiRoutingStrategy::active()->first();

        if (!$strategy) {
            return response()->json([
                'name' => 'Balanced',
                'automatic' => true,
                'quality' => 0,
                'speed' => 0,
                'costEfficiency' => 0,
                'taskRouting' => [],
            ]);
        }

        return response()->json([
            'name' => $strategy->name,
            'automatic' => $strategy->automatic,
            'quality' => $strategy->quality,
            'speed' => $strategy->speed,
            'costEfficiency' => $strategy->cost_efficiency,
            'taskRouting' => $strategy->task_routing ?? [],
        ]);
    }

    /**
     * Snapshot kuota terakhir per provider — dibaca dari header respons API
     * asli tiap kali provider itu dipakai (lihat AIProviderManager). Gemini
     * tidak kirim header quota, jadi field-nya null + 'note' yang jujur.
     */
    public function quota()
    {
        $rows = AiProvider::all()->map(function (AiProvider $p) {
            $reqPct = ($p->rl_requests_limit && $p->rl_requests_limit > 0)
                ? round((1 - ($p->rl_requests_remaining / $p->rl_requests_limit)) * 100, 1)
                : null;
            $tokPct = ($p->rl_tokens_limit && $p->rl_tokens_limit > 0)
                ? round((1 - ($p->rl_tokens_remaining / $p->rl_tokens_limit)) * 100, 1)
                : null;

            return [
                'provider' => $p->provider,
                'requestsLimit' => $p->rl_requests_limit,
                'requestsRemaining' => $p->rl_requests_remaining,
                'requestsUsedPct' => $reqPct,
                'tokensLimit' => $p->rl_tokens_limit,
                'tokensRemaining' => $p->rl_tokens_remaining,
                'tokensUsedPct' => $tokPct,
                'requestsResetAt' => optional($p->rl_requests_reset_at)->toIso8601String(),
                'tokensResetAt' => optional($p->rl_tokens_reset_at)->toIso8601String(),
                'note' => $p->rl_note,
                'updatedAt' => optional($p->updated_at)->toIso8601String(),
            ];
        });

        return response()->json($rows);
    }

    public function getPreference()
    {
        return response()->json([
            'preferredProvider' => AiSetting::get('preferred_ai_provider'),
            'scope' => 'global',
        ]);
    }

    public function updatePreference(Request $request)
    {
        $validProviders = array_keys(config('ai.providers', []));

        $data = $request->validate([
            'preferredProvider' => ['nullable', 'string', 'in:'.implode(',', $validProviders)],
        ]);

        AiSetting::set('preferred_ai_provider', $data['preferredProvider'] ?? null);

        return response()->json([
            'preferredProvider' => $data['preferredProvider'] ?? null,
            'scope' => 'global',
        ]);
    }
}