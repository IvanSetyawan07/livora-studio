<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AiRecommendation extends Model
{
    use HasFactory;

    protected $fillable = [
        'insight_id', 'title', 'description', 'action_type', 'risk', 'status',
        'expected_impact', 'confidence', 'agent_key', 'priority', 'why',
        'suggested_action', 'change_from', 'change_to',
    ];

    protected $casts = [
        'confidence' => 'integer',
    ];

    public function insight()
    {
        return $this->belongsTo(AiInsight::class, 'insight_id');
    }

    public function agent()
    {
        return $this->belongsTo(AiAgent::class, 'agent_key', 'key');
    }

    public function approvals()
    {
        return $this->hasMany(AiApproval::class, 'recommendation_id');
    }

    public function impactRecords()
    {
        return $this->hasMany(AiImpactRecord::class, 'recommendation_id');
    }

    /** Bentuk {from, to} sesuai kontrak frontend `change?: { from, to }`. */
    public function getChangeAttribute(): ?array
    {
        if ($this->change_from === null && $this->change_to === null) {
            return null;
        }

        return ['from' => $this->change_from, 'to' => $this->change_to];
    }
}