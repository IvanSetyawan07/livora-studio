<?php

namespace App\Services\C4;

/** Menentukan domain (fitur) sebuah tabel / kelas / halaman dari aturan di config/c4.php. */
class DomainResolver
{
    public function __construct(private ?array $cfg = null)
    {
        $this->cfg ??= (array) config('c4', []);
    }

    public function forTable(string $table): string
    {
        return $this->match((array) ($this->cfg['domain_rules']['table'] ?? []), $table) ?? 'system';
    }

    public function forClass(string $fqcn): ?string
    {
        return $this->match((array) ($this->cfg['domain_rules']['class'] ?? []), $fqcn);
    }

    public function forPath(string $path): string
    {
        return $this->match((array) ($this->cfg['domain_rules']['path'] ?? []), $path) ?? 'core';
    }

    private function match(array $rules, string $subject): ?string
    {
        foreach ($rules as $regex => $domain) {
            if (@preg_match($regex, $subject) === 1) {
                return $domain;
            }
        }

        return null;
    }
}
