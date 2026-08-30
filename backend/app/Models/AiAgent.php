<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AiAgent extends Model
{
    use HasFactory;

    protected $fillable = [
        'key', 'name', 'purpose', 'status', 'connection_state',
        'last_run_at', 'capabilities', 'dependencies', 'href',
    ];

    protected $casts = [
        'last_run_at' => 'datetime',
        'capabilities' => 'array',
        'dependencies' => 'array',
    ];

    public function insights()
    {
        return $this->hasMany(AiInsight::class, 'agent_key', 'key');
    }

    public function recommendations()
    {
        return $this->hasMany(AiRecommendation::class, 'agent_key', 'key');
    }

    public function approvals()
    {
        return $this->hasMany(AiApproval::class, 'agent_key', 'key');
    }

    public function activityLogs()
    {
        return $this->hasMany(AiActivityLog::class, 'agent_key', 'key');
    }

    public function usageLogs()
    {
        return $this->hasMany(AiUsageLog::class, 'agent_key', 'key');
    }
}