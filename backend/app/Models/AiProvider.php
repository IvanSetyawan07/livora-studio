<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AiProvider extends Model
{
    use HasFactory;

    protected $fillable = [
        'provider', 'model', 'status', 'latency_ms', 'success_rate',
    ];

    protected $casts = [
        'success_rate' => 'decimal:2',
    ];

    /** Semua pemakaian AI yang tercatat untuk provider ini. */
    public function usageLogs()
    {
        return $this->hasMany(AiUsageLog::class, 'provider', 'provider');
    }
}