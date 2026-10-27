<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Riwayat sinkronisasi website → C4. */
class C4SyncRun extends Model
{
    protected $table = 'c4_sync_runs';

    protected $fillable = [
        'trigger', 'status', 'stats', 'changes', 'warnings', 'error',
        'started_at', 'finished_at', 'duration_ms', 'triggered_by',
    ];

    protected $casts = [
        'stats' => 'array',
        'changes' => 'array',
        'warnings' => 'array',
        'started_at' => 'datetime',
        'finished_at' => 'datetime',
        'duration_ms' => 'integer',
    ];
}
