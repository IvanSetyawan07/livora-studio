<?php

namespace App\Services\C4\Scanners;

use App\Services\C4\GraphDraft;
use Illuminate\Support\Str;

/**
 * Mendeteksi sistem eksternal yang dipakai sebuah kelas:
 *   1. host pada string literal (https://api.xxx.com),
 *   2. petunjuk kode (substring), 3. petunjuk nama kelas (regex).
 * Host yang tidak dikenal dibuat otomatis sebagai ext:<host>.
 * Nilai config (API key dsb.) TIDAK pernah dibaca ke diagram — hanya boolean "terisi".
 */
class ExternalResolver
{
    private array $cfg;

    private array $ignoreHosts;

    private ?string $ignoreRegex;

    public function __construct()
    {
        $this->cfg = (array) config('c4.externals', []);
        $this->ignoreHosts = array_flip(array_map('strtolower', (array) config('c4.ignore_hosts', [])));
        $this->ignoreRegex = config('c4.ignore_host_regex');
    }

    /** @return array<string, string> extKey => host/label ringkas */
    public function detect(string $fqcn, string $code, array $strings): array
    {
        $found = [];

        foreach ($strings as $s) {
            if (!str_contains($s, '://')) {
                continue;
            }
            if (!preg_match_all('~https?://([A-Za-z0-9.-]+\.[A-Za-z]{2,})~', $s, $m)) {
                continue;
            }
            foreach ($m[1] as $host) {
                $host = strtolower($host);
                if (isset($this->ignoreHosts[$host]) || ($this->ignoreRegex && preg_match($this->ignoreRegex, $host))) {
                    continue;
                }
                $found[$this->keyForHost($host)] = $host;
            }
        }

        foreach ($this->cfg as $key => $e) {
            foreach ((array) ($e['code_hints'] ?? []) as $hint) {
                if ($hint !== '' && str_contains($code, $hint)) {
                    $found[$key] ??= $hint;
                }
            }
            foreach ((array) ($e['class_hints'] ?? []) as $rx) {
                if (@preg_match($rx, $fqcn) === 1) {
                    $found[$key] ??= 'API';
                }
            }
        }

        return $found;
    }

    /** Pastikan elemen eksternal ada di draf. */
    public function ensure(GraphDraft $d, string $key, ?string $host = null): void
    {
        $ek = 'ext:'.$key;
        if ($d->hasElement($ek)) {
            if ($host && $host !== 'API') {
                $meta = $d->elements[$ek]['meta'];
                $meta['hosts'] = array_values(array_unique(array_merge($meta['hosts'] ?? [], [$host])));
                $d->elements[$ek]['meta'] = $meta;
            }

            return;
        }

        $e = $this->cfg[$key] ?? null;
        if ($e) {
            $configured = null;
            if (!empty($e['config_keys'])) {
                $configured = collect($e['config_keys'])->contains(fn ($k) => filled(config($k)));
            }
            $d->element($ek, [
                'level' => 1, 'kind' => 'external', 'name' => $e['name'], 'technology' => $e['technology'] ?? null,
                'description' => $e['description'] ?? null, 'domain_key' => $e['domain'] ?? 'core', 'scan_group' => 'external',
                'meta' => [
                    'hosts' => array_values(array_filter(array_merge((array) ($e['hosts'] ?? []), $host && $host !== 'API' ? [$host] : []))),
                    'configured' => $configured, 'config_keys' => $e['config_keys'] ?? [], 'curated' => true,
                ],
            ]);

            return;
        }

        $d->element($ek, [
            'level' => 1, 'kind' => 'external', 'name' => $host ?? $key, 'technology' => 'HTTPS API',
            'description' => 'Layanan eksternal terdeteksi otomatis dari kode ('.$host.'). Beri nama & domain dari tab Elemen.',
            'domain_key' => 'core', 'scan_group' => 'external',
            'meta' => ['hosts' => array_filter([$host]), 'curated' => false, 'auto_detected' => true],
        ]);
    }

    private function keyForHost(string $host): string
    {
        foreach ($this->cfg as $key => $e) {
            if (in_array($host, array_map('strtolower', (array) ($e['hosts'] ?? [])), true)) {
                return $key;
            }
        }

        return Str::slug(str_replace('.', '-', $host), '_');
    }
}
