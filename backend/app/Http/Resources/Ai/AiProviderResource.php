<?php

namespace App\Http\Resources\Ai;

use App\Models\AiUsageLog;
use Illuminate\Http\Resources\Json\JsonResource;

class AiProviderResource extends JsonResource
{
    public function toArray($request): array
    {
        // usage_share & cost sengaja tidak disimpan di tabel ai_providers,
        // dihitung live dari ai_usage_logs supaya tidak pernah basi (lihat
        // catatan di migration create_ai_providers_table).
        $totalCost = (float) AiUsageLog::sum('cost');
        $providerCost = (float) AiUsageLog::where('provider', $this->provider)->sum('cost');

        return [
            'id' => (string) $this->id,
            'provider' => $this->provider,
            'model' => $this->model,
            'status' => $this->status,
            'usageShare' => $totalCost > 0 ? round(($providerCost / $totalCost) * 100, 1) : 0,
            'cost' => $providerCost,
            'latencyMs' => $this->latency_ms ?? 0,
            'successRate' => (float) ($this->success_rate ?? 0),
        ];
    }
}