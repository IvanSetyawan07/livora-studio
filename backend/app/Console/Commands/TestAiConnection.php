<?php

namespace App\Console\Commands;

use App\Models\AiAgent;
use App\Services\AI\AIProviderManager;
use Illuminate\Console\Command;

class TestAiConnection extends Command
{
    protected $signature = 'ai:test-connection';
    protected $description = 'Tes AIProviderManager tanpa tinker (buat host yang shell_exec-nya dimatiin)';

    public function handle(AIProviderManager $manager)
    {
        $this->info('AiAgent count: '.AiAgent::count());
        $this->info('Manggil AIProviderManager::ask()...');

        try {
            $result = $manager->ask(
                'Kamu adalah asisten tes koneksi. Jawab singkat.',
                'Halo, tolong balas singkat saja untuk tes koneksi.'
            );
            $this->info('BERHASIL:');
            $this->line(json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        } catch (\Throwable $e) {
            $this->error('GAGAL: '.$e->getMessage());
        }

        return self::SUCCESS;
    }
}