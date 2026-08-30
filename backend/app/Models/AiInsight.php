<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AiInsight extends Model
{
    use HasFactory;

    protected $fillable = [
        'title', 'description', 'type', 'severity', 'confidence', 'source',
        'agent_key', 'reasoning', 'what_happened', 'why_it_matters',
        'expected_impact', 'metrics', 'analytics_href', 'recommendation_id',
    ];

    protected $casts = [
        'source' => 'array',
        'metrics' => 'array',
        'confidence' => 'integer',
    ];

    public function agent()
    {
        return $this->belongsTo(AiAgent::class, 'agent_key', 'key');
    }

    /** Soft reference — recommendation dibuat dari insight ini, jika ada. */
    public function recommendation()
    {
        return $this->belongsTo(AiRecommendation::class, 'recommendation_id');
    }

    /** Semua recommendation yang lahir dari insight ini. */
    public function recommendations()
    {
        return $this->hasMany(AiRecommendation::class, 'insight_id');
    }
}