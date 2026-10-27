<?php

namespace App\Services\C4;

/**
 * Draf graf hasil pemindaian (di memori). Scanner hanya mengisi objek ini;
 * penulisan ke database dilakukan Reconciler — dan hanya ke tabel c4_*.
 */
class GraphDraft
{
    /** @var array<string, array> */
    public array $elements = [];

    /** @var array<string, array> */
    public array $relations = [];

    /** @var string[] */
    public array $warnings = [];

    /** Relasi kerangka (orang/container) — ditambahkan saat finalize() setelah semua node ada. */
    public array $pendingSkeletonRelations = [];

    /** Grup scanner yang selesai tanpa error — hanya grup ini yang boleh menandai elemen "stale". */
    public array $okGroups = [];

    public function element(string $key, array $data): void
    {
        $defaults = [
            'key' => $key, 'level' => 3, 'kind' => 'component', 'name' => $key, 'technology' => null,
            'description' => null, 'domain_key' => 'core', 'parent_key' => null, 'meta' => [], 'scan_group' => 'code',
        ];
        $this->elements[$key] = array_merge($defaults, $this->elements[$key] ?? [], $data, ['key' => $key]);
    }

    public function hasElement(string $key): bool
    {
        return isset($this->elements[$key]);
    }

    /** Relasi unik per (from, kind, to); pemanggilan berulang menambah bobot & menggabung label. */
    public function relation(string $from, string $kind, string $to, array $data = []): void
    {
        if ($from === $to) {
            return;
        }
        $key = $from.'>'.$kind.'>'.$to;
        if (isset($this->relations[$key])) {
            $this->relations[$key]['weight']++;
            if (!empty($data['label']) && !str_contains((string) $this->relations[$key]['label'], $data['label'])) {
                $labels = array_filter(explode(' · ', (string) $this->relations[$key]['label']));
                if (count($labels) < 3) {
                    $labels[] = $data['label'];
                    $this->relations[$key]['label'] = implode(' · ', $labels);
                } elseif (!str_ends_with((string) $this->relations[$key]['label'], '…')) {
                    $this->relations[$key]['label'] .= ' · …';
                }
            }

            return;
        }
        $this->relations[$key] = array_merge([
            'key' => $key, 'from_key' => $from, 'to_key' => $to, 'kind' => $kind, 'label' => null,
            'technology' => null, 'weight' => 1, 'domain_key' => null, 'meta' => [], 'scan_group' => 'code',
        ], $data, ['key' => $key, 'from_key' => $from, 'to_key' => $to, 'kind' => $kind]);
    }

    public function warn(string $message): void
    {
        $this->warnings[] = $message;
    }

    /**
     * Tambahkan relasi kerangka, lalu buang relasi yang ujungnya tidak ada.
     * $knownElsewhere: key elemen yang sudah ada di database (mis. controller saat ingest frontend).
     *
     * @return int jumlah relasi yang dibuang
     */
    public function finalize(array $knownElsewhere = []): int
    {
        foreach ($this->pendingSkeletonRelations as $r) {
            if ($this->hasElement($r['from']) && $this->hasElement($r['to'])) {
                $this->relation($r['from'], $r['kind'], $r['to'], [
                    'label' => $r['label'], 'technology' => $r['tech'], 'scan_group' => 'skeleton',
                    'domain_key' => $this->elements[$r['from']]['domain_key'] ?? 'core',
                ]);
            }
        }
        $this->pendingSkeletonRelations = [];

        $known = array_flip($knownElsewhere);
        $dropped = 0;
        foreach ($this->relations as $k => $r) {
            $okFrom = isset($this->elements[$r['from_key']]) || isset($known[$r['from_key']]);
            $okTo = isset($this->elements[$r['to_key']]) || isset($known[$r['to_key']]);
            if (!$okFrom || !$okTo) {
                unset($this->relations[$k]);
                $dropped++;
            }
        }

        return $dropped;
    }
}
