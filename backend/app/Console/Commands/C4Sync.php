<?php

namespace App\Console\Commands;

use App\Services\C4\C4AutoSync;
use App\Services\C4\FrontendIngest;
use Illuminate\Console\Command;

class C4Sync extends Command
{
    protected $signature = 'c4:sync {--trigger=cli : manual|schedule|migration|cli} {--dry-run : hitung perubahan tanpa menulis} {--frontend= : path file JSON hasil c4-scan-frontend.mjs}';

    protected $description = 'Sinkronkan diagram C4 dari website (skema DB, route, kode, scheduler). Hanya menulis ke tabel c4_*.';

    public function handle(C4AutoSync $sync, FrontendIngest $ingest): int
    {
        try {
            if ($file = $this->option('frontend')) {
                $payload = json_decode((string) @file_get_contents($file), true);
                if (!is_array($payload)) {
                    $this->error("File {$file} tidak bisa dibaca / bukan JSON.");

                    return self::FAILURE;
                }
                $run = $ingest->ingest($payload, 'cli');
            } else {
                $run = $sync->run((string) $this->option('trigger'), (bool) $this->option('dry-run'));
            }
        } catch (\Throwable $e) {
            $this->error($e->getMessage());

            return self::FAILURE;
        }

        $s = $run->stats ?? [];
        $this->info("C4 sync {$run->status} dalam {$run->duration_ms} ms".($this->option('dry-run') ? ' (dry-run, tidak ditulis)' : ''));
        foreach (['elements', 'relations'] as $k) {
            $x = $s[$k] ?? [];
            $this->line(sprintf('  %-10s +%d  ~%d  stale %d  restored %d', $k, $x['added'] ?? 0, $x['updated'] ?? 0, $x['stale'] ?? 0, $x['restored'] ?? 0));
        }
        foreach ($run->warnings ?? [] as $w) {
            $this->warn('  ! '.$w);
        }

        return $run->status === 'failed' ? self::FAILURE : self::SUCCESS;
    }
}
