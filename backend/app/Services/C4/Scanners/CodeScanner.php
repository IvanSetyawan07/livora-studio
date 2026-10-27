<?php

namespace App\Services\C4\Scanners;

use App\Services\C4\DomainResolver;
use App\Services\C4\GraphDraft;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Route;

/**
 * Level 3 (komponen): controller, service, mailable, command, dst. dibaca dari kode
 * PHP (token parser — komentar diabaikan) + route aktif + jadwal scheduler.
 * Semua operasi read-only: file dibaca, kelas di-reflect, tidak ada yang dieksekusi
 * selain konstruktor model kosong untuk mengetahui nama tabelnya.
 */
class CodeScanner
{
    /** @var array<string, array> fqcn => info */
    private array $components = [];

    /** @var array<string, string> model fqcn => table */
    private array $modelTables = [];

    public function __construct(private DomainResolver $domains, private ExternalResolver $externals)
    {
    }

    public function scan(GraphDraft $d): void
    {
        $cfg = (array) config('c4');
        $appPath = app_path();

        // 1) Kumpulkan & parse file
        $parsed = [];
        foreach ($this->candidateFiles($cfg, $appPath) as $f) {
            $info = $this->parseFile($f['path']);
            if (!$info) {
                continue;
            }
            $info += ['layer' => $f['layer'], 'container' => $f['container'], 'is_component' => $f['component'], 'rel' => $f['rel']];
            $parsed[$info['fqcn']] = $info;
        }

        // 2) Model → tabel
        foreach ($parsed as $fqcn => $info) {
            if (($info['layer'] ?? null) === 'Model' && $info['type'] === 'class') {
                $table = $this->tableOf($fqcn);
                if ($table) {
                    $this->modelTables[$fqcn] = $table;
                }
            }
        }

        // 3) Pilih komponen
        $ignoreRx = $cfg['ignore_class_regex'] ?? null;
        foreach ($parsed as $fqcn => $info) {
            if (!$info['is_component'] || $info['type'] !== 'class') {
                continue;
            }
            if ($ignoreRx && preg_match($ignoreRx, $fqcn)) {
                continue;
            }
            if (!($cfg['include_self'] ?? false) && preg_match('~\\\\C4[A-Z\\\\]|\\\\C4$|Services\\\\C4\\\\~', $fqcn)) {
                continue;
            }
            if ($info['layer'] === 'Controller' && $info['short'] === 'Controller') {
                continue;
            }
            $rc = $this->reflect($fqcn);
            if ($rc && $rc->isSubclassOf(\Throwable::class)) {
                continue;
            }
            $this->components[$fqcn] = $info + ['rc' => $rc];
        }

        // 4) Route → endpoint per controller
        $endpoints = $this->routeIndex();

        // 5) Buat elemen komponen
        $commandNames = [];
        foreach ($this->components as $fqcn => $info) {
            $rc = $info['rc'];
            $eps = $endpoints[$fqcn] ?? [];
            $guards = [];
            foreach ($eps as $e) {
                $guards[$e['guard']] = true;
            }
            $methods = $rc ? count(array_filter($rc->getMethods(\ReflectionMethod::IS_PUBLIC), fn ($m) => $m->class === $fqcn && !str_starts_with($m->name, '__'))) : null;
            $domain = $this->domains->forClass($fqcn);

            $meta = [
                'fqcn' => $fqcn, 'file' => 'app/'.$info['rel'], 'layer' => $info['layer'],
                'public_methods' => $methods, 'endpoint_count' => count($eps),
                'endpoints' => array_slice($eps, 0, 300), 'guards' => array_keys($guards),
                'abstract' => $rc?->isAbstract() ?? false,
            ];

            if ($info['layer'] === 'Command' && $rc) {
                $sig = $rc->getDefaultProperties()['signature'] ?? null;
                if (is_string($sig) && $sig !== '') {
                    $name = preg_split('~\s+~', trim($sig))[0];
                    $meta['command'] = $name;
                    $commandNames[$name] = $fqcn;
                }
            }

            $d->element('cls:'.$fqcn, [
                'level' => 3, 'kind' => 'component', 'name' => $info['short'],
                'technology' => $this->techLabel($info['layer'], $rc),
                'description' => $this->describe($info, $rc, count($eps)),
                'domain_key' => $domain ?? '__pending__', 'parent_key' => 'ctr:'.$info['container'],
                'scan_group' => 'code', 'meta' => $meta,
            ]);
        }

        // 6) Relasi kode → kode / tabel / eksternal
        $knownAll = array_keys($parsed);
        $byNs = [];
        foreach ($parsed as $fqcn => $info) {
            $byNs[$info['ns']][] = $info['short'];
        }
        $tableSet = [];
        foreach ($d->elements as $k => $el) {
            if ($el['kind'] === 'table') {
                $tableSet[substr($k, 4)] = true;
            }
        }

        foreach ($this->components as $fqcn => $info) {
            $from = 'cls:'.$fqcn;
            $refs = $this->references($info, $parsed, $byNs);

            $tableLabels = [];
            foreach ($refs as $ref => $how) {
                if (isset($this->components[$ref])) {
                    $d->relation($from, 'uses', 'cls:'.$ref, ['label' => $how, 'technology' => 'PHP', 'scan_group' => 'code']);
                } elseif (isset($this->modelTables[$ref])) {
                    $tableLabels[$this->modelTables[$ref]][] = $parsed[$ref]['short'];
                }
            }
            foreach ($this->rawTables($info['code']) as $t) {
                $tableLabels[$t][] = 'query';
            }
            foreach ($tableLabels as $table => $labels) {
                if (!isset($tableSet[$table])) {
                    continue;
                }
                $labels = array_values(array_unique($labels));
                $d->relation($from, 'data', 'tbl:'.$table, [
                    'label' => implode(', ', array_slice($labels, 0, 3)).(count($labels) > 3 ? ', …' : ''),
                    'technology' => 'Eloquent / Query Builder', 'scan_group' => 'code',
                ]);
            }

            foreach ($this->externals->detect($fqcn, $info['code'], $info['strings']) as $extKey => $host) {
                $this->externals->ensure($d, $extKey, $host);
                $d->relation($from, 'external', 'ext:'.$extKey, [
                    'label' => 'Memanggil API', 'technology' => $host === 'API' ? 'HTTPS' : $host, 'scan_group' => 'code',
                ]);
            }
        }

        // 7) Webhook / callback masuk
        foreach ((array) config('c4.inbound', []) as $rule) {
            foreach ($endpoints as $fqcn => $eps) {
                foreach ($eps as $e) {
                    if (str_contains($e['uri'], $rule['uri_contains']) && isset($this->components[$fqcn])) {
                        $this->externals->ensure($d, $rule['from']);
                        $d->relation('ext:'.$rule['from'], 'inbound', 'cls:'.$fqcn, [
                            'label' => $rule['label'], 'technology' => 'HTTPS webhook', 'scan_group' => 'code',
                        ]);
                    }
                }
            }
        }

        // 8) Scheduler: jadwal → komponen
        $this->scanSchedule($d, $commandNames);

        // 8b) Deskripsi otomatis untuk komponen tanpa komentar kelas
        $this->enrichDescriptions($d);

        // 9) Domain untuk komponen tanpa aturan: ikut domain tetangga terbanyak
        $this->inferMissingDomains($d);

        $d->okGroups[] = 'code';
        $d->okGroups[] = 'external';
    }

    // ───────────────────────── file & parsing ─────────────────────────

    private function candidateFiles(array $cfg, string $appPath): array
    {
        $out = [];
        $layers = (array) ($cfg['layers'] ?? []);
        $modelsAsComponents = (bool) ($cfg['include_models'] ?? false);

        foreach ($layers as $l) {
            if (empty($l['enabled'])) {
                continue;
            }
            foreach ($this->phpFiles($appPath.'/'.$l['dir']) as $path) {
                $out[$path] = ['path' => $path, 'layer' => $l['layer'], 'container' => $l['container'], 'component' => true,
                    'rel' => ltrim(str_replace($appPath, '', $path), '/')];
            }
        }
        foreach ($this->phpFiles($appPath.'/Models') as $path) {
            $out[$path] = ['path' => $path, 'layer' => 'Model', 'container' => 'api', 'component' => $modelsAsComponents,
                'rel' => ltrim(str_replace($appPath, '', $path), '/')];
        }
        // Console kernel = definisi jadwal scheduler
        $kernel = $appPath.'/Console/Kernel.php';
        if (is_file($kernel)) {
            $out[$kernel] = ['path' => $kernel, 'layer' => 'Scheduler', 'container' => 'scheduler', 'component' => true, 'rel' => 'Console/Kernel.php'];
        }

        return array_values($out);
    }

    private function phpFiles(string $dir): array
    {
        if (!is_dir($dir)) {
            return [];
        }
        $files = [];
        $it = new \RecursiveIteratorIterator(new \RecursiveDirectoryIterator($dir, \FilesystemIterator::SKIP_DOTS));
        foreach ($it as $f) {
            if ($f->isFile() && $f->getExtension() === 'php' && !str_ends_with($f->getFilename(), '.blade.php')) {
                $files[] = $f->getPathname();
            }
        }
        sort($files);

        return $files;
    }

    /** @return array{fqcn:string, ns:string, short:string, type:string, code:string, strings:array}|null */
    private function parseFile(string $path): ?array
    {
        $src = @file_get_contents($path);
        if ($src === false || $src === '') {
            return null;
        }
        try {
            $tokens = token_get_all($src);
        } catch (\Throwable $e) {
            return null;
        }

        $ns = '';
        $class = null;
        $type = 'class';
        $code = '';
        $strings = [];
        $n = count($tokens);
        $prevSig = null;
        $enumId = defined('T_ENUM') ? T_ENUM : -1;

        for ($i = 0; $i < $n; $i++) {
            $t = $tokens[$i];
            if (!is_array($t)) {
                $code .= $t;
                $prevSig = $t;

                continue;
            }
            [$id, $text] = $t;
            if ($id === T_COMMENT || $id === T_DOC_COMMENT) {
                continue;
            }
            if ($id === T_WHITESPACE) {
                $code .= $text;

                continue;
            }
            if ($id === T_NAMESPACE && $ns === '') {
                $j = $i + 1;
                $name = '';
                while ($j < $n) {
                    $x = $tokens[$j];
                    if (is_array($x) && in_array($x[0], [T_STRING, T_NAME_QUALIFIED, T_NS_SEPARATOR], true)) {
                        $name .= $x[1];
                    } elseif ($x === ';' || $x === '{') {
                        break;
                    }
                    $j++;
                }
                $ns = $name;
            }
            if ($class === null && in_array($id, [T_CLASS, T_INTERFACE, T_TRAIT, $enumId], true)
                && !(is_array($prevSig) && in_array($prevSig[0], [T_DOUBLE_COLON, T_NEW], true))) {
                for ($j = $i + 1; $j < $n; $j++) {
                    if (is_array($tokens[$j]) && $tokens[$j][0] === T_STRING) {
                        $class = $tokens[$j][1];
                        break;
                    }
                    if (is_array($tokens[$j]) && $tokens[$j][0] === T_WHITESPACE) {
                        continue;
                    }
                    break;
                }
                $type = match ($id) {
                    T_INTERFACE => 'interface', T_TRAIT => 'trait', default => $id === $enumId ? 'enum' : 'class',
                };
            }
            if ($id === T_CONSTANT_ENCAPSED_STRING) {
                $strings[] = substr($text, 1, -1);
            } elseif ($id === T_ENCAPSED_AND_WHITESPACE) {
                $strings[] = $text;
            }
            $code .= $text;
            $prevSig = $t;
        }

        if (!$class) {
            return null;
        }

        return [
            'fqcn' => ltrim(($ns ? $ns.'\\' : '').$class, '\\'), 'ns' => $ns, 'short' => $class,
            'type' => $type, 'code' => $code, 'strings' => $strings,
        ];
    }

    private function reflect(string $fqcn): ?\ReflectionClass
    {
        try {
            return class_exists($fqcn) ? new \ReflectionClass($fqcn) : null;
        } catch (\Throwable $e) {
            return null;
        }
    }

    private function tableOf(string $fqcn): ?string
    {
        try {
            $rc = $this->reflect($fqcn);
            if (!$rc || $rc->isAbstract() || !$rc->isSubclassOf(Model::class)) {
                return null;
            }

            return (new $fqcn)->getTable();
        } catch (\Throwable $e) {
            return null;
        }
    }

    // ───────────────────────── referensi antar kelas ─────────────────────────

    /** @return array<string, string> fqcn => 'extends'|'implements'|'memakai' */
    private function references(array $info, array $parsed, array $byNs): array
    {
        $code = $info['code'];
        $found = [];
        $self = $info['fqcn'];

        // use App\Models\{A, B}
        if (preg_match_all('~use\s+([\w\\\\]+)\\\\\{([^}]+)\}~', $code, $g, PREG_SET_ORDER)) {
            foreach ($g as $m) {
                foreach (explode(',', $m[2]) as $part) {
                    $short = trim(preg_split('~\s+as\s+~i', trim($part))[0]);
                    $found[ltrim($m[1].'\\'.$short, '\\')] = true;
                }
            }
        }
        // nama berkualifikasi (import, FQCN inline)
        if (preg_match_all('~\\\\?[A-Za-z_]\w*(?:\\\\[A-Za-z_]\w*)+~', $code, $m)) {
            foreach ($m[0] as $name) {
                $found[ltrim($name, '\\')] = true;
            }
        }
        // kelas di namespace yang sama (tanpa import)
        foreach ($byNs[$info['ns']] ?? [] as $short) {
            if ($short !== $info['short'] && preg_match('~(?<![\w$>\\\\:])'.preg_quote($short, '~').'(?!\w)~', $code)) {
                $found[$info['ns'].'\\'.$short] = true;
            }
        }

        $out = [];
        foreach ($found as $fqcn => $_) {
            if ($fqcn === $self || !isset($parsed[$fqcn])) {
                continue;
            }
            $short = $parsed[$fqcn]['short'];
            $label = 'memakai';
            if (preg_match('~\bextends\s+\\\\?(?:[\w\\\\]*\\\\)?'.preg_quote($short, '~').'\b~', $code)) {
                $label = 'extends';
            } elseif (preg_match('~\bimplements\s+[^{]*\b'.preg_quote($short, '~').'\b~', $code)) {
                $label = 'implements';
            }
            $out[$fqcn] = $label;
        }

        return $out;
    }

    /** @return string[] tabel yang disebut lewat DB::table('x') / ->from('x') */
    private function rawTables(string $code): array
    {
        $t = [];
        if (preg_match_all('~(?:DB::table|->from)\(\s*([\'"])([A-Za-z0-9_]+)\1~', $code, $m)) {
            $t = $m[2];
        }

        return array_values(array_unique($t));
    }

    // ───────────────────────── route & scheduler ─────────────────────────

    /** @return array<string, array<int, array>> fqcn => endpoints */
    private function routeIndex(): array
    {
        $out = [];
        foreach (Route::getRoutes()->getRoutes() as $r) {
            $action = $r->getActionName();
            if ($action === 'Closure' || !str_contains($action, '@') && !class_exists($action)) {
                continue;
            }
            [$class, $method] = str_contains($action, '@') ? explode('@', $action, 2) : [$action, '__invoke'];
            $mw = array_values(array_filter($r->gatherMiddleware(), 'is_string'));
            $out[ltrim($class, '\\')][] = [
                'methods' => array_values(array_diff($r->methods(), ['HEAD'])),
                'uri' => '/'.ltrim($r->uri(), '/'),
                'action' => $method,
                'middleware' => $mw,
                'guard' => $this->guardOf($mw),
            ];
        }

        return $out;
    }

    private function guardOf(array $mw): string
    {
        foreach ($mw as $m) {
            if ($m === 'admin' || str_starts_with($m, 'admin_role')) {
                return 'admin';
            }
        }
        foreach ($mw as $m) {
            if ($m === 'sales') {
                return 'sales';
            }
        }
        foreach ($mw as $m) {
            if (str_starts_with($m, 'auth')) {
                return 'auth';
            }
        }

        return 'public';
    }

    private function scanSchedule(GraphDraft $d, array $commandNames): void
    {
        $kernelFqcn = 'App\\Console\\Kernel';
        if (!isset($this->components[$kernelFqcn])) {
            return;
        }
        $events = [];
        try {
            $kernel = app(\Illuminate\Contracts\Console\Kernel::class);
            $schedule = new Schedule(config('app.timezone'));
            $m = new \ReflectionMethod($kernel, 'schedule');
            $m->setAccessible(true);
            $m->invoke($kernel, $schedule);
            foreach ($schedule->events() as $e) {
                $cmd = null;
                if (!empty($e->command) && preg_match('~artisan[\'"]?\s+([A-Za-z0-9:_-]+)~', (string) $e->command, $mm)) {
                    $cmd = $mm[1];
                }
                $events[] = ['command' => $cmd, 'cron' => $e->expression, 'description' => $e->description ?: ($cmd ? null : 'Closure terjadwal')];
            }
        } catch (\Throwable $e) {
            $d->warn('Jadwal scheduler tidak terbaca: '.$e->getMessage());

            return;
        }

        $key = 'cls:'.$kernelFqcn;
        $d->elements[$key]['meta']['schedule'] = $events;
        $d->elements[$key]['description'] = 'Definisi jadwal: '.count($events).' tugas terjadwal.';
        foreach ($events as $e) {
            if ($e['command'] && isset($commandNames[$e['command']])) {
                $d->relation($key, 'schedules', 'cls:'.$commandNames[$e['command']], [
                    'label' => $e['cron'], 'technology' => 'cron', 'scan_group' => 'code',
                ]);
                $d->elements['cls:'.$commandNames[$e['command']]]['meta']['schedule'] = $e['cron'];
            }
        }
    }

    // ───────────────────────── deskripsi & domain ─────────────────────────

    private function techLabel(string $layer, ?\ReflectionClass $rc): string
    {
        return match ($layer) {
            'Controller' => 'Laravel Controller', 'Service' => 'Service (PHP)', 'Mailable' => 'Laravel Mailable',
            'Command' => 'Artisan Command', 'Scheduler' => 'Laravel Scheduler', 'Job' => 'Queue Job',
            default => 'Laravel '.$layer,
        };
    }

    private function describe(array $info, ?\ReflectionClass $rc, int $endpointCount): string
    {
        $doc = $rc ? $rc->getDocComment() : null;
        if ($doc) {
            $lines = [];
            foreach (preg_split('~\R~', $doc) as $line) {
                $line = trim(preg_replace('~^\s*(/\*\*|\*/|\*)\s?~', '', trim($line)));
                if ($line === '') {
                    if ($lines) {
                        break;
                    }

                    continue;
                }
                if (str_starts_with($line, '@') || str_starts_with($line, '- ') || str_starts_with($line, 'POST ') || str_starts_with($line, 'GET ')) {
                    if ($lines) {
                        break;
                    }

                    continue;
                }
                $lines[] = $line;
                if (count($lines) >= 2) {
                    break;
                }
            }
            $text = trim(str_replace('`', '', implode(' ', $lines)));
            if (mb_strlen($text) >= 12) {
                return mb_strlen($text) > 240 ? mb_substr($text, 0, 237).'…' : $text;
            }
        }

        return match ($info['layer']) {
            'Controller' => $endpointCount ? "Controller dengan {$endpointCount} endpoint." : 'Controller (belum punya route aktif).',
            'Command' => 'Perintah Artisan.',
            default => $info['layer'].' '.$info['short'].'.',
        };
    }

    private function enrichDescriptions(GraphDraft $d): void
    {
        $out = [];
        foreach ($d->relations as $r) {
            $out[$r['from_key']][$r['kind']] = ($out[$r['from_key']][$r['kind']] ?? 0) + 1;
        }
        foreach ($d->elements as $k => $el) {
            if (($el['kind'] ?? '') !== 'component' || !str_starts_with($k, 'cls:')) {
                continue;
            }
            $desc = (string) ($el['description'] ?? '');
            $generic = preg_match('~^(Service|Mailable|Job|Listener|Observer|Policy|Notification|Middleware|Scheduler) \S+\.$~u', $desc) === 1;
            if (!$generic) {
                continue;
            }
            $o = $out[$k] ?? [];
            $parts = [];
            if (!empty($o['uses'])) {
                $parts[] = 'memakai '.$o['uses'].' komponen';
            }
            if (!empty($o['data'])) {
                $parts[] = 'mengakses '.$o['data'].' tabel';
            }
            if (!empty($o['external'])) {
                $parts[] = 'memanggil '.$o['external'].' layanan eksternal';
            }
            $d->elements[$k]['description'] = ($el['meta']['layer'] ?? 'Komponen').' '.$el['name'].($parts ? ': '.implode(', ', $parts).'.' : '.');
        }
    }

    private function inferMissingDomains(GraphDraft $d): void
    {
        $tally = [];
        foreach ($d->relations as $r) {
            foreach ([[$r['from_key'], $r['to_key']], [$r['to_key'], $r['from_key']]] as [$a, $b]) {
                if (($d->elements[$a]['domain_key'] ?? null) === '__pending__') {
                    $dom = $d->elements[$b]['domain_key'] ?? null;
                    if ($dom && $dom !== '__pending__' && $dom !== 'core') {
                        $w = ($d->elements[$b]['kind'] ?? '') === 'table' ? 2 : 1;
                        $tally[$a][$dom] = ($tally[$a][$dom] ?? 0) + $w * max(1, $r['weight']);
                    }
                }
            }
        }
        foreach ($d->elements as $k => $el) {
            if (($el['domain_key'] ?? null) === '__pending__') {
                if (!empty($tally[$k])) {
                    arsort($tally[$k]);
                    $d->elements[$k]['domain_key'] = array_key_first($tally[$k]);
                } else {
                    $d->elements[$k]['domain_key'] = 'system';
                }
            }
        }
    }
}
