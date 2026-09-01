<?php

namespace App\Console\Commands;

use App\Services\AI\CroAgentService;
use App\Services\AI\SeoAgentService;
use Illuminate\Console\Command;

/**
 * Fase 6 — entry point manual untuk menjalankan satu agent AI Marketing.
 *
 * Sengaja MANUAL (bukan scheduler) supaya hasilnya bisa direview dulu sebelum
 * diotomatisasi. Dispatch berdasarkan {key} supaya agent berikutnya (content,
 * leads, ads) tinggal ditambahkan match arm-nya di sini tanpa bikin command baru.
 *
 * Yang sudah diimplementasikan: "cro" (data funnel konsultasi) dan "seo"
 * (data Google Search Console). Key lain masih gagal dengan pesan jujur,
 * bukan silent no-op.
 */
class RunAiAgent extends Command
{
    protected $signature = 'ai:run-agent {key : Agent key, mis. cro atau seo} {--limit=5 : Maksimal insight per run}';

    protected $description = 'Jalankan satu siklus analisis AI untuk agent tertentu (Fase 6)';

    public function handle(CroAgentService $croAgent, SeoAgentService $seoAgent): int
    {
        $key = strtolower($this->argument('key'));
        $limit = max(1, (int) $this->option('limit'));

        $result = match ($key) {
            'cro' => $croAgent->run($limit),
            'seo' => $seoAgent->run($limit),
            default => [
                'status' => 'not_implemented',
                'message' => "Agent '{$key}' belum diimplementasikan di Fase 6. Baru 'cro' dan 'seo' yang siap.",
            ],
        };

        return match ($result['status']) {
            'ok' => $this->reportSuccess($result),
            'empty' => $this->reportEmpty($result),
            'not_implemented' => $this->reportNotImplemented($result),
            default => $this->reportError($result),
        };
    }

    private function reportSuccess(array $result): int
    {
        $this->info('Berhasil.');
        $this->line("Provider yang dipakai : {$result['provider']}");
        $this->line("Insight dibuat        : {$result['insights_created']}");
        $this->line("Recommendation dibuat : {$result['recommendations_created']}");

        return self::SUCCESS;
    }

    private function reportEmpty(array $result): int
    {
        $this->warn($result['message']);

        return self::SUCCESS;
    }

    private function reportNotImplemented(array $result): int
    {
        $this->error($result['message']);

        return self::FAILURE;
    }

    private function reportError(array $result): int
    {
        $this->error('Gagal: '.$result['message']);

        if (!empty($result['raw'])) {
            $this->line('');
            $this->line('Raw response dari AI (buat debug):');
            $this->line($result['raw']);
        }

        return self::FAILURE;
    }
}
