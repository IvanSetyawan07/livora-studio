<?php

namespace App\Http\Controllers\Api\Ai;

use App\Http\Controllers\Controller;
use App\Http\Resources\Ai\AiAgentResource;
use App\Models\AiAgent;

class AgentController extends Controller
{
    public function index()
    {
        $agents = AiAgent::withCount([
            'insights',
            'recommendations',
            'approvals as pending_approvals_count' => fn ($q) => $q->where('status', 'pending'),
        ])->get();

        return AiAgentResource::collection($agents);
    }
}