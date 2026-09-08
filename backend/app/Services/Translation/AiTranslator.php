<?php

namespace App\Services\Translation;

use App\Services\AI\AIProviderManager;

/**
 * Penerjemah konten Livora (ID <-> EN) memakai provider AI yang sudah ada.
 *
 * Tidak pernah mengarang isi: kalau field kosong, hasilnya juga kosong.
 * Model diminta mengembalikan JSON dengan kunci yang sama persis dengan
 * input, supaya pemetaan field tidak pernah tertukar.
 */
class AiTranslator
{
    public function __construct(private AIProviderManager $ai)
    {
    }

    private const LANGUAGE_NAMES = [
        'id' => 'Bahasa Indonesia',
        'en' => 'English',
    ];

    /**
     * @param  array<string, string|null>  $fields
     * @return array{values: array<string, string>, provider: string, model: string}
     */
    public function translate(array $fields, string $from, string $to): array
    {
        $payload = [];
        foreach ($fields as $key => $value) {
            if (is_string($value) && trim($value) !== '') {
                $payload[$key] = $value;
            }
        }

        if (!$payload) {
            return ['values' => [], 'provider' => 'none', 'model' => 'none'];
        }

        $fromName = self::LANGUAGE_NAMES[$from] ?? $from;
        $toName = self::LANGUAGE_NAMES[$to] ?? $to;

        $system = <<<PROMPT
You are a professional translator for Livora, a premium interior design and furniture studio (European, quiet, refined tone).

Translate the given content from {$fromName} to {$toName}.

Hard rules:
- Return ONLY a JSON object. No markdown fences, no commentary.
- Use exactly the same keys as the input object. Never add or drop keys.
- Translate values only. Keep proper nouns (Livora, PT. Langgeng Cipta Ruang), product codes, measurements, URLs and HTML tags unchanged.
- Keep the marketing tone: elegant, calm, concise. Do not invent facts, features, prices or claims that are not in the source text.
- Preserve line breaks and punctuation style of the source.
PROMPT;

        $user = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);

        $result = $this->ai->ask($system, "Translate this JSON object:\n\n{$user}", 'translation');

        $values = $this->decode($result['text'] ?? '');

        // Buang kunci yang tidak diminta, supaya tidak ada field liar masuk DB.
        $values = array_intersect_key($values, $payload);

        return [
            'values' => $values,
            'provider' => $result['provider'] ?? 'unknown',
            'model' => $result['model'] ?? 'unknown',
        ];
    }

    /** @return array<string, string> */
    private function decode(string $text): array
    {
        $clean = trim($text);
        $clean = preg_replace('/^```(?:json)?|```$/m', '', $clean) ?? $clean;

        $start = strpos($clean, '{');
        $end = strrpos($clean, '}');
        if ($start === false || $end === false || $end <= $start) {
            throw new \RuntimeException('AI tidak mengembalikan JSON terjemahan yang valid.');
        }

        $decoded = json_decode(substr($clean, $start, $end - $start + 1), true);
        if (!is_array($decoded)) {
            throw new \RuntimeException('AI tidak mengembalikan JSON terjemahan yang valid.');
        }

        $values = [];
        foreach ($decoded as $key => $value) {
            if (is_string($value)) {
                $values[(string) $key] = $value;
            }
        }

        return $values;
    }
}
