<?php

namespace App\Services\C4;

use App\Models\C4Domain;
use App\Models\C4Element;
use App\Models\C4Relation;

/**
 * Menyamakan tabel c4_* dengan draf hasil scan.
 *  - elemen/relasi auto baru   → dibuat
 *  - berubah                   → base diperbarui (override pengguna tetap utuh)
 *  - hilang dari website       → ditandai stale (bukan dihapus; ada riwayatnya)
 *  - muncul lagi               → dipulihkan
 *  - elemen manual             → TIDAK pernah disentuh
 * Hanya menulis ke tabel c4_*.
 */
class Reconciler
{
    private const ELEMENT_FIELDS = ['level', 'kind', 'name', 'technology', 'description', 'domain_key', 'parent_key', 'scan_group'];

    private const RELATION_FIELDS = ['kind', 'label', 'technology', 'weight', 'domain_key', 'scan_group'];

    private const MAX_CHANGES = 400;

    /** @return array{stats: array, changes: array} */
    public function apply(GraphDraft $d, ?callable $onProgress = null): array
    {
        $now = now();
        $changes = [];
        $stats = [
            'elements' => ['added' => 0, 'updated' => 0, 'stale' => 0, 'restored' => 0],
            'relations' => ['added' => 0, 'updated' => 0, 'stale' => 0, 'restored' => 0],
        ];
        $note = function (string $type, string $action, string $key, string $name) use (&$changes) {
            if (count($changes) < self::MAX_CHANGES) {
                $changes[] = compact('type', 'action', 'key', 'name');
            }
        };

        $this->seedDomains();

        // ── Elemen ──
        $existing = C4Element::where('source', 'auto')->get()->keyBy('key');
        foreach ($d->elements as $key => $data) {
            $row = $existing[$key] ?? null;
            $payload = array_intersect_key($data, array_flip(self::ELEMENT_FIELDS));
            $payload['meta'] = $data['meta'] ?? [];

            if (!$row) {
                C4Element::create($payload + [
                    'key' => $key, 'source' => 'auto', 'auto_state' => 'present',
                    'first_seen_at' => $now, 'last_seen_at' => $now,
                ]);
                $stats['elements']['added']++;
                $note('element', 'added', $key, $data['name']);

                continue;
            }

            $dirty = false;
            foreach ($payload as $f => $v) {
                if ($f === 'meta') {
                    if (json_encode($row->meta) !== json_encode($v)) {
                        $row->meta = $v;
                        $dirty = true;
                    }
                } elseif ($row->{$f} != $v) {
                    $row->{$f} = $v;
                    $dirty = true;
                }
            }
            if ($row->auto_state === 'stale') {
                $row->auto_state = 'present';
                $row->stale_since = null;
                $stats['elements']['restored']++;
                $note('element', 'restored', $key, $data['name']);
                $dirty = true;
            } elseif ($dirty) {
                $stats['elements']['updated']++;
                $note('element', 'updated', $key, $data['name']);
            }
            $row->last_seen_at = $now;
            $row->save();
        }
        foreach ($existing as $key => $row) {
            if (isset($d->elements[$key]) || $row->auto_state === 'stale') {
                continue;
            }
            if (!in_array($row->scan_group, $d->okGroups, true)) {
                continue; // scanner grup ini gagal/tidak jalan — jangan menyimpulkan "hilang"
            }
            $row->update(['auto_state' => 'stale', 'stale_since' => $now]);
            $stats['elements']['stale']++;
            $note('element', 'stale', $key, $row->name);
        }

        // ── Relasi ──
        $existingR = C4Relation::where('source', 'auto')->get()->keyBy('key');
        foreach ($d->relations as $key => $data) {
            $row = $existingR[$key] ?? null;
            $payload = array_intersect_key($data, array_flip(self::RELATION_FIELDS));
            $payload['meta'] = $data['meta'] ?? [];
            $payload['domain_key'] = $payload['domain_key'] ?? ($d->elements[$data['from_key']]['domain_key'] ?? null);
            $label = ($data['kind'] ?? 'uses').' '.$data['from_key'].' → '.$data['to_key'];

            if (!$row) {
                C4Relation::create($payload + [
                    'key' => $key, 'from_key' => $data['from_key'], 'to_key' => $data['to_key'], 'source' => 'auto',
                    'auto_state' => 'present', 'first_seen_at' => $now, 'last_seen_at' => $now,
                ]);
                $stats['relations']['added']++;
                $note('relation', 'added', $key, $label);

                continue;
            }
            $dirty = false;
            foreach ($payload as $f => $v) {
                if ($f === 'meta') {
                    if (json_encode($row->meta) !== json_encode($v)) {
                        $row->meta = $v;
                        $dirty = true;
                    }
                } elseif ($row->{$f} != $v) {
                    $row->{$f} = $v;
                    $dirty = true;
                }
            }
            if ($row->auto_state === 'stale') {
                $row->auto_state = 'present';
                $row->stale_since = null;
                $stats['relations']['restored']++;
                $note('relation', 'restored', $key, $label);
                $dirty = true;
            } elseif ($dirty) {
                $stats['relations']['updated']++;
            }
            $row->last_seen_at = $now;
            $row->save();
        }
        foreach ($existingR as $key => $row) {
            if (isset($d->relations[$key]) || $row->auto_state === 'stale') {
                continue;
            }
            if (!in_array($row->scan_group, $d->okGroups, true)) {
                continue;
            }
            $row->update(['auto_state' => 'stale', 'stale_since' => $now]);
            $stats['relations']['stale']++;
            $note('relation', 'stale', $key, $row->kind.' '.$row->from_key.' → '.$row->to_key);
        }

        $stats['totals'] = [
            'elements' => C4Element::where('auto_state', 'present')->count(),
            'relations' => C4Relation::where('auto_state', 'present')->count(),
            'stale_elements' => C4Element::where('auto_state', 'stale')->count(),
            'manual_elements' => C4Element::where('source', 'manual')->count(),
            'manual_relations' => C4Relation::where('source', 'manual')->count(),
        ];

        return ['stats' => $stats, 'changes' => $changes];
    }

    /** Domain dari config dibuat bila belum ada — tidak menimpa suntingan warna/nama pengguna. */
    public function seedDomains(): void
    {
        $i = 0;
        foreach ((array) config('c4.domains', []) as $key => $d) {
            C4Domain::firstOrCreate(['key' => $key], [
                'name' => $d['name'], 'color' => $d['color'], 'description' => $d['description'] ?? null,
                'sort_order' => $i, 'source' => 'auto',
            ]);
            $i++;
        }
    }
}
