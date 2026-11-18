<?php

namespace App\Http\Resources\Ai;

use App\Models\AiUsageLog;
use Illuminate\Http\Resources\Json\JsonResource;

class AiProviderResource extends JsonResource
{
    public function toArray($request): array
    {
        // Gunakan agregat yang sudah di-inject controller bila ada (menghindari N+1 query).
        if (isset($this->precomputed_cost)) {
            $providerCost = (float) $this->precomputed_cost;
            $totalCost = (float) ($this->precomputed_total_cost ?? 0.0);
            $untracked = (int) ($this->precomputed_untracked ?? 0);
        } else {
            $totalCost = (float) AiUsageLog::sum('cost');
            $providerCost = (float) AiUsageLog::where('provider', $this->provider)->sum('cost');
            $untracked = (int) AiUsageLog::where('provider', $this->provider)->whereNull('cost')->count();
        }

        return [
            'id' => (string) $this->id,
            'provider' => $this->provider,
            'model' => $this->model,
            'status' => $this->status,
            'usageShare' => $totalCost > 0 ? round(($providerCost / $totalCost) * 100, 1) : 0,
            'cost' => $providerCost,
            'untrackedRequests' => $untracked,
            'latencyMs' => $this->latency_ms ?? 0,
            'successRate' => (float) ($this->success_rate ?? 0),
        ];
    }
}