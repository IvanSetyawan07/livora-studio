<?php

namespace App\Http\Controllers\Api\Ai;

use App\Http\Controllers\Controller;
use App\Http\Resources\Ai\AiProviderResource;
use App\Models\AiProvider;
use App\Models\AiRoutingStrategy;

class ProviderController extends Controller
{
    public function index()
    {
        return AiProviderResource::collection(AiProvider::all());
    }

    public function routingStrategy()
    {
        $strategy = AiRoutingStrategy::active()->first();

        // Belum ada AiRoutingStrategySeeder — kembalikan default "Balanced"
        // yang jujur (angka 0), bukan angka karangan, sampai strategi routing
        // beneran dibuat.
        if (!$strategy) {
            return response()->json([
                'name' => 'Balanced',
                'automatic' => true,
                'quality' => 0,
                'speed' => 0,
                'costEfficiency' => 0,
                'taskRouting' => [],
            ]);
        }

        return response()->json([
            'name' => $strategy->name,
            'automatic' => $strategy->automatic,
            'quality' => $strategy->quality,
            'speed' => $strategy->speed,
            'costEfficiency' => $strategy->cost_efficiency,
            'taskRouting' => $strategy->task_routing ?? [],
        ]);
    }
}