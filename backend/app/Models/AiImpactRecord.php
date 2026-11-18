<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AiImpactRecord extends Model
{
    use HasFactory;

    protected $fillable = [
        'recommendation_id', 'title', 'agent_key', 'approved_at',
        'metric_key', 'target_type', 'target_id', 'before_numeric',
        'metric_label', 'before_value', 'after', 'change_pct',
        'result', 'ai_conclusion',
    ];

    protected $casts = [
        'approved_at' => 'datetime',
        'before_numeric' => 'float',
        'target_id' => 'integer',
        'after' => 'array',
        'change_pct' => 'array',
    ];

    public function recommendation()
    {
        return $this->belongsTo(AiRecommendation::class, 'recommendation_id');
    }

    public function agent()
    {
        return $this->belongsTo(AiAgent::class, 'agent_key', 'key');
    }
}