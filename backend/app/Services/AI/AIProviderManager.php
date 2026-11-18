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
    public function ask(string $systemPrompt, string $userMessage, ?string $agentKey = null, ?string $forceProvider = null, array $options = []): array
    {
        $order = $forceProvider
            ? array_values(array_unique([$forceProvider, ...$this->resolveOrder()]))
            : $this->resolveOrder();
        $lastError = null;
        $errors = [];

        foreach ($order as $key) {
            $driver = $this->drivers[$key] ?? null;
            if (!$driver || !$driver->isConfigured()) {
                continue;
            }

            try {
                $result = $driver->complete($systemPrompt, $userMessage, $options);
                $this->recordUsage($key, $agentKey, $result->model, $result->inputTokens, $result->outputTokens, $result->durationMs, 'success');
                $this->touchProviderStatus($key, 'connected', $result->durationMs, true, $result);

                return [
                    'text' => $result->text,
                    'provider' => $key,
                    'model' => $result->model,
                    'groundingChunks' => $result->groundingChunks,
                ];
            } catch (\Throwable $e) {
                $lastError = $e;
                $errors[$key] = $e->getMessage();
                $this->recordUsage($key, $agentKey, $driver->model(), 0, 0, null, 'error', $e->getMessage());
                $this->touchProviderStatus($key, 'degraded', null, false);
            }
        }

        $detail = $errors !== []
            ? implode(' | ', array_map(fn ($k, $msg) => strtoupper($k).': '.mb_substr($msg, 0, 220), array_keys($errors), array_values($errors)))
            : ($lastError?->getMessage() ?? 'Belum ada provider yang dikonfigurasi.');

        throw new \RuntimeException(
            'Tidak ada AI provider yang berhasil merespons. '.$detail
        );
    }

    public function hasProvider(string $key): bool
    {
        return ($this->drivers[$key] ?? null)?->isConfigured() ?? false;
    }

    /**
     * Sinkronkan tabel `ai_providers` dengan konfigurasi `.env` agar UI tidak
     * menampilkan "Periksa API key" padahal GEMINI_API_KEY/GROQ_API_KEY sudah terisi.
     */
    public function syncConfiguredProviders(): void
    {
        foreach ($this->drivers as $key => $driver) {
            if (! $driver) {
                continue;
            }
            $row = AiProviderModel::firstOrCreate(['provider' => $key], [
                'model' => $driver->model(),
                'status' => $driver->isConfigured() ? 'connected' : 'not_connected',
            ]);

            $update = [];
            if ($row->model !== $driver->model()) {
                $update['model'] = $driver->model();
            }
            if (! $driver->isConfigured()) {
                $update['status'] = 'not_connected';
            } elseif ($row->status === 'not_connected') {
                $update['status'] = 'connected';
            }

            if ($update !== []) {
                $row->update($update);
            }
        }
    }

    /**
     * Uji koneksi langsung ke satu AI provider dengan prompt sangat ringan.
     *
     * @return array{provider: string, model: string, status: string, latencyMs: int, message: string}
     */
    public function testProvider(string $key): array
    {
        $driver = $this->drivers[$key] ?? null;
        if (! $driver) {
            throw new \InvalidArgumentException("Provider \"{$key}\" tidak dikenal.");
        }
        if (! $driver->isConfigured()) {
            AiProviderModel::updateOrCreate(
                ['provider' => $key],
                ['model' => $driver->model(), 'status' => 'not_connected']
            );
            throw new \RuntimeException("API key {$key} belum diisi di backend/.env.");
        }

        try {
            $result = $driver->complete(
                'Reply with a single word: OK.',
                'Ping test.',
                ['max_tokens' => 24, 'temperature' => 0]
            );
            $this->recordUsage($key, 'system', $result->model, $result->inputTokens, $result->outputTokens, $result->durationMs, 'success');
            $this->touchProviderStatus($key, 'connected', $result->durationMs, true, $result);

            return [
                'provider' => $key,
                'model' => $result->model,
                'status' => 'connected',
                'latencyMs' => $result->durationMs,
                'message' => "Koneksi ke {$key} ({$result->model}) berhasil dalam {$result->durationMs} ms.",
            ];
        } catch (\Throwable $e) {
            $this->recordUsage($key, 'system', $driver->model(), 0, 0, null, 'error', $e->getMessage());
            $this->touchProviderStatus($key, 'degraded', null, false);
            throw $e;
        }
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
        try {
            AiUsageLog::create([
                // Biaya dihitung dari harga per model. null (bukan 0) kalau harga
                // model itu belum terdaftar — supaya UI bisa bilang "not tracked yet"
                // alih-alih menampilkan $0 yang menyesatkan.
                'cost' => AiPricing::costFor($provider, $model, $in, $out),
                'agent_key' => $agentKey,
                'provider' => $provider,
                'model' => $model,
                'input_tokens' => $in,
                'output_tokens' => $out,
                'duration_ms' => $durationMs,
                'status' => $status,
                'error_message' => $error ? mb_substr($error, 0, 1000) : null,
                'user_id' => Auth::id(),
            ]);
        } catch (\Throwable) {
            // Jangan gagalkan respons AI apabila pencatatan log mengalami kendala.
        }
    }

    protected function touchProviderStatus(string $provider, string $status, ?int $latencyMs, bool $success, ?AIProviderResult $result = null): void
    {
        try {
            $row = AiProviderModel::firstOrCreate(['provider' => $provider], [
                'model' => $this->drivers[$provider]->model(),
                'status' => 'not_connected',
            ]);

            $prevRate = (float) ($row->success_rate ?? ($success ? 100 : 0));
            $newRate = round(($prevRate * 0.8) + (($success ? 100 : 0) * 0.2), 2);

            $driver = $this->drivers[$provider] ?? null;
            $update = [
                'model' => $result?->model ?: ($driver ? $driver->model() : $row->model),
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
        } catch (\Throwable) {
            // Abaikan error update metrik status agar alur utama tidak gagal.
        }
    }
}