<?php

namespace App\Services\AI\Providers;

use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;

class GroqProvider implements AIProviderContract
{
    public function __construct(
        protected ?string $apiKey,
        protected string $modelName,
        protected string $baseUrl,
    ) {
    }

    public function key(): string
    {
        return 'groq';
    }

    public function model(): string
    {
        return $this->modelName;
    }

    public function isConfigured(): bool
    {
        return filled($this->apiKey);
    }

    public function complete(string $systemPrompt, string $userMessage, array $options = []): AIProviderResult
    {
        if (!$this->isConfigured()) {
            throw new AIProviderException('Groq belum dikonfigurasi (GROQ_API_KEY kosong).');
        }

        $start = microtime(true);

        $response = Http::withToken($this->apiKey)
            ->timeout(30)
            ->post("{$this->baseUrl}/chat/completions", [
                'model' => $this->modelName,
                'messages' => [
                    ['role' => 'system', 'content' => $systemPrompt],
                    ['role' => 'user', 'content' => $userMessage],
                ],
                'max_tokens' => $options['max_tokens'] ?? 1024,
                'temperature' => $options['temperature'] ?? 0.4,
            ]);

        if ($response->failed()) {
            throw new AIProviderException('Groq API error: '.$response->body());
        }

        $data = $response->json();
        $text = $data['choices'][0]['message']['content'] ?? '';
        $usage = $data['usage'] ?? [];

        return new AIProviderResult(
            text: $text,
            model: $data['model'] ?? $this->modelName,
            inputTokens: (int) ($usage['prompt_tokens'] ?? 0),
            outputTokens: (int) ($usage['completion_tokens'] ?? 0),
            durationMs: (int) ((microtime(true) - $start) * 1000),
            rlRequestsLimit: $this->headerInt($response, 'x-ratelimit-limit-requests'),
            rlRequestsRemaining: $this->headerInt($response, 'x-ratelimit-remaining-requests'),
            rlTokensLimit: $this->headerInt($response, 'x-ratelimit-limit-tokens'),
            rlTokensRemaining: $this->headerInt($response, 'x-ratelimit-remaining-tokens'),
            rlRequestsResetAt: $this->parseGroqDuration($response->header('x-ratelimit-reset-requests')),
            rlTokensResetAt: $this->parseGroqDuration($response->header('x-ratelimit-reset-tokens')),
        );
    }

    protected function headerInt(Response $response, string $name): ?int
    {
        $value = $response->header($name);

        return $value !== null && $value !== '' ? (int) $value : null;
    }

    /**
     * Groq mengirim reset window sebagai durasi string (mis. "2m59.56s",
     * "7.66s", "1h2m3s") — bukan timestamp — jadi di-parse manual jadi
     * now() + durasi tersebut.
     */
    protected function parseGroqDuration(?string $raw): ?\DateTimeInterface
    {
        if (!$raw) {
            return null;
        }

        if (!preg_match('/(?:(\d+)h)?(?:(\d+)m)?(?:([\d.]+)s)?/', $raw, $m)) {
            return null;
        }

        $seconds = ((int) ($m[1] ?? 0)) * 3600
            + ((int) ($m[2] ?? 0)) * 60
            + (float) ($m[3] ?? 0);

        return $seconds > 0 ? now()->addSeconds((int) ceil($seconds)) : null;
    }
}