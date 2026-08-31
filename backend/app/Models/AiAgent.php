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

    /**
     * Update state salah satu item di kolom `dependencies` (JSON array
     * {name, state}) berdasarkan nama dependency-nya. Dipakai saat sebuah
     * integrasi eksternal (Search Console, Meta, dst) berhasil/gagal
     * connect, tanpa menyentuh `status`/`connection_state` agent itu sendiri
     * (itu baru berubah kalau agent-nya benar-benar sudah pernah `run()`
     * dengan sukses).
     */
    public static function setDependencyState(string $agentKey, string $dependencyName, string $state): void
    {
        $agent = static::where('key', $agentKey)->first();

        if (!$agent) {
            return;
        }

        $dependencies = collect($agent->dependencies ?? [])->map(function ($dep) use ($dependencyName, $state) {
            if (($dep['name'] ?? null) === $dependencyName) {
                $dep['state'] = $state;
            }
            return $dep;
        })->toArray();

        $agent->update(['dependencies' => $dependencies]);
    }
}