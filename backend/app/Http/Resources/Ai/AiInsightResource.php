<?php

namespace App\Http\Resources\Ai;

use Illuminate\Http\Resources\Json\JsonResource;

class AiInsightResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id'               => (string) $this->id,
            'title'            => $this->title,
            'description'      => $this->description,
            'type'             => $this->type,
            'severity'         => $this->severity,
            'confidence'       => (int) $this->confidence,
            'source'           => $this->source ?? [],
            'agent'            => $this->agent_key,
            'reasoning'        => $this->reasoning,
            'whatHappened'     => $this->what_happened,
            'whyItMatters'     => $this->why_it_matters,
            'expectedImpact'   => $this->expected_impact,
            'metrics'          => $this->metrics,
            'analyticsHref'    => $this->analytics_href,
            'recommendationId' => $this->recommendation_id ? (string) $this->recommendation_id : null,
            'createdAt'        => optional($this->created_at)->toISOString(),
        ];
    }
}
