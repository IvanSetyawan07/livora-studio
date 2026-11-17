<?php

namespace App\Http\Controllers\Api\Ai;

use App\Http\Controllers\Controller;
use App\Http\Resources\Ai\AiImpactRecordResource;
use App\Models\AiImpactRecord;
use App\Services\AI\ImpactTrackerService;

class ImpactController extends Controller
{
    public function index()
    {
        return AiImpactRecordResource::collection(
            AiImpactRecord::orderByDesc('approved_at')->get()
        );
    }

    public function refresh(ImpactTrackerService $tracker)
    {
        $updated = $tracker->refreshAll();

        return response()->json([
            'updated' => $updated,
            'records' => AiImpactRecordResource::collection(
                AiImpactRecord::orderByDesc('approved_at')->get()
            ),
        ]);
    }
}
