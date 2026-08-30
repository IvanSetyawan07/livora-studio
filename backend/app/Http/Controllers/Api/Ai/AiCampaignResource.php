<?php

namespace App\Http\Resources\Ai;

use Illuminate\Http\Resources\Json\JsonResource;

class AiCampaignResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => (string) $this->id,
            'name' => $this->name,
            'channel' => $this->channel,
            'health' => $this->health,
            'status' => $this->status,
            'summary' => $this->summary,
            'budgetDaily' => $this->budget_daily,
            'goals' => $this->goals ?? [],
            'plan' => $this->plan ?? [],
            'activeExperiments' => $this->active_experiments ?? [],
            'relatedRecommendationIds' => $this->related_recommendation_ids ?? [],
            'spark' => $this->spark ?? [],
            'metric' => $this->metric ?? ['label' => '', 'value' => '', 'deltaLabel' => '', 'deltaDirection' => 'flat'],
        ];
    }
}