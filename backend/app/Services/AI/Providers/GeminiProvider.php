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
        $modelsToTry = array_values(array_unique(array_filter([
            $this->modelName,
            config('services.gemini.fallback_model'),
            'gemini-2.5-flash',
        ])));

        $response = null;
        $usedModel = $this->modelName;

        foreach ($modelsToTry as $idx => $candidateModel) {
            $useGoogleSearch = !empty($options['google_search']);
            $generationConfig = [
                'maxOutputTokens' => $options['max_tokens'] ?? 4096,
                'temperature' => $options['temperature'] ?? 0.4,
            ];

            // Gemini API tidak mengizinkan responseMimeType=application/json bersamaan dengan tools google_search.
            if (!$useGoogleSearch && !empty($options['response_mime_type'])) {
                $generationConfig['responseMimeType'] = $options['response_mime_type'];
            }

            // Hindari model Gemini 2.5/3.x menghabiskan kuota output untuk reasoning saat butuh JSON cepat.
            if (str_contains($candidateModel, 'gemini-2.5') || str_contains($candidateModel, 'gemini-3')) {
                $generationConfig['thinkingConfig'] = ['thinkingLevel' => $options['thinking_level'] ?? 'low'];
            }

            $payload = [
                'contents' => [
                    ['role' => 'user', 'parts' => [['text' => $userMessage]]],
                ],
                'systemInstruction' => [
                    'parts' => [['text' => $systemPrompt]],
                ],
                'generationConfig' => $generationConfig,
            ];

            if ($useGoogleSearch) {
                $payload['tools'] = [['google_search' => new \stdClass()]];
            }

            $res = Http::withHeaders(['x-goog-api-key' => $this->apiKey])
                ->timeout(45)
                ->post("{$this->baseUrl}/models/{$candidateModel}:generateContent", $payload);

            $response = $res;
            $usedModel = $candidateModel;

            // Fallback ke model cadangan kalau model utama 404 / tidak mendukung tool tertentu.
            $shouldFallback = $res->status() === 404
                || str_contains($res->body(), 'not found')
                || ($useGoogleSearch && $res->status() === 400);
            if ($res->successful() || !$shouldFallback || $idx === count($modelsToTry) - 1) {
                break;
            }
        }

        if (!$response || $response->failed()) {
            throw new AIProviderException('Gemini API error: '.($response ? $response->body() : 'no response'));
        }

        $data = $response->json();
        $candidate = $data['candidates'][0] ?? [];
        $parts = $candidate['content']['parts'] ?? [];
        $text = '';
        $fallbackText = '';
        foreach ($parts as $part) {
            $piece = (string) ($part['text'] ?? '');
            if ($piece === '') {
                continue;
            }
            $fallbackText .= $piece;
            if (!empty($part['thought'])) {
                continue;
            }
            $text .= $piece;
        }
        $text = $text !== '' ? $text : $fallbackText;

        $groundingChunks = $this->extractGroundingChunks($candidate['groundingMetadata'] ?? []);
        $usage = $data['usageMetadata'] ?? [];
        $outputTokens = (int) ($usage['candidatesTokenCount'] ?? 0) + (int) ($usage['thoughtsTokenCount'] ?? 0);

        return new AIProviderResult(
            text: $text,
            model: $usedModel,
            inputTokens: (int) ($usage['promptTokenCount'] ?? 0),
            outputTokens: $outputTokens,
            durationMs: (int) ((microtime(true) - $start) * 1000),
            rlNote: self::QUOTA_NOTE,
            groundingChunks: $groundingChunks !== [] ? $groundingChunks : null,
        );
    }

    /**
     * Ekstrak sumber web nyata dari Google Search Grounding agar URL selalu terverifikasi
     * berasal dari hasil pencarian Google, bukan tebakan model.
     *
     * @param  array<string, mixed>  $metadata
     * @return list<array<string, mixed>>
     */
    protected function extractGroundingChunks(array $metadata): array
    {
        $rawChunks = is_array($metadata['groundingChunks'] ?? null) ? $metadata['groundingChunks'] : [];
        if ($rawChunks === []) {
            return [];
        }

        $supports = is_array($metadata['groundingSupports'] ?? null) ? $metadata['groundingSupports'] : [];
        $snippetsByChunk = [];
        foreach ($supports as $sup) {
            $segText = trim((string) ($sup['segment']['text'] ?? ''));
            if ($segText === '') {
                continue;
            }
            foreach ($sup['groundingChunkIndices'] ?? [] as $ci) {
                $snippetsByChunk[(int) $ci][] = $segText;
            }
        }

        $out = [];
        foreach ($rawChunks as $idx => $chunk) {
            $web = is_array($chunk['web'] ?? null) ? $chunk['web'] : null;
            if (!$web || empty($web['uri']) || !is_string($web['uri'])) {
                continue;
            }
            $uri = trim($web['uri']);
            $out[] = [
                'index' => (int) $idx,
                'uri' => $uri,
                'title' => trim((string) ($web['title'] ?? '')),
                'domain' => trim((string) ($web['domain'] ?? parse_url($uri, PHP_URL_HOST) ?? '')),
                'snippets' => array_slice(array_values(array_unique($snippetsByChunk[(int) $idx] ?? [])), 0, 4),
            ];
        }

        return $out;
    }
}