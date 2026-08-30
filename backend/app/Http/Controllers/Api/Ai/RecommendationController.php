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
    public function index(Request $request)
    {
        $query = AiRecommendation::query()->orderByDesc('created_at');

        if ($status = $request->query('status')) {
            $query->where('status', $status);
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