<?php

namespace App\Http\Controllers\Api\Ai;

use App\Http\Controllers\Controller;
use App\Http\Resources\Ai\AiAgentResource;
use App\Models\AiAgent;
use App\Services\AI\AgentDependencyHealth;

class AgentController extends Controller
{
    public function index(AgentDependencyHealth $health)
    {
        // Badge dependency selalu mencerminkan kredensial yang ada sekarang,
        // bukan hanya yang kebetulan pernah di-set saat OAuth SEO berhasil.
        $health->refresh();

        $agents = AiAgent::withCount([
            'insights',
            'recommendations',
            'approvals as pending_approvals_count' => fn ($q) => $q->where('status', 'pending'),
        ])->get();

        return AiAgentResource::collection($agents);
    }
}
