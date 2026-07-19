<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class UserActivity extends Model
{
    public $timestamps = false;

    protected $fillable = ['user_id', 'type', 'path', 'ip', 'user_agent', 'meta', 'created_at'];

    protected $casts = [
        'meta' => 'array',
        'created_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public static function log(int $userId, string $type, ?Request $request = null, ?array $meta = null, ?string $path = null): void
    {
        self::create([
            'user_id'    => $userId,
            'type'       => $type,
            'path'       => $path ?? ($request?->path()),
            'ip'         => $request?->ip(),
            'user_agent' => substr((string) ($request?->userAgent() ?? ''), 0, 500),
            'meta'       => $meta,
            'created_at' => now(),
        ]);
    }
}
