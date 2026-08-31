<?php

namespace App\Http\Controllers\Api\Ai;

use App\Http\Controllers\Controller;
use App\Http\Resources\Ai\AiActivityResource;
use App\Models\AiActivityLog;
use Illuminate\Http\Request;

class ActivityController extends Controller
{
    /**
     * GET /api/ai/activity?agent=seo&kind=approval&limit=50
     */
    public function index(Request $request)
    {
        $query = AiActivityLog::query()->orderByDesc('created_at');

        if ($agent = $request->query('agent')) {
            $query->where('agent_key', $agent);
        }

        if ($kind = $request->query('kind')) {
            $query->where('kind', $kind);
        }

        $limit = (int) $request->query('limit', 50);
        $limit = max(1, min($limit, 200));

        return AiActivityResource::collection($query->limit($limit)->get());
    }
}
