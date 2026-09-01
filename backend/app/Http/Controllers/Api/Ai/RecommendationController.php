<?php

namespace App\Http\Controllers\Api\Ai;

use App\Http\Controllers\Controller;
use App\Http\Resources\Ai\AiRecommendationResource;
use App\Models\AiApproval;
use App\Models\AiRecommendation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class RecommendationController extends Controller
{
    /**
     * GET /api/ai/recommendations?status=pending&agent=seo&limit=50
     *
     * Filter `agent` ditambahkan supaya halaman agent (mis. SEO Agent) bisa
     * menampilkan rekomendasi miliknya sendiri tanpa harus mengambil semua
     * baris lalu memfilter di frontend. Nama query param-nya `agent`
     * (bukan `agent_key`) supaya konsisten dengan InsightController.
     */
    public function index(Request $request)
    {
        $query = AiRecommendation::query()->orderByDesc('created_at');

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        if ($agent = $request->query('agent')) {
            $query->where('agent_key', $agent);
        }

        if ($limit = (int) $request->query('limit')) {
            $query->limit(max(1, min($limit, 200)));
        }

        return AiRecommendationResource::collection($query->get());
    }

    public function show(AiRecommendation $recommendation)
    {
        return new AiRecommendationResource($recommendation);
    }

    public function approve(AiRecommendation $recommendation)
    {
        DB::transaction(function () use ($recommendation) {
            $recommendation->update(['status' => 'approved']);

            AiApproval::where('recommendation_id', $recommendation->id)->update([
                'status' => 'approved',
                'decided_by' => auth()->user()->name ?? 'You',
                'decided_at' => now(),
            ]);
        });

        return new AiRecommendationResource($recommendation->fresh());
    }

    public function reject(AiRecommendation $recommendation)
    {
        DB::transaction(function () use ($recommendation) {
            $recommendation->update(['status' => 'rejected']);

            AiApproval::where('recommendation_id', $recommendation->id)->update([
                'status' => 'rejected',
                'decided_by' => auth()->user()->name ?? 'You',
                'decided_at' => now(),
            ]);
        });

        return new AiRecommendationResource($recommendation->fresh());
    }
}
