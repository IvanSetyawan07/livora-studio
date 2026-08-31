<?php

namespace App\Services\AI;

use App\Models\AiProvider as AiProviderModel;
use App\Models\AiSetting;
use App\Models\AiUsageLog;
use App\Services\AI\Providers\AIProviderContract;
use App\Services\AI\Providers\AIProviderResult;
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
     * $forceProvider dipakai kalau caller mau paksa satu provider spesifik.
     * Kalau kosong, urutan dipakai dari:
     *   1. Preferensi manual di Settings > Providers (ai_settings.preferred_ai_provider), kalau ada & valid,
     *   2. sisanya jatuh berurutan sesuai config/ai.php (Gemini → Groq → Anthropic).
     * "Prioritaskan tapi tetap fallback": provider pilihan dicoba duluan, tapi
     * kalau gagal/limit habis, otomatis lanjut ke provider berikutnya.
     */
    public function ask(string $systemPrompt, string $userMessage, ?string $agentKey = null, ?string $forceProvider = null): array
    {
        $order = $forceProvider ? [$forceProvider] : $this->resolveOrder();
        $lastError = null;

        foreach ($order as $key) {
            $driver = $this->drivers[$key] ?? null;
            if (!$driver || !$driver->isConfigured()) {
                continue;
            }

            try {
                $result = $driver->complete($systemPrompt, $userMessage);
                $this->recordUsage($key, $agentKey, $result->model, $result->inputTokens, $result->outputTokens, $result->durationMs, 'success');
                $this->touchProviderStatus($key, 'connected', $result->durationMs, true, $result);

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

    /** Urutan fallback: preferensi manual (kalau valid) duluan, sisanya urutan config/ai.php. */
    protected function resolveOrder(): array
    {
        $configOrder = array_keys($this->drivers);
        $preferred = AiSetting::get('preferred_ai_provider');

        if (!$preferred || !in_array($preferred, $configOrder, true)) {
            return $configOrder;
        }

        return array_values(array_unique([$preferred, ...$configOrder]));
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

    protected function touchProviderStatus(string $provider, string $status, ?int $latencyMs, bool $success, ?AIProviderResult $result = null): void
    {
        $row = AiProviderModel::firstOrCreate(['provider' => $provider], [
            'model' => $this->drivers[$provider]->model(),
            'status' => 'not_connected',
        ]);

        $prevRate = (float) ($row->success_rate ?? ($success ? 100 : 0));
        $newRate = round(($prevRate * 0.8) + (($success ? 100 : 0) * 0.2), 2);

        $update = [
            'status' => $status,
            'latency_ms' => $latencyMs ?? $row->latency_ms,
            'success_rate' => $newRate,
        ];

        // Kuota cuma ditimpa kalau request ini beneran sukses dan bawa data baru
        // — supaya request yang gagal duluan (sebelum sempat dapat header) tidak
        // menghapus snapshot kuota lama dengan null.
        if ($result) {
            $update['rl_requests_limit'] = $result->rlRequestsLimit ?? $row->rl_requests_limit;
            $update['rl_requests_remaining'] = $result->rlRequestsRemaining ?? $row->rl_requests_remaining;
            $update['rl_tokens_limit'] = $result->rlTokensLimit ?? $row->rl_tokens_limit;
            $update['rl_tokens_remaining'] = $result->rlTokensRemaining ?? $row->rl_tokens_remaining;
            $update['rl_requests_reset_at'] = $result->rlRequestsResetAt ?? $row->rl_requests_reset_at;
            $update['rl_tokens_reset_at'] = $result->rlTokensResetAt ?? $row->rl_tokens_reset_at;
            $update['rl_note'] = $result->rlNote ?? $row->rl_note;
        }

        $row->update($update);
    }
}