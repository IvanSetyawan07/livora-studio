<?php

namespace App\Services\AI\Providers;

use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;

class AnthropicProvider implements AIProviderContract
{
    public function __construct(
        protected ?string $apiKey,
        protected string $modelName,
        protected string $baseUrl,
    ) {
    }

    public function key(): string
    {
        return 'anthropic';
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
            throw new AIProviderException('Anthropic belum dikonfigurasi (ANTHROPIC_API_KEY kosong).');
        }

        $start = microtime(true);

        $response = Http::withHeaders([
                'x-api-key' => $this->apiKey,
                'anthropic-version' => '2023-06-01',
            ])
            ->timeout(30)
            ->post("{$this->baseUrl}/messages", [
                'model' => $this->modelName,
                'system' => $systemPrompt,
                'max_tokens' => $options['max_tokens'] ?? 1024,
                'messages' => [
                    ['role' => 'user', 'content' => $userMessage],
                ],
            ]);

        if ($response->failed()) {
            throw new AIProviderException('Anthropic API error: '.$response->body());
        }

        $data = $response->json();
        $text = collect($data['content'] ?? [])->firstWhere('type', 'text')['text'] ?? '';
        $usage = $data['usage'] ?? [];

        return new AIProviderResult(
            text: $text,
            model: $data['model'] ?? $this->modelName,
            inputTokens: (int) ($usage['input_tokens'] ?? 0),
            outputTokens: (int) ($usage['output_tokens'] ?? 0),
            durationMs: (int) ((microtime(true) - $start) * 1000),
            rlRequestsLimit: $this->headerInt($response, 'anthropic-ratelimit-requests-limit'),
            rlRequestsRemaining: $this->headerInt($response, 'anthropic-ratelimit-requests-remaining'),
            rlTokensLimit: $this->headerInt($response, 'anthropic-ratelimit-tokens-limit'),
            rlTokensRemaining: $this->headerInt($response, 'anthropic-ratelimit-tokens-remaining'),
            rlRequestsResetAt: $this->parseTimestamp($response->header('anthropic-ratelimit-requests-reset')),
            rlTokensResetAt: $this->parseTimestamp($response->header('anthropic-ratelimit-tokens-reset')),
        );
    }

    protected function headerInt(Response $response, string $name): ?int
    {
        $value = $response->header($name);

        return $value !== null && $value !== '' ? (int) $value : null;
    }

    /** Anthropic mengirim reset sebagai timestamp RFC 3339, beda dari Groq yang berupa durasi. */
    protected function parseTimestamp(?string $raw): ?\DateTimeInterface
    {
        if (!$raw) {
            return null;
        }

        try {
            return new \DateTimeImmutable($raw);
        } catch (\Throwable) {
            return null;
        }
    }
}