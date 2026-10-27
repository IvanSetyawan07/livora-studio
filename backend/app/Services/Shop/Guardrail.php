<?php

namespace App\Services\Shop;

/**
 * Pemeriksa guardrail: setiap output AI dicek sebelum dikirim.
 * - Angka rupiah yang tidak berasal dari hasil tool → blokir.
 * - Kata janji (diskon/dijamin/pasti ada/besok sampai) → blokir.
 * - Kebocoran system prompt → blokir.
 * Output yang terblokir diganti jawaban aman dan dicatat flag guardrail_blocked.
 */
class Guardrail
{
    public const SAFE_REPLY = 'Maaf Bapak/Ibu, untuk hal itu biar tim kami yang memastikan langsung ya supaya akurat. Ada yang bisa saya bantu lagi soal furniture-nya?';

    private const PROMISE_WORDS = ['dijamin', 'pasti ada', 'pasti bisa', 'besok sampai', 'garansi sampai', 'sudah lunas', 'pembayaran sudah kami terima', 'sudah kami terima pembayaran'];
    private const PROMPT_LEAK = ['system prompt', 'aturan keras', 'kamu adalah livi', 'tool calling', 'function calling'];

    /**
     * @param  array  $allowedAmounts  nominal yang boleh muncul (dari hasil tool / input admin)
     * @param  bool  $discountVerified  true bila diskon yang dibahas BERASAL dari admin (cek harga),
     *                                  sehingga kalimat "ada diskon ..." tidak dianggap janji liar
     * @return array{ok: bool, text: string, reason: ?string}
     */
    public static function check(string $text, array $allowedAmounts = [], bool $discountVerified = false): array
    {
        $lower = mb_strtolower($text);

        // 1. Angka rupiah liar
        if (preg_match_all('/rp\s?([\d.,]+)/i', $text, $m)) {
            foreach ($m[1] as $raw) {
                $amount = (int) preg_replace('/\D/', '', $raw);
                if ($amount > 0 && !in_array($amount, array_map('intval', $allowedAmounts), true)) {
                    return self::block('angka_rupiah_tanpa_tool');
                }
            }
        }

        // 2. Kata janji — "diskon" hanya diblok bila bot menjanjikan, bukan menjelaskan kebijakan umum
        foreach (self::PROMISE_WORDS as $w) {
            if (str_contains($lower, $w)) return self::block('kata_janji: '.$w);
        }
        if (!$discountVerified && (preg_match('/\b(diskon|potongan harga)\b.*\b(bisa|kasih|beri|kasihkan|ada)\b/i', $lower)
            || preg_match('/\b(bisa|ada)\b.*\bdiskon\b/i', $lower))) {
            return self::block('janji_diskon');
        }

        // 3. Kebocoran prompt
        foreach (self::PROMPT_LEAK as $w) {
            if (str_contains($lower, $w)) return self::block('kebocoran_prompt');
        }

        return ['ok' => true, 'text' => $text, 'reason' => null];
    }

    protected static function block(string $reason): array
    {
        return ['ok' => false, 'text' => self::SAFE_REPLY, 'reason' => $reason];
    }
}
