<?php

namespace App\Http\Controllers\Api\Ai;

use App\Http\Controllers\Controller;
use App\Http\Resources\Ai\AiImpactRecordResource;
use App\Models\AiImpactRecord;

class ImpactController extends Controller
{
    public function index()
    {
        return AiImpactRecordResource::collection(
            AiImpactRecord::orderByDesc('approved_at')->get()
        );
    }
}