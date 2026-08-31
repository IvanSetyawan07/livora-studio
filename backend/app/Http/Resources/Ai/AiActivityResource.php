<?php

namespace App\Http\Resources\Ai;

use Illuminate\Http\Resources\Json\JsonResource;

class AiActivityResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id'               => (string) $this->id,
            // Frontend memakai `time` sebagai ISO string, diformat di UI.
            'time'             => optional($this->created_at)->toISOString(),
            'actor'            => $this->actor,
            'agent'            => $this->agent_key,
            'message'          => $this->message,
            'kind'             => $this->kind,
            'recommendationId' => $this->recommendation_id ? (string) $this->recommendation_id : null,
            'nextReviewAt'     => optional($this->next_review_at)->toISOString(),
        ];
    }
}
