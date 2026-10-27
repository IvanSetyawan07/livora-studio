<?php

namespace App\Services\C4;

use App\Models\C4Element;
use App\Models\C4SyncRun;
use Illuminate\Support\Facades\Route;

/**
 * Menerima hasil pemindaian frontend (scripts/c4-scan-frontend.mjs):
 * halaman React + panggilan API-nya. Panggilan dicocokkan ke route Laravel
 * sehingga halaman → controller muncul di diagram.
 *
 * Payload: { "pages": [ { "route": "/admin/items", "file": "pages/admin/AdminItems.tsx",
 *            "name": "AdminItems", "guard": "admin", "api": [ {"method":"GET","path":"/admin/items"} ] } ] }
 */
class FrontendIngest
{
    public function __construct(private Reconciler $reconciler, private DomainResolver $domains)
    {
    }

    public function ingest(array $payload, string $trigger = 'ingest', ?int $userId = null): C4SyncRun
    {
        $started = microtime(true);
        $run = C4SyncRun::create(['trigger' => $trigger, 'status' => 'running', 'started_at' => now(), 'triggered_by' => $userId]);

        try {
            $routes = $this->routeTable();
            $d = new GraphDraft();
            $unmatched = 0;

            foreach ((array) ($payload['pages'] ?? []) as $p) {
                $route = (string) ($p['route'] ?? '');
                if ($route === '' || str_contains($route, '*')) {
                    continue;
                }
                $key = 'fe:'.$route;
                $guard = (string) ($p['guard'] ?? 'public');
                $d->element($key, [
                    'level' => 3, 'kind' => 'component', 'name' => (string) ($p['name'] ?? $route),
                    'technology' => 'React page · '.$guard,
                    'description' => 'Halaman '.$route.' ('.count((array) ($p['api'] ?? [])).' panggilan API).',
                    'domain_key' => $this->domains->forPath($route), 'parent_key' => 'ctr:spa', 'scan_group' => 'frontend',
                    'meta' => ['route' => $route, 'file' => 'src/'.($p['file'] ?? ''), 'guard' => $guard, 'layer' => 'Page',
                        'api' => array_slice((array) ($p['api'] ?? []), 0, 80)],
                ]);

                foreach ((array) ($p['api'] ?? []) as $call) {
                    $hit = $this->match($routes, strtoupper((string) ($call['method'] ?? 'GET')), (string) ($call['path'] ?? ''));
                    if ($hit) {
                        $d->relation($key, 'calls', 'cls:'.$hit['class'], [
                            'label' => strtoupper($call['method'] ?? 'GET').' '.$call['path'], 'technology' => 'HTTP · Axios',
                            'scan_group' => 'frontend',
                        ]);
                    } else {
                        $unmatched++;
                    }
                }
            }

            $known = C4Element::where('scan_group', 'code')->pluck('key')->all();
            $dropped = $d->finalize($known);
            $d->okGroups[] = 'frontend';
            if ($unmatched) {
                $d->warn("{$unmatched} panggilan API tidak cocok dengan route backend (mungkin URL dinamis / pihak ketiga).");
            }
            if ($dropped) {
                $d->warn("{$dropped} relasi halaman→controller dibuang karena controller belum ada di C4 (jalankan sync backend).");
            }

            \Illuminate\Support\Facades\DB::transaction(function () use ($d, &$result) {
                $result = $this->reconciler->apply($d);
            });

            $run->update([
                'status' => 'ok', 'stats' => $result['stats'] + ['scanned' => ['elements' => count($d->elements), 'relations' => count($d->relations)], 'source' => 'frontend'],
                'changes' => $result['changes'], 'warnings' => $d->warnings, 'finished_at' => now(),
                'duration_ms' => (int) ((microtime(true) - $started) * 1000),
            ]);
        } catch (\Throwable $e) {
            $run->update(['status' => 'failed', 'error' => $e->getMessage(), 'finished_at' => now(),
                'duration_ms' => (int) ((microtime(true) - $started) * 1000)]);
            throw $e;
        }

        return $run->fresh();
    }

    /** @return array<int, array{methods: array, regex: string, class: string}> */
    private function routeTable(): array
    {
        $out = [];
        foreach (Route::getRoutes()->getRoutes() as $r) {
            $action = $r->getActionName();
            if ($action === 'Closure') {
                continue;
            }
            $class = ltrim(explode('@', $action)[0], '\\');
            $uri = preg_replace('~^api/~', '', ltrim($r->uri(), '/'));
            $rx = preg_replace('~\\\{[^}]+\\\}~', '[^/]+', preg_quote($uri, '~'));
            $out[] = ['methods' => $r->methods(), 'regex' => '~^'.$rx.'$~', 'class' => $class];
        }

        return $out;
    }

    private function match(array $routes, string $method, string $path): ?array
    {
        $path = trim(preg_replace('~\?.*$~', '', $path), '/');
        $path = preg_replace('~\$\{[^}]*\}|:[A-Za-z_]\w*|\{[^}]*\}~', 'x', $path);
        foreach ($routes as $r) {
            if (in_array($method, $r['methods'], true) && preg_match($r['regex'], $path)) {
                return $r;
            }
        }

        return null;
    }
}
