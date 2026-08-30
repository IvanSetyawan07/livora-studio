<?php

namespace App\Services\AI;

use App\Models\AiProvider as AiProviderModel;
use App\Models\AiUsageLog;
use App\Services\AI\Providers\AIProviderContract;
use App\Services\AI\Providers\AnthropicProvider;
use App\Services\AI\Providers\GeminiProvider;
use App\Services\AI\Providers\GroqProvider;
use Illuminate\Support\Facades\Auth;

class AIProviderManager
{
    /** @var array<string, AIProviderContract> */
    protected array $drivers = [];

    public function __construct()
    {
        foreach (config('ai.providers', []) as $key => $cfg) {
            $this->drivers[$key] = match ($key) {
                'gemini' => new GeminiProvider($cfg['api_key'], $cfg['model'], $cfg['base_url']),
                'groq' => new GroqProvider($cfg['api_key'], $cfg['model'], $cfg['base_url']),
                'anthropic' => new AnthropicProvider($cfg['api_key'], $cfg['model'], $cfg['base_url']),
                default => null,
            };
        }
    }

    /**
     * Kirim prompt ke provider pertama yang terkonfigurasi & berhasil.
     * $forceProvider dipakai kalau user manual pilih provider di dashboard
     * (Settings/Providers page). Kalau kosong, coba urut sesuai config/ai.php,
     * jatuh ke provider berikutnya kalau satu gagal/limit habis.
     */
    public function ask(string $systemPrompt, string $userMessage, ?string $agentKey = null, ?string $forceProvider = null): array
    {
        $order = $forceProvider ? [$forceProvider] : array_keys($this->drivers);
        $lastError = null;

        foreach ($order as $key) {
            $driver = $this->drivers[$key] ?? null;
            if (!$driver || !$driver->isConfigured()) {
                continue;
            }

            try {
                $result = $driver->complete($systemPrompt, $userMessage);
                $this->recordUsage($key, $agentKey, $result->model, $result->inputTokens, $result->outputTokens, $result->durationMs, 'success');
                $this->touchProviderStatus($key, 'connected', $result->durationMs, true);

                return ['text' => $result->text, 'provider' => $key, 'model' => $result->model];
            } catch (\Throwable $e) {
                $lastError = $e;
                $this->recordUsage($key, $agentKey, $driver->model(), 0, 0, null, 'error', $e->getMessage());
                $this->touchProviderStatus($key, 'degraded', null, false);
            }
        }

        throw new \RuntimeException(
            'Tidak ada AI provider yang berhasil merespons. '.($lastError?->getMessage() ?? 'Belum ada provider yang dikonfigurasi.')
        );
    }

    /** Provider mana saja yang API key-nya sudah diisi (buat Settings page). */
    public function availableProviders(): array
    {
        return array_keys(array_filter($this->drivers, fn ($d) => $d->isConfigured()));
    }

    protected function recordUsage(string $provider, ?string $agentKey, string $model, int $in, int $out, ?int $durationMs, string $status, ?string $error = null): void
    {
        AiUsageLog::create([
            'agent_key' => $agentKey,
            'provider' => $provider,
            'model' => $model,
            'input_tokens' => $in,
            'output_tokens' => $out,
            'duration_ms' => $durationMs,
            'status' => $status,
            'error_message' => $error,
            'user_id' => Auth::id(),
        ]);
    }

    protected function touchProviderStatus(string $provider, string $status, ?int $latencyMs, bool $success): void
    {
        $row = AiProviderModel::firstOrCreate(['provider' => $provider], [
            'model' => $this->drivers[$provider]->model(),
            'status' => 'not_connected',
        ]);

        // Rolling average sederhana, biar success_rate gak lompat drastis tiap 1 request.
        $prevRate = (float) ($row->success_rate ?? ($success ? 100 : 0));
        $newRate = round(($prevRate * 0.8) + (($success ? 100 : 0) * 0.2), 2);

        $row->update([
            'status' => $status,
            'latency_ms' => $latencyMs ?? $row->latency_ms,
            'success_rate' => $newRate,
        ]);
    }
}