<?php

namespace App\Http\Controllers\Api\Ai;

use App\Http\Controllers\Controller;
use App\Http\Resources\Ai\AiInsightResource;
use App\Models\AiInsight;
use Illuminate\Http\Request;

class InsightController extends Controller
{
    /**
     * GET /api/ai/insights?type=opportunity&agent=seo&limit=100
     *
     * Tidak ada data karangan: kalau tabel ai_insights masih kosong,
     * endpoint ini mengembalikan array kosong dan UI menampilkan empty state.
     */
    public function index(Request $request)
    {
        $query = AiInsight::query()->orderByDesc('created_at');

        if ($type = $request->query('type')) {
            $query->where('type', $type);
        }

        if ($agent = $request->query('agent')) {
            $query->where('agent_key', $agent);
        }

        $limit = (int) $request->query('limit', 100);
        $limit = max(1, min($limit, 200));

        return AiInsightResource::collection($query->limit($limit)->get());
    }

    public function show(AiInsight $insight)
    {
        return new AiInsightResource($insight);
    }
}
