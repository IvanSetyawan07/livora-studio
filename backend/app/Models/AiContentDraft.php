<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AiContentDraft extends Model
{
    use HasFactory;

    protected $fillable = [
        'recommendation_id',
        'marketing_campaign_id',
        'title',
        'channel',
        'headline',
        'caption',
        'body',
        'media_url',
        'cta_label',
        'cta_url',
        'target_type',
        'target_id',
        'status',
        'scheduled_for',
        'published_at',
        'external_id',
        'meta',
    ];

    protected $casts = [
        'scheduled_for' => 'datetime',
        'published_at' => 'datetime',
        'meta' => 'array',
    ];

    public function recommendation()
    {
        return $this->belongsTo(AiRecommendation::class, 'recommendation_id');
    }
}
