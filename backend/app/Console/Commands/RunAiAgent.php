<?php

namespace App\Console\Commands;

use App\Services\AI\AdsAgentService;
use App\Services\AI\ContentAgentService;
use App\Services\AI\CroAgentService;
use App\Services\AI\LeadsAgentService;
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
    protected $signature = 'ai:run-agent {key : Agent key: seo, cro, content, ads, leads, atau all} {--limit=5 : Maksimal insight per run}';

    protected $description = 'Jalankan satu siklus analisis AI untuk agent tertentu (Fase 6)';

    public function handle(
        CroAgentService $croAgent,
        SeoAgentService $seoAgent,
        ContentAgentService $contentAgent,
        AdsAgentService $adsAgent,
        LeadsAgentService $leadsAgent,
    ): int {
        $key = strtolower($this->argument('key'));
        $limit = max(1, (int) $this->option('limit'));

        $agents = [
            'cro' => $croAgent,
            'seo' => $seoAgent,
            'content' => $contentAgent,
            'ads' => $adsAgent,
            'leads' => $leadsAgent,
        ];

        if ($key === 'all') {
            return $this->runAll($agents, $limit);
        }

        $result = isset($agents[$key])
            ? $agents[$key]->run($limit)
            : [
                'status' => 'not_implemented',
                'message' => "Agent '{$key}' tidak dikenal. Yang tersedia: "
                    .implode(', ', array_keys($agents)).', atau all.',
            ];

        return match ($result['status']) {
            'ok' => $this->reportSuccess($result),
            'empty' => $this->reportEmpty($result),
            'not_implemented' => $this->reportNotImplemented($result),
            default => $this->reportError($result),
        };
    }

    /** Siklus AI reguler: semua agent dijalankan berurutan, satu agent gagal tidak menghentikan sisanya. */
    private function runAll(array $agents, int $limit): int
    {
        $failed = 0;

        foreach ($agents as $agentKey => $agent) {
            $this->line('');
            $this->line("== {$agentKey} ==");

            try {
                $result = $agent->run($limit);
            } catch (\Throwable $e) {
                $this->error("Agent '{$agentKey}' melempar exception: ".$e->getMessage());
                $failed++;
                continue;
            }

            if ($result['status'] === 'ok') {
                $this->reportSuccess($result);
            } elseif ($result['status'] === 'empty') {
                $this->reportEmpty($result);
            } else {
                $this->reportError($result);
                $failed++;
            }
        }

        return $failed > 0 ? self::FAILURE : self::SUCCESS;
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
