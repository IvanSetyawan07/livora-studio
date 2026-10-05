<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AuditLog extends Model
{
    public $timestamps = false;

    protected $guarded = ['id'];

    protected $casts = ['before' => 'array', 'after' => 'array', 'created_at' => 'datetime'];

    public function user() { return $this->belongsTo(User::class); }

    public static function record(string $action, ?Model $object = null, ?array $before = null, ?array $after = null): void
    {
        try {
            static::create([
                'user_id' => auth()->id() ?? auth('sanctum')->id(),
                'action' => $action,
                'object_type' => $object ? class_basename($object) : null,
                'object_id' => $object?->getKey(),
                'before' => $before,
                'after' => $after,
                'ip_address' => request()?->ip(),
                'created_at' => now(),
            ]);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('Audit log gagal: '.$e->getMessage());
        }
    }
}
