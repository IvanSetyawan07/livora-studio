<?php

namespace App\Services\Shop;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * Pengaturan toko yang bisa diubah Owner tanpa deploy (tabel shop_settings).
 * Nilai disimpan JSON; bila kosong jatuh ke config/services.php.
 */
class ShopSettings
{
    public const DEFAULTS = [
        'bot_enabled' => true,
        'ai_answers_enabled' => true,
        'business_hours' => ['days' => [1, 2, 3, 4, 5, 6], 'start' => '09:00', 'end' => '17:00'],
        'blocklist' => [],
        'sla_hours' => 4,
        'warranty_days' => 365,
        'return_days' => 7,
        'retention_days' => 730,
        'templates' => [
            'greeting' => 'Halo, terima kasih sudah menghubungi Livora. Saya asisten otomatis (AI) Livora. Sebutkan kode pesanan Anda (contoh: LVR-AB12CD), atau ketik TIM untuk berbicara dengan tim kami.',
            'form_link' => 'Halo {nama}, pesanan {kode} sudah kami terima. Silakan lengkapi data pengiriman di: {link}' . "\n" . 'Ketik TIM kapan saja untuk berbicara dengan tim kami.',
            'handoff' => 'Baik, saya hubungkan dengan tim Livora. Mohon tunggu sebentar, tim kami akan segera membalas di chat ini.',
            'off_hours' => 'Terima kasih. Tim Livora sedang di luar jam kerja (Senin–Sabtu 09.00–17.00 WIB). Pesan Anda sudah kami catat dan akan dibalas di jam kerja berikutnya.',
            'session_closed' => 'Sesi dengan tim Livora sudah selesai. Asisten otomatis kembali aktif. Ketik TIM bila perlu bantuan lagi.',
            'unknown' => 'Maaf, saya belum memahami pesan Anda. Ketik STATUS untuk cek pesanan, atau TIM untuk berbicara dengan tim kami.',
        ],
    ];

    public static function all(): array
    {
        return Cache::remember('shop_settings', 300, function () {
            $rows = DB::table('shop_settings')->pluck('value', 'key')->map(fn ($v) => json_decode((string) $v, true))->all();
            $out = self::DEFAULTS;
            foreach ($rows as $k => $v) {
                if ($v === null) continue;
                $out[$k] = is_array($v) && isset(self::DEFAULTS[$k]) && is_array(self::DEFAULTS[$k]) && !array_is_list(self::DEFAULTS[$k])
                    ? array_merge(self::DEFAULTS[$k], $v) : $v;
            }
            $out['shipping_zones'] = $rows['shipping_zones'] ?? config('services.shop.shipping_zones', []);
            $out['review_threshold'] = (int) ($rows['review_threshold'] ?? config('services.shop.review_threshold'));
            $out['quote_valid_days'] = (int) ($rows['quote_valid_days'] ?? config('services.shop.quote_valid_days', 3));

            return $out;
        });
    }

    public static function get(string $key, mixed $default = null): mixed
    {
        return self::all()[$key] ?? $default;
    }

    public static function set(array $values): void
    {
        foreach ($values as $k => $v) {
            DB::table('shop_settings')->updateOrInsert(['key' => $k], ['value' => json_encode($v), 'updated_at' => now(), 'created_at' => now()]);
        }
        Cache::forget('shop_settings');
    }

    public static function template(string $key, array $vars = []): string
    {
        $tpl = self::get('templates')[$key] ?? self::DEFAULTS['templates'][$key] ?? '';
        foreach ($vars as $k => $v) $tpl = str_replace('{'.$k.'}', (string) $v, $tpl);

        return $tpl;
    }

    public static function withinBusinessHours(): bool
    {
        $h = self::get('business_hours');
        $now = now('Asia/Jakarta');

        return in_array((int) $now->isoWeekday(), array_map('intval', $h['days'] ?? []), true)
            && $now->format('H:i') >= ($h['start'] ?? '09:00') && $now->format('H:i') < ($h['end'] ?? '17:00');
    }
}
