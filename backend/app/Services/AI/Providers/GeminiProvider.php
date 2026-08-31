<?php

namespace App\Services\AI\Providers;

use Illuminate\Support\Facades\Http;

class GeminiProvider implements AIProviderContract
{
    /**
     * Per 31 Agustus 2026, ai.google.dev/gemini-api/docs/rate-limits tidak lagi
     * mempublikasikan angka RPM/RPD/TPM tetap dan tidak kirim header quota di
     * respons — mereka arahkan ke dashboard AI Studio yang butuh login akun
     * sendiri. Jadi field kuota Gemini selalu null di sini, jujur, bukan
     * angka karangan.
     */
    public const QUOTA_NOTE = 'Gemini tidak mempublikasikan data quota via API — cek langsung di aistudio.google.com/rate-limit';

    public function __construct(
        protected ?string $apiKey,
        protected string $modelName,
        protected string $baseUrl,
    ) {
    }

    public function key(): string
    {
        return 'gemini';
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
            throw new AIProviderException('Gemini belum dikonfigurasi (GEMINI_API_KEY kosong).');
        }

        $start = microtime(true);

        $response = Http::withHeaders(['x-goog-api-key' => $this->apiKey])
            ->timeout(30)
            ->post("{$this->baseUrl}/models/{$this->modelName}:generateContent", [
                'contents' => [
                    ['role' => 'user', 'parts' => [['text' => $userMessage]]],
                ],
                'systemInstruction' => [
                    'parts' => [['text' => $systemPrompt]],
                ],
                'generationConfig' => [
                    'maxOutputTokens' => $options['max_tokens'] ?? 1024,
                    'temperature' => $options['temperature'] ?? 0.4,
                ],
            ]);

        if ($response->failed()) {
            throw new AIProviderException('Gemini API error: '.$response->body());
        }

        $data = $response->json();
        $text = $data['candidates'][0]['content']['parts'][0]['text'] ?? '';
        $usage = $data['usageMetadata'] ?? [];

        return new AIProviderResult(
            text: $text,
            model: $this->modelName,
            inputTokens: (int) ($usage['promptTokenCount'] ?? 0),
            outputTokens: (int) ($usage['candidatesTokenCount'] ?? 0),
            durationMs: (int) ((microtime(true) - $start) * 1000),
            rlNote: self::QUOTA_NOTE,
        );
    }
}