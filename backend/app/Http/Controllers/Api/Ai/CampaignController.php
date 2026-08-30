<?php

namespace App\Http\Controllers\Api\Ai;

use App\Http\Controllers\Controller;
use App\Http\Resources\Ai\AiCampaignResource;
use App\Models\AiCampaign;

class CampaignController extends Controller
{
    public function index()
    {
        return AiCampaignResource::collection(AiCampaign::orderByDesc('created_at')->get());
    }

    public function show(AiCampaign $campaign)
    {
        return new AiCampaignResource($campaign);
    }
}