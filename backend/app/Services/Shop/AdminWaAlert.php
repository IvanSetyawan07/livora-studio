<?php

namespace App\Services\Shop;

use App\Services\WhatsApp\NullWhatsAppProvider;
use App\Services\WhatsApp\WhatsAppNotifier;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Mengirim alert WhatsApp ke HP admin (mis. 307) saat ada pelanggan yang butuh
 * dibalas di chat WhatsApp, Live Chat website, atau kejadian mendesak lainnya.
 *
 * - Cooldown per percakapan (10 menit) agar admin tidak dibanjiri pesan.
 * - Mendukung jendela 24 jam (kirim teks langsung) maupun di luar 24 jam (Template Meta).
 * - Tidak menulis ke tabel wa_conversations agar nomor admin tidak masuk inbox pelanggan.
 */
class AdminWaAlert
{
    public const ALERT_TYPES = ['N1', 'N8', 'N15', 'N17', 'N18'];

    /** Daftar nomor WA admin yang dinormalisasi (62...). */
    public static function phones(): array
    {
        $raw = (array) ShopSettings::get('admin_alert_phones', []);
        $out = [];
        foreach ($raw as $p) {
            $norm = WhatsAppNotifier::normalizePhone((string) $p);
            if ($norm !== '' && !in_array($norm, $out, true)) {
                $out[] = $norm;
            }
        }

        return $out;
    }

    public static function isAdminPhone(string $phone): bool
    {
        $norm = WhatsAppNotifier::normalizePhone($phone);

        return $norm !== '' && in_array($norm, self::phones(), true);
    }

    /** Alert awal (detik 0): kirim ke nomor admin pertama dengan cooldown 10 menit per scopeKey. */
    public static function notifyFromNotification(
        string $type,
        string $title,
        string $body,
        string $link,
        string $scopeKey,
        array $meta = []
    ): void {
        if (!in_array($type, self::ALERT_TYPES, true)) return;
        if (!ShopSettings::get('admin_alert_enabled', false)) return;

        $phones = self::phones();
        if (!$phones) return;

        // Cegah spam: maksimal 1 alert per percakapan/topik dalam 10 menit
        if (!Cache::add('admin_wa_alert:'.$scopeKey, 1, now()->addMinutes(10))) {
            return;
        }

        $sender = (string) ($meta['sender'] ?? $meta['phone'] ?? $title);
        $source = (string) ($meta['source'] ?? match ($type) {
            'N1' => 'Chat WA Bot',
            'N17' => 'Cek Harga WA Bot',
            'N18' => 'Live Chat Website',
            'N8' => 'Verifikasi Pembayaran',
            'N15' => 'Sistem Toko',
            default => 'Livora Admin',
        });
        $reason = (string) ($meta['reason'] ?? $body);

        // Detik 0 kirim ke nomor admin utama (pertama)
        self::deliver($phones[0], $sender, $source, $reason, $link, false);
    }

    /** Eskalasi menit ke-5: jika belum ditangani, kirim ke seluruh nomor admin (utama + cadangan). */
    public static function escalate(object $notification): void
    {
        $type = (string) ($notification->type ?? '');
        if (!in_array($type, ['N1', 'N8', 'N17', 'N18'], true)) return;
        if (!ShopSettings::get('admin_alert_enabled', false)) return;

        $phones = self::phones();
        if (!$phones) return;

        $id = (int) ($notification->id ?? 0);
        if ($id > 0 && !Cache::add('admin_wa_esc:'.$id, 1, now()->addMinutes(30))) {
            return;
        }

        $title = (string) ($notification->title ?? 'Butuh tindakan');
        $body = (string) ($notification->body ?? '');
        $link = (string) ($notification->link ?? '/admin');
        $source = '[ESKALASI >5m] '.match ($type) {
            'N1' => 'Chat WA Bot',
            'N17' => 'Cek Harga WA Bot',
            'N18' => 'Live Chat Website',
            default => $title,
        };

        // Jika lebih dari 1 nomor, prioritaskan nomor ke-2+ dan tetap ingatkan nomor ke-1
        foreach ($phones as $phone) {
            self::deliver($phone, $title, $source, $body, $link, true);
        }
    }

    /** Kirim uji coba langsung dari halaman Pengaturan toko (mengabaikan cooldown & toggle aktif). */
    public static function sendTest(?string $targetPhone = null): array
    {
        $phones = $targetPhone ? [WhatsAppNotifier::normalizePhone($targetPhone)] : self::phones();
        $phones = array_values(array_filter($phones));
        if (!$phones) {
            return ['ok' => false, 'results' => [], 'error' => 'Belum ada nomor admin penerima alert yang diisi.'];
        }

        $results = [];
        $anyOk = false;
        foreach ($phones as $phone) {
            [$ok, $mode, $err] = self::deliver(
                $phone,
                'Tes Sistem Livora',
                'Pengaturan Toko',
                'Ini pesan uji coba alert admin. Jika masuk, koneksi WA bot -> admin sudah berjalan.',
                '/admin/support',
                false,
                true
            );
            if ($ok) $anyOk = true;
            $results[] = ['phone' => $phone, 'ok' => $ok, 'mode' => $mode, 'error' => $err];
        }

        return [
            'ok' => $anyOk,
            'results' => $results,
            'error' => $anyOk ? null : ($results[0]['error'] ?? 'Gagal mengirim tes alert WA.'),
        ];
    }

    /**
     * @return array{0: bool, 1: string, 2: ?string} [berhasil, mode_kirim, ringkasan_error]
     */
    protected static function deliver(
        string $phone,
        string $sender,
        string $source,
        string $reason,
        string $link,
        bool $isEscalation,
        bool $isTest = false
    ): array {
        $baseUrl = rtrim((string) config('app.url', ''), '/');
        $fullUrl = str_starts_with($link, 'http') ? $link : $baseUrl.$link;

        $prefix = $isEscalation ? '[ESKALASI BELUM DIBALAS]' : ($isTest ? '[TES ALERT]' : '[ALERT LIVORA]');
        $textBody = "{$prefix} Ada pelanggan butuh respon admin.\n\n"
            ."Pelanggan: ".self::cleanParam($sender, 80)."\n"
            ."Sumber: ".self::cleanParam($source, 60)."\n"
            ."Catatan: ".self::cleanParam($reason, 220)."\n\n"
            ."Buka langsung:\n{$fullUrl}";

        // Cek apakah menggunakan Meta Cloud API
        if (WaSender::configured()) {
            $inWindow = Cache::has("admin_wa_window:{$phone}")
                || DB::table('wa_conversations')->where('phone', $phone)->where('last_inbound_at', '>', now()->subHours(24))->exists();

            if ($inWindow) {
                [$ok, $err] = WaSender::sendDirectMeta($phone, ['type' => 'text', 'body' => $textBody]);
                if (!$ok) self::logFailure($phone, $textBody, $err);
                return [$ok, 'meta_text_24h', $err];
            }

            // Di luar 24 jam → wajib Template Meta
            $tplName = trim((string) ShopSettings::get('admin_alert_template', 'admin_chat_butuh_balasan')) ?: 'admin_chat_butuh_balasan';
            $tplLang = trim((string) ShopSettings::get('admin_alert_template_lang', 'id')) ?: 'id';
            $hasUrlBtn = (bool) ShopSettings::get('admin_alert_template_has_url_btn', false);

            // Jika template belum pakai tombol URL dinamis, ikutkan URL di parameter {{3}} agar admin tetap punya link
            $param3 = $hasUrlBtn
                ? self::cleanParam($reason, 140)
                : self::cleanParam($reason.' | Buka: '.$fullUrl, 220);

            $components = [
                [
                    'type' => 'body',
                    'parameters' => [
                        ['type' => 'text', 'text' => self::cleanParam($sender, 80)],
                        ['type' => 'text', 'text' => self::cleanParam($source, 60)],
                        ['type' => 'text', 'text' => $param3],
                    ],
                ],
            ];

            if ($hasUrlBtn) {
                $suffix = ltrim(preg_replace('#^/?admin/#', '', $link) ?? $link, '/');
                $components[] = [
                    'type' => 'button',
                    'sub_type' => 'url',
                    'index' => '0',
                    'parameters' => [
                        ['type' => 'text', 'text' => $suffix !== '' ? $suffix : 'support'],
                    ],
                ];
            }

            [$ok, $err] = WaSender::sendDirectMeta($phone, [
                'type' => 'template',
                'template' => [
                    'name' => $tplName,
                    'language' => ['code' => $tplLang],
                    'components' => $components,
                ],
            ]);

            if (!$ok) self::logFailure($phone, "[Template:{$tplName}] {$textBody}", $err);
            return [$ok, "meta_template:{$tplName}", $err];
        }

        // Fallback jika memakai Fonnte / Twilio di WhatsAppNotifier
        if (!(WhatsAppNotifier::provider() instanceof NullWhatsAppProvider)) {
            $res = WhatsAppNotifier::send($phone, $textBody);
            $ok = in_array($res['status'] ?? '', ['sent', 'queued', 'ok', 'delivered'], true);
            $err = $ok ? null : ($res['error'] ?? 'Gagal kirim via '.(config('services.whatsapp.provider') ?: 'provider'));
            if (!$ok) self::logFailure($phone, $textBody, $err);
            return [$ok, 'notifier_'.(config('services.whatsapp.provider') ?: 'other'), $err];
        }

        return [false, 'unconfigured', 'Provider WhatsApp (Meta / Fonnte / Twilio) belum dikonfigurasi di .env server.'];
    }

    /** Meta melarang newline/tab/spasi >3 di dalam parameter template. */
    protected static function cleanParam(string $s, int $max): string
    {
        $clean = trim(preg_replace('/\s+/u', ' ', $s) ?? $s);
        $clean = $clean !== '' ? $clean : '-';

        return mb_substr($clean, 0, $max);
    }

    protected static function logFailure(string $phone, string $body, ?string $err): void
    {
        Log::warning('AdminWaAlert gagal terkirim', ['to' => $phone, 'error' => $err]);
        try {
            DB::table('wa_failed_messages')->insert([
                'phone' => $phone,
                'body' => mb_substr($body, 0, 2000),
                'order_id' => null,
                'error' => mb_substr((string) ($err ?? 'unknown'), 0, 500),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        } catch (\Throwable $e) {
            /* abaikan jika tabel belum siap */
        }
    }
}
