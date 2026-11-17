<?php

namespace App\Http\Controllers\Api\Ai;

use App\Http\Controllers\Controller;
use App\Http\Resources\Ai\AiAgentResource;
use App\Models\AiAgent;
use App\Models\AiProvider;
use App\Models\AiRoutingStrategy;
use App\Services\AI\AdsAgentService;
use App\Services\AI\AgentDependencyHealth;
use App\Services\AI\ContentAgentService;
use App\Services\AI\CroAgentService;
use App\Services\AI\LeadsAgentService;
use App\Services\AI\SeoAgentService;
use Database\Seeders\AiAgentSeeder;
use Database\Seeders\AiProviderSeeder;
use Database\Seeders\AiRoutingStrategySeeder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Throwable;

class AgentController extends Controller
{
    public function index(AgentDependencyHealth $health)
    {
        $this->ensureBootstrapped();
        $health->refresh();

        $agents = AiAgent::withCount([
            'insights',
            'recommendations',
            'approvals as pending_approvals_count' => fn ($q) => $q->where('status', 'pending'),
        ])->get();

        return AiAgentResource::collection($agents);
    }

    /**
     * POST /api/ai/agents/{key}/run
     * Trigger satu agent AI Marketing (atau 'all') langsung dari Admin UI.
     */
    public function run(
        Request $request,
        string $key,
        SeoAgentService $seoAgent,
        CroAgentService $croAgent,
        ContentAgentService $contentAgent,
        AdsAgentService $adsAgent,
        LeadsAgentService $leadsAgent,
        AgentDependencyHealth $health,
    ) {
        $this->ensureBootstrapped();

        $key = strtolower(trim($key));
        $limit = max(1, min(10, (int) $request->input('limit', 5)));

        $services = [
            'seo' => $seoAgent,
            'cro' => $croAgent,
            'content' => $contentAgent,
            'ads' => $adsAgent,
            'leads' => $leadsAgent,
        ];

        if ($key === 'all') {
            $lock = Cache::lock('ai:run-agent:all', 180);
            if (! $lock->get()) {
                return response()->json(['message' => 'Siklus analisis AI sedang berjalan. Tunggu sebentar lalu muat ulang.'], 409);
            }

            try {
                $results = [];
                foreach ($services as $k => $svc) {
                    $results[$k] = $this->executeSingle($k, $svc, $limit);
                }
                $health->refresh();

                return response()->json([
                    'status' => 'ok',
                    'results' => $results,
                ]);
            } finally {
                $lock->release();
            }
        }

        if (! isset($services[$key])) {
            return response()->json([
                'message' => "Agent '{$key}' tidak ditemukan.",
            ], 404);
        }

        $lock = Cache::lock("ai:run-agent:{$key}", 120);
        if (! $lock->get()) {
            return response()->json([
                'message' => 'Agent ini sedang berjalan. Tunggu sampai selesai sebelum memicu ulang.',
            ], 409);
        }

        try {
            $result = $this->executeSingle($key, $services[$key], $limit);
            $health->refresh();

            return response()->json($result, ($result['status'] ?? 'error') === 'error' ? 422 : 200);
        } finally {
            $lock->release();
        }
    }

    private function executeSingle(string $key, object $service, int $limit): array
    {
        $agent = AiAgent::where('key', $key)->first();
        $prevStatus = $agent?->status ?? 'paused';

        if ($agent) {
            $agent->update(['status' => 'running']);
        }

        try {
            $result = $service->run($limit);
            if ($agent) {
                $newStatus = match ($result['status'] ?? 'error') {
                    'ok' => 'active',
                    'empty' => $agent->last_run_at ? 'active' : 'paused',
                    default => $prevStatus === 'running' ? 'error' : $prevStatus,
                };
                $agent->update(['status' => $newStatus]);
            }

            return $result + ['agent' => $key];
        } catch (Throwable $e) {
            if ($agent) {
                $agent->update(['status' => 'error']);
            }

            return [
                'agent' => $key,
                'status' => 'error',
                'message' => $e->getMessage(),
            ];
        }
    }

    private function ensureBootstrapped(): void
    {
        if (AiAgent::count() === 0) {
            app(AiAgentSeeder::class)->run();
        }
        if (AiProvider::count() === 0) {
            app(AiProviderSeeder::class)->run();
        }
        if (AiRoutingStrategy::count() === 0) {
            app(AiRoutingStrategySeeder::class)->run();
        }
    }
}
