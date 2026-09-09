<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AiApproval extends Model
{
    use HasFactory;

    protected $fillable = [
        'recommendation_id', 'title', 'summary', 'agent_key', 'risk',
        'status', 'requested_at', 'decided_by', 'decided_at',
    ];

    protected $casts = [
        'requested_at' => 'datetime',
        'decided_at' => 'datetime',
    ];

    /**
     * Pastikan setiap recommendation punya baris approval pendamping.
     * Idempoten: dipanggil ulang tidak menggandakan baris.
     */
    public static function ensureForRecommendation(AiRecommendation $recommendation): self
    {
        return static::firstOrCreate(
            ['recommendation_id' => $recommendation->id],
            [
                'title' => $recommendation->title,
                'summary' => (string) ($recommendation->suggested_action
                    ?: $recommendation->description
                    ?: $recommendation->title),
                'agent_key' => $recommendation->agent_key,
                'risk' => $recommendation->risk ?? 'low',
                'status' => $recommendation->status === 'pending' ? 'pending' : $recommendation->status,
                'requested_at' => $recommendation->created_at ?? now(),
            ]
        );
    }

    public function recommendation()
    {
        return $this->belongsTo(AiRecommendation::class, 'recommendation_id');
    }

    public function agent()
    {
        return $this->belongsTo(AiAgent::class, 'agent_key', 'key');
    }
}