<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AiActivityLog extends Model
{
    use HasFactory;

    // Tabelnya singular ('ai_activity_log'), beda dari tebakan default Laravel.
    protected $table = 'ai_activity_log';

    protected $fillable = [
        'actor', 'agent_key', 'message', 'kind', 'recommendation_id', 'next_review_at',
    ];

    protected $casts = [
        'next_review_at' => 'datetime',
    ];

    public function agent()
    {
        return $this->belongsTo(AiAgent::class, 'agent_key', 'key');
    }

    public function recommendation()
    {
        return $this->belongsTo(AiRecommendation::class, 'recommendation_id');
    }
}