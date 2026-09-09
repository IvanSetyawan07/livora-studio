<?php

namespace App\Services\AI;

/**
 * Harga per 1 juta token (USD) per provider+model, dipakai untuk mengisi kolom
 * `cost` di ai_usage_logs. Kalau sebuah model tidak ada di tabel ini, biayanya
 * dikembalikan null — JANGAN diisi 0, karena 0 tidak bisa dibedakan dari
 * "gratis" dan bikin dashboard berbohong. Frontend menampilkan
 * "not tracked yet" untuk kasus itu.
 *
 * Angka di bawah adalah harga publik saat ditulis; kalau vendor mengubah
 * harga, cukup perbarui daftar ini.
 */
class AiPricing
{
    /** @var array<string, array{in: float, out: float}> */
    private const TABLE = [
        // Google Gemini
        'gemini:gemini-2.5-flash' => ['in' => 0.30, 'out' => 2.50],
        'gemini:gemini-2.5-flash-lite' => ['in' => 0.10, 'out' => 0.40],
        'gemini:gemini-2.5-pro' => ['in' => 1.25, 'out' => 10.00],
        'gemini:gemini-2.0-flash' => ['in' => 0.10, 'out' => 0.40],

        // Anthropic Claude
        'anthropic:claude-3-5-haiku' => ['in' => 0.80, 'out' => 4.00],
        'anthropic:claude-3-5-sonnet' => ['in' => 3.00, 'out' => 15.00],
        'anthropic:claude-3-7-sonnet' => ['in' => 3.00, 'out' => 15.00],
        'anthropic:claude-sonnet-4' => ['in' => 3.00, 'out' => 15.00],
        'anthropic:claude-opus-4' => ['in' => 15.00, 'out' => 75.00],

        // Groq
        'groq:llama-3.3-70b-versatile' => ['in' => 0.59, 'out' => 0.79],
        'groq:llama-3.1-8b-instant' => ['in' => 0.05, 'out' => 0.08],
        'groq:openai/gpt-oss-120b' => ['in' => 0.15, 'out' => 0.75],
    ];

    /** Biaya USD untuk satu panggilan, atau null kalau harganya belum diketahui. */
    public static function costFor(string $provider, string $model, int $inputTokens, int $outputTokens): ?float
    {
        $rate = self::rate($provider, $model);

        if ($rate === null) {
            return null;
        }

        return round(($inputTokens / 1_000_000) * $rate['in'] + ($outputTokens / 1_000_000) * $rate['out'], 6);
    }

    /** @return array{in: float, out: float}|null */
    private static function rate(string $provider, string $model): ?array
    {
        $model = strtolower(trim($model));
        $exact = self::TABLE[$provider.':'.$model] ?? null;

        if ($exact !== null) {
            return $exact;
        }

        // Nama model sering bersuffix tanggal/versi (mis. claude-3-5-sonnet-20241022,
        // gemini-2.5-flash-preview). Cocokkan prefix terpanjang yang dikenal.
        $best = null;
        $bestLength = 0;
        foreach (self::TABLE as $key => $rate) {
            [$keyProvider, $keyModel] = explode(':', $key, 2);
            if ($keyProvider !== $provider) {
                continue;
            }
            if (str_starts_with($model, $keyModel) && strlen($keyModel) > $bestLength) {
                $best = $rate;
                $bestLength = strlen($keyModel);
            }
        }

        return $best;
    }
}
