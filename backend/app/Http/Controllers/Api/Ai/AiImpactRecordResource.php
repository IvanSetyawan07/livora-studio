<?php

namespace App\Http\Resources\Ai;

use Illuminate\Http\Resources\Json\JsonResource;

class AiImpactRecordResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => (string) $this->id,
            'recommendationId' => $this->recommendation_id ? (string) $this->recommendation_id : null,
            'title' => $this->title,
            'agent' => $this->agent_key,
            'approvedAt' => optional($this->approved_at)->toISOString(),
            'metricLabel' => $this->metric_label,
            'before' => $this->before_value,
            'after' => $this->after ?? [],
            'changePct' => $this->change_pct ?? [],
            'result' => $this->result,
            'aiConclusion' => $this->ai_conclusion,
        ];
    }
}