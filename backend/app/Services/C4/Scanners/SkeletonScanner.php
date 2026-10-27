<?php

namespace App\Services\C4\Scanners;

use App\Services\C4\GraphDraft;

/** Level 1–2: orang, sistem Livora, container. Versi teknologi dibaca dari runtime. */
class SkeletonScanner
{
    public function scan(GraphDraft $d): void
    {
        $cfg = (array) config('c4.skeleton', []);
        $sys = $cfg['system'] ?? ['key' => 'livora', 'name' => 'Livora Platform'];
        $d->element('sys:'.$sys['key'], [
            'level' => 1, 'kind' => 'system', 'name' => $sys['name'], 'description' => $sys['description'] ?? null,
            'domain_key' => 'core', 'scan_group' => 'skeleton',
        ]);

        foreach ((array) ($cfg['persons'] ?? []) as $k => $p) {
            $d->element('person:'.$k, [
                'level' => 1, 'kind' => 'person', 'name' => $p['name'], 'description' => $p['description'] ?? null,
                'domain_key' => $p['domain'] ?? 'core', 'scan_group' => 'skeleton',
            ]);
        }

        $tokens = [
            '{laravel}' => 'Laravel '.preg_replace('~^(\d+\.\d+).*~', '$1', app()->version()),
            '{php}' => PHP_MAJOR_VERSION.'.'.PHP_MINOR_VERSION,
            '{db}' => $this->dbLabel(),
        ];

        foreach ((array) ($cfg['containers'] ?? []) as $k => $c) {
            $d->element('ctr:'.$k, [
                'level' => 2, 'kind' => $c['kind'] ?? 'container', 'name' => $c['name'],
                'technology' => strtr((string) ($c['technology'] ?? ''), $tokens),
                'description' => $c['description'] ?? null, 'domain_key' => $c['domain'] ?? 'core',
                'parent_key' => 'sys:'.$sys['key'], 'scan_group' => 'skeleton',
            ]);
        }

        foreach ((array) ($cfg['relations'] ?? []) as [$from, $to, $label, $tech, $kind]) {
            $d->pendingSkeletonRelations[] = compact('from', 'to', 'label', 'tech', 'kind');
        }
        // Relasi internal yang selalu benar secara arsitektur
        $d->pendingSkeletonRelations[] = ['from' => 'ctr:api', 'to' => 'ctr:db', 'label' => 'Eloquent ORM / Query Builder', 'tech' => 'SQL', 'kind' => 'data'];
        $d->pendingSkeletonRelations[] = ['from' => 'ctr:scheduler', 'to' => 'ctr:db', 'label' => 'Tugas terjadwal membaca/menulis data', 'tech' => 'SQL', 'kind' => 'data'];
        $d->okGroups[] = 'skeleton';
    }

    private function dbLabel(): string
    {
        $driver = (string) config('database.connections.'.config('database.default').'.driver', config('database.default'));

        return match ($driver) {
            'mysql' => 'MySQL', 'mariadb' => 'MariaDB', 'pgsql' => 'PostgreSQL', 'sqlite' => 'SQLite', 'sqlsrv' => 'SQL Server',
            default => ucfirst($driver),
        };
    }
}
