<?php

namespace App\Http\Controllers\Api\Ai;

use App\Http\Controllers\Controller;
use App\Http\Resources\Ai\AiCampaignResource;
use App\Models\AiCampaign;
use App\Services\AI\CampaignSyncService;

class CampaignController extends Controller
{
    public function index(CampaignSyncService $sync)
    {
        $sync->syncIfStale(10);

        return AiCampaignResource::collection(AiCampaign::orderByDesc('updated_at')->get());
    }

    public function show(AiCampaign $campaign)
    {
        return new AiCampaignResource($campaign);
    }

    public function sync(CampaignSyncService $sync)
    {
        $count = $sync->sync();

        return response()->json([
            'synced' => $count,
            'campaigns' => AiCampaignResource::collection(AiCampaign::orderByDesc('updated_at')->get()),
        ]);
    }
}
