<?php

namespace App\Http\Resources\Ai;

use Illuminate\Http\Resources\Json\JsonResource;

class AiRecommendationResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => (string) $this->id,
            'insightId' => $this->insight_id ? (string) $this->insight_id : null,
            'title' => $this->title,
            'description' => $this->description,
            'actionType' => $this->action_type,
            'risk' => $this->risk,
            'status' => $this->status,
            'expectedImpact' => $this->expected_impact,
            'confidence' => $this->confidence,
            'agent' => $this->agent_key,
            'createdAt' => optional($this->created_at)->toISOString(),
            'priority' => $this->priority,
            'why' => $this->why,
            'suggestedAction' => $this->suggested_action,
            // Accessor getChangeAttribute() di model sudah mengembalikan {from,to}|null
            'change' => $this->change,
        ];
    }
}