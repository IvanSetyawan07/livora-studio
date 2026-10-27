<?php

namespace App\Services\C4\Scanners;

use App\Services\C4\DomainResolver;
use App\Services\C4\GraphDraft;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/**
 * Level 4 (data): tabel + kolom + relasi FK dibaca dari skema database yang
 * SEDANG berjalan (information_schema) — jadi tabel baru dari migrasi otomatis muncul.
 * Hanya membaca skema; tidak ada query ke data operasional.
 */
class DatabaseScanner
{
    public function __construct(private DomainResolver $domains)
    {
    }

    public function scan(GraphDraft $d): void
    {
        $ignore = array_flip((array) config('c4.ignore_tables', []));
        $tables = [];
        foreach (Schema::getTables() as $t) {
            $name = is_array($t) ? ($t['name'] ?? null) : ($t->name ?? null);
            if ($name && !isset($ignore[$name])) {
                $tables[] = $name;
            }
        }
        sort($tables);
        $exists = array_flip($tables);

        foreach ($tables as $table) {
            $columns = [];
            $pk = [];
            $fkCols = [];
            try {
                foreach (Schema::getIndexes($table) as $idx) {
                    if (!empty($idx['primary'])) {
                        $pk = array_merge($pk, (array) ($idx['columns'] ?? []));
                    }
                }
            } catch (\Throwable $e) {
                // indeks tidak terbaca — lanjut tanpa info PK
            }

            $fks = [];
            try {
                $fks = Schema::getForeignKeys($table);
            } catch (\Throwable $e) {
            }
            foreach ($fks as $fk) {
                foreach ((array) ($fk['columns'] ?? []) as $c) {
                    $fkCols[$c] = $fk['foreign_table'] ?? null;
                }
            }

            foreach (Schema::getColumns($table) as $col) {
                $n = $col['name'];
                $columns[] = [
                    'name' => $n,
                    'type' => $col['type_name'] ?? ($col['type'] ?? ''),
                    'nullable' => (bool) ($col['nullable'] ?? false),
                    'pk' => in_array($n, $pk, true),
                    'fk' => $fkCols[$n] ?? null,
                ];
            }

            $domain = $this->domains->forTable($table);
            $d->element('tbl:'.$table, [
                'level' => 4, 'kind' => 'table', 'name' => $table, 'technology' => 'Tabel',
                'description' => 'Tabel '.$table.' ('.count($columns).' kolom).',
                'domain_key' => $domain, 'parent_key' => 'ctr:db', 'scan_group' => 'db',
                'meta' => ['columns' => $columns, 'column_count' => count($columns), 'primary_key' => array_values(array_unique($pk))],
            ]);

            $declared = [];
            foreach ($fks as $fk) {
                $to = $fk['foreign_table'] ?? null;
                if (!$to || !isset($exists[$to])) {
                    continue;
                }
                $declared[$to] = true;
                $d->relation('tbl:'.$table, 'fk', 'tbl:'.$to, [
                    'label' => 'FK '.implode(',', (array) $fk['columns']), 'technology' => 'Foreign key',
                    'domain_key' => $domain, 'scan_group' => 'db',
                ]);
            }

            // Relasi yang tidak dideklarasikan sebagai FK tapi jelas dari penamaan kolom *_id
            foreach ($columns as $c) {
                if ($c['fk'] || !str_ends_with($c['name'], '_id') || $c['name'] === 'id') {
                    continue;
                }
                $base = substr($c['name'], 0, -3);
                foreach ([Str::plural($base), $base] as $cand) {
                    if ($cand !== $table && isset($exists[$cand]) && empty($declared[$cand])) {
                        $d->relation('tbl:'.$table, 'fk', 'tbl:'.$cand, [
                            'label' => $c['name'].' (dugaan)', 'technology' => 'Relasi dari nama kolom',
                            'domain_key' => $domain, 'scan_group' => 'db', 'meta' => ['inferred' => true],
                        ]);
                        $declared[$cand] = true;
                        break;
                    }
                }
            }
        }

        $d->okGroups[] = 'db';
    }
}
