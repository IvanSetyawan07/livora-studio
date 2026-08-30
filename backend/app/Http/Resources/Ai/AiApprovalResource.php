<?php

namespace App\Http\Resources\Ai;

use Illuminate\Http\Resources\Json\JsonResource;

class AiApprovalResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => (string) $this->id,
            'recommendationId' => (string) $this->recommendation_id,
            'title' => $this->title,
            'summary' => $this->summary,
            'agent' => $this->agent_key,
            'risk' => $this->risk,
            'status' => $this->status,
            'requestedAt' => optional($this->requested_at)->toISOString(),
            'decidedBy' => $this->decided_by,
            'decidedAt' => optional($this->decided_at)->toISOString(),
        ];
    }
}