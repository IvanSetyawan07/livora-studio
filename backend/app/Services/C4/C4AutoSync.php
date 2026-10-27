<?php

namespace App\Services\C4;

use App\Models\C4Element;
use App\Models\C4SyncRun;
use App\Services\C4\Scanners\CodeScanner;
use App\Services\C4\Scanners\DatabaseScanner;
use App\Services\C4\Scanners\ExternalResolver;
use App\Services\C4\Scanners\SkeletonScanner;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Orkestrator: website → (scan, read-only) → draf → Reconciler → tabel c4_*.
 * Tidak ada kode di modul ini yang menulis ke tabel selain c4_*.
 */
class C4AutoSync
{
    public function __construct(private Reconciler $reconciler)
    {
    }

    /** @throws \RuntimeException bila sync lain sedang berjalan / tabel belum dimigrasi */
    public function run(string $trigger = 'manual', bool $dry = false, ?int $userId = null): C4SyncRun
    {
        if (!Schema::hasTable('c4_elements')) {
            throw new \RuntimeException('Tabel c4_* belum ada. Jalankan: php artisan migrate');
        }

        $lock = Cache::lock('c4:sync', 300);
        if (!$lock->get()) {
            throw new \RuntimeException('Sinkronisasi C4 sedang berjalan. Coba lagi sebentar.');
        }

        $started = microtime(true);
        $run = new C4SyncRun(['trigger' => $trigger, 'status' => 'running', 'started_at' => now(), 'triggered_by' => $userId]);
        if (!$dry) {
            $run->save();
        }

        try {
            $draft = new GraphDraft();
            $domains = new DomainResolver();

            foreach ([
                'skeleton' => fn () => (new SkeletonScanner())->scan($draft),
                'database' => fn () => (new DatabaseScanner($domains))->scan($draft),
                'code' => fn () => (new CodeScanner($domains, new ExternalResolver()))->scan($draft),
            ] as $name => $scan) {
                try {
                    $scan();
                } catch (\Throwable $e) {
                    $draft->warn("Scanner {$name} gagal: ".$e->getMessage());
                    report($e);
                }
            }
            $dropped = $draft->finalize();
            if ($dropped) {
                $draft->warn("{$dropped} relasi dibuang karena salah satu ujungnya tidak ditemukan.");
            }

            DB::beginTransaction();
            try {
                $result = $this->reconciler->apply($draft);
                if ($dry) {
                    DB::rollBack();
                } else {
                    DB::commit();
                }
            } catch (\Throwable $e) {
                DB::rollBack();
                throw $e;
            }

            $failed = count(array_diff(['skeleton', 'db', 'code'], $draft->okGroups)) > 0;
            $run->fill([
                'status' => $failed ? 'partial' : 'ok',
                'stats' => $result['stats'] + ['scanned' => ['elements' => count($draft->elements), 'relations' => count($draft->relations)], 'dry_run' => $dry],
                'changes' => $result['changes'],
                'warnings' => $draft->warnings,
                'finished_at' => now(),
                'duration_ms' => (int) ((microtime(true) - $started) * 1000),
            ]);
        } catch (\Throwable $e) {
            $run->fill([
                'status' => 'failed', 'error' => $e->getMessage(), 'finished_at' => now(),
                'duration_ms' => (int) ((microtime(true) - $started) * 1000),
            ]);
            if (!$dry) {
                $run->save();
            }
            $lock->release();
            throw $e;
        }

        if (!$dry) {
            $run->save();
        }
        $lock->release();

        return $run;
    }
}
