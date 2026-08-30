<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AiCampaign extends Model
{
    use HasFactory;

    protected $fillable = [
        'name', 'channel', 'health', 'status', 'summary', 'budget_daily',
        'goals', 'plan', 'active_experiments', 'related_recommendation_ids',
        'spark', 'metric',
    ];

    protected $casts = [
        'goals' => 'array',
        'plan' => 'array',
        'active_experiments' => 'array',
        'related_recommendation_ids' => 'array',
        'spark' => 'array',
        'metric' => 'array',
    ];
}