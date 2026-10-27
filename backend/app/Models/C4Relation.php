<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Relasi antar elemen C4 (panah). Aturan source/overrides sama seperti C4Element. */
class C4Relation extends Model
{
    public const OVERRIDABLE = ['label', 'technology', 'domain_key', 'note'];

    public const KINDS = ['uses', 'calls', 'data', 'fk', 'external', 'inbound', 'schedules'];

    protected $table = 'c4_relations';

    protected $fillable = [
        'key', 'from_key', 'to_key', 'kind', 'label', 'technology', 'weight', 'domain_key',
        'meta', 'source', 'scan_group', 'is_hidden', 'overrides', 'auto_state',
        'first_seen_at', 'last_seen_at', 'stale_since', 'created_by',
    ];

    protected $casts = [
        'weight' => 'integer',
        'meta' => 'array',
        'overrides' => 'array',
        'is_hidden' => 'boolean',
        'first_seen_at' => 'datetime',
        'last_seen_at' => 'datetime',
        'stale_since' => 'datetime',
    ];

    public function effective(string $field): mixed
    {
        $o = $this->overrides ?? [];
        if (array_key_exists($field, $o) && $o[$field] !== null && $o[$field] !== '') {
            return $o[$field];
        }

        return $this->getAttribute($field);
    }

    public function toGraph(): array
    {
        $o = $this->overrides ?? [];

        return [
            'id' => $this->id,
            'key' => $this->key,
            'from' => $this->from_key,
            'to' => $this->to_key,
            'kind' => $this->kind,
            'label' => $this->effective('label'),
            'technology' => $this->effective('technology'),
            'weight' => $this->weight,
            'domain_key' => $this->effective('domain_key'),
            'note' => $o['note'] ?? null,
            'meta' => $this->meta ?? new \stdClass(),
            'source' => $this->source,
            'scan_group' => $this->scan_group,
            'hidden' => (bool) $this->is_hidden,
            'state' => $this->auto_state,
            'overridden' => array_values(array_keys(array_filter($o, fn ($v) => $v !== null && $v !== ''))),
            'first_seen_at' => $this->first_seen_at?->toIso8601String(),
            'last_seen_at' => $this->last_seen_at?->toIso8601String(),
        ];
    }
}
