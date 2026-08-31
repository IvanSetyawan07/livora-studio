<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AiProvider extends Model
{
    use HasFactory;

    protected $fillable = [
        'provider', 'model', 'status', 'latency_ms', 'success_rate',
        'rl_requests_limit', 'rl_requests_remaining',
        'rl_tokens_limit', 'rl_tokens_remaining',
        'rl_requests_reset_at', 'rl_tokens_reset_at', 'rl_note',
    ];

    protected $casts = [
        'success_rate' => 'decimal:2',
        'rl_requests_reset_at' => 'datetime',
        'rl_tokens_reset_at' => 'datetime',
    ];

    /** Semua pemakaian AI yang tercatat untuk provider ini. */
    public function usageLogs()
    {
        return $this->hasMany(AiUsageLog::class, 'provider', 'provider');
    }
}