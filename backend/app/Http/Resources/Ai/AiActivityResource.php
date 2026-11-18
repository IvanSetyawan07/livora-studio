<?php

namespace App\Http\Resources\Ai;

use Illuminate\Http\Resources\Json\JsonResource;

class AiActivityResource extends JsonResource
{
    public function toArray($request): array
    {
        $recId = $this->recommendation_id ? (string) $this->recommendation_id : null;
        $href = $this->href ?: self::resolveDefaultHref($this->agent_key, $this->kind, $recId);
        $title = $this->title ?: self::defaultTitle($this->agent_key, $this->kind);

        return [
            'id' => (string) $this->id,
            'time' => optional($this->created_at)->toISOString(),
            'actor' => $this->actor,
            'agent' => $this->agent_key,
            'title' => $title,
            'message' => $this->message,
            'kind' => $this->kind,
            'recommendationId' => $recId,
            'href' => $href,
            'read' => $this->read_at !== null,
            'readAt' => optional($this->read_at)->toISOString(),
            'payload' => $this->payload,
            'nextReviewAt' => optional($this->next_review_at)->toISOString(),
        ];
    }

    public static function resolveDefaultHref(?string $agentKey, ?string $kind, ?string $recommendationId = null): string
    {
        $agentPath = match ($agentKey) {
            'seo' => '/admin/ai-marketing/seo',
            'content' => '/admin/ai-marketing/content',
            'ads' => '/admin/ai-marketing/ads',
            'leads' => '/admin/ai-marketing/leads',
            'cro' => '/admin/ai-marketing/cro',
            default => '/admin/ai-marketing',
        };

        return match ($kind) {
            'recommendation' => $recommendationId
                ? "/admin/ai-marketing/ai-center/recommendations?highlight={$recommendationId}"
                : '/admin/ai-marketing/ai-center/recommendations',
            'approval' => '/admin/ai-marketing/ai-center/actions',
            'execution', 'draft' => '/admin/ai-marketing/impact',
            'insight' => $agentPath !== '/admin/ai-marketing' ? $agentPath : '/admin/ai-marketing/insights',
            default => $agentPath,
        };
    }

    public static function defaultTitle(?string $agentKey, ?string $kind): string
    {
        $agentLabel = match ($agentKey) {
            'seo' => 'SEO Agent',
            'content' => 'Content Agent',
            'ads' => 'Ads Agent',
            'leads' => 'Lead Intelligence',
            'cro' => 'CRO Agent',
            default => 'AI System',
        };

        $kindLabel = match ($kind) {
            'insight' => 'Insight Baru',
            'recommendation' => 'Rekomendasi Baru',
            'approval' => 'Status Approval',
            'execution' => 'Eksekusi Selesai',
            'draft' => 'Draft Aksi Siap',
            default => 'Aktivitas',
        };

        return "{$agentLabel} · {$kindLabel}";
    }
}
