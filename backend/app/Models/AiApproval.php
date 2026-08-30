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

    public function recommendation()
    {
        return $this->belongsTo(AiRecommendation::class, 'recommendation_id');
    }

    public function agent()
    {
        return $this->belongsTo(AiAgent::class, 'agent_key', 'key');
    }
}