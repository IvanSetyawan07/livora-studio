<?php

namespace App\Http\Resources\Ai;

use Illuminate\Http\Resources\Json\JsonResource;

class AiAgentResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->key,
            'name' => $this->name,
            'purpose' => $this->purpose,
            'status' => $this->status,
            'connection' => $this->connection_state,
            'lastRun' => optional($this->last_run_at)->toISOString(),
            // Belum ada tracking task granular per agent — jujur dikembalikan 0,
            // bukan angka karangan. Isi nanti kalau ada tabel ai_tasks.
            'tasks' => 0,
            'insightsCount' => $this->insights_count ?? 0,
            'recommendationsCount' => $this->recommendations_count ?? 0,
            'pendingApprovals' => $this->pending_approvals_count ?? 0,
            'capabilities' => $this->capabilities ?? [],
            'dependencies' => $this->dependencies ?? [],
            'href' => $this->href,
        ];
    }
}