<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Elemen diagram C4 (orang, sistem, container, komponen, tabel).
 *
 * source=auto   → dibuat/diperbarui oleh scanner; suntingan pengguna masuk ke
 *                 `overrides` agar tidak tertimpa sinkronisasi berikutnya.
 * source=manual → dibuat pengguna; tidak pernah disentuh scanner.
 */
class C4Element extends Model
{
    /** Kolom yang boleh di-override pada elemen auto. */
    public const OVERRIDABLE = ['name', 'description', 'technology', 'domain_key', 'color', 'note'];

    public const KINDS = ['person', 'system', 'external', 'container', 'datastore', 'component', 'table'];

    protected $table = 'c4_elements';

    protected $fillable = [
        'key', 'level', 'kind', 'name', 'technology', 'description', 'domain_key', 'parent_key',
        'meta', 'source', 'scan_group', 'is_hidden', 'overrides', 'auto_state',
        'first_seen_at', 'last_seen_at', 'stale_since', 'created_by',
    ];

    protected $casts = [
        'level' => 'integer',
        'meta' => 'array',
        'overrides' => 'array',
        'is_hidden' => 'boolean',
        'first_seen_at' => 'datetime',
        'last_seen_at' => 'datetime',
        'stale_since' => 'datetime',
    ];

    /** Nilai efektif: base + overrides. */
    public function effective(string $field): mixed
    {
        $o = $this->overrides ?? [];
        if (array_key_exists($field, $o) && $o[$field] !== null && $o[$field] !== '') {
            return $o[$field];
        }

        return $this->getAttribute($field);
    }

    /** Bentuk JSON untuk frontend. */
    public function toGraph(): array
    {
        $o = $this->overrides ?? [];

        return [
            'id' => $this->id,
            'key' => $this->key,
            'level' => $this->level,
            'kind' => $this->kind,
            'name' => $this->effective('name'),
            'technology' => $this->effective('technology'),
            'description' => $this->effective('description'),
            'domain_key' => $this->effective('domain_key'),
            'color' => $o['color'] ?? null,
            'note' => $o['note'] ?? null,
            'parent_key' => $this->parent_key,
            'meta' => $this->meta ?? new \stdClass(),
            'source' => $this->source,
            'scan_group' => $this->scan_group,
            'hidden' => (bool) $this->is_hidden,
            'state' => $this->auto_state,
            'overridden' => array_values(array_keys(array_filter($o, fn ($v) => $v !== null && $v !== ''))),
            'first_seen_at' => $this->first_seen_at?->toIso8601String(),
            'last_seen_at' => $this->last_seen_at?->toIso8601String(),
            'stale_since' => $this->stale_since?->toIso8601String(),
        ];
    }
}
