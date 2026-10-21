<?php

namespace App\Services\Shop;

use App\Services\WhatsApp\WhatsAppNotifier;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

/**
 * Pengirim pesan WhatsApp kaya (Meta Cloud API): teks, tombol (maks 3),
 * list, gambar, dokumen, template. Jika secret Meta belum ada, pesan hanya
 * dicatat (terlihat di Simulator) — tidak pernah melempar error ke alur utama.
 */
class WaSender
{
    public static function configured(): bool
    {
        $c = config('services.whatsapp.meta', []);

        return (config('services.whatsapp.provider') === 'meta') && !empty($c['access_token']) && !empty($c['phone_number_id']);
    }

    /**
     * Kirim satu pesan keluar. $msg: ['type' => text|buttons|list|image|document|template, ...]
     * Selalu dicatat ke wa_messages (arah out) agar Simulator & inbox admin melihatnya.
     */
    public static function send(string $phone, array $msg, ?int $orderId = null, ?int $conversationId = null): bool
    {
        $phone = WhatsAppNotifier::normalizePhone($phone);
        $body = $msg['body'] ?? $msg['text'] ?? '';
        $payload = $msg;
        $ok = true;

        if (self::configured()) {
            $ok = self::toMeta($phone, $msg);
        }

        try {
            DB::table('wa_messages')->insert([
                'phone' => $phone, 'order_id' => $orderId, 'conversation_id' => $conversationId,
                'direction' => 'out', 'type' => $msg['type'] ?? 'text', 'body' => $body,
                'payload' => json_encode($payload), 'status' => $ok ? 'sent' : 'failed',
                'created_at' => now(), 'updated_at' => now(),
            ]);
            DB::table('wa_conversations')->where('phone', $phone)->update(['last_outbound_at' => now(), 'updated_at' => now()]);
        } catch (\Throwable $e) {
            Log::warning('Catatan WA keluar gagal', ['error' => $e->getMessage()]);
        }
        if (!$ok && self::configured()) {
            NotifyService::notify('N15', $orderId, ['reason' => 'Pesan WA ke '.$phone.' gagal terkirim'], 'send-'.$phone);
        }

        return $ok;
    }

    public static function text(string $phone, string $body, ?int $orderId = null): bool
    {
        return self::send($phone, ['type' => 'text', 'body' => $body], $orderId);
    }

    /** Maks 3 tombol, judul maks 20 karakter (batas WhatsApp). */
    public static function buttons(string $phone, string $body, array $buttons, ?int $orderId = null): bool
    {
        $buttons = array_slice(array_map(fn ($b, $i) => ['id' => 'btn_'.$i, 'title' => mb_substr($b, 0, 20)], $buttons, array_keys($buttons)), 0, 3);

        return self::send($phone, ['type' => 'buttons', 'body' => $body, 'buttons' => $buttons], $orderId);
    }

    /** Daftar pilihan (list) WhatsApp. $rows: [['id' => ..., 'title' => ..., 'description' => ...]] */
    public static function list(string $phone, string $body, string $buttonLabel, array $rows, ?int $orderId = null): bool
    {
        return self::send($phone, ['type' => 'list', 'body' => $body, 'button' => mb_substr($buttonLabel, 0, 20), 'rows' => $rows], $orderId);
    }

    public static function document(string $phone, string $caption, string $url, string $filename, ?int $orderId = null): bool
    {
        return self::send($phone, ['type' => 'document', 'body' => $caption, 'url' => $url, 'filename' => $filename], $orderId);
    }

    public static function image(string $phone, string $caption, string $url, ?int $orderId = null): bool
    {
        return self::send($phone, ['type' => 'image', 'body' => $caption, 'url' => $url], $orderId);
    }

    /** Unduh media masuk dari Meta Media API ke disk privat. */
    public static function downloadMedia(string $mediaId): ?string
    {
        if (!self::configured()) return null;
        $c = config('services.whatsapp.meta');
        try {
            $meta = Http::timeout(15)->withToken($c['access_token'])
                ->get('https://graph.facebook.com/'.($c['api_version'] ?? 'v21.0').'/'.$mediaId);
            if (!$meta->successful() || !($url = $meta->json('url'))) return null;
            $bin = Http::timeout(30)->withToken($c['access_token'])->get($url);
            if (!$bin->successful()) return null;
            $path = 'wa-media/'.$mediaId.'.jpg';
            Storage::disk('local')->put($path, $bin->body());

            return $path;
        } catch (\Throwable $e) {
            Log::warning('Unduh media WA gagal', ['error' => $e->getMessage()]);

            return null;
        }
    }

    protected static function toMeta(string $phone, array $msg): bool
    {
        $c = config('services.whatsapp.meta');
        $version = $c['api_version'] ?? 'v21.0';
        $payload = match ($msg['type'] ?? 'text') {
            'buttons' => [
                'messaging_product' => 'whatsapp', 'to' => $phone, 'type' => 'interactive',
                'interactive' => ['type' => 'button', 'body' => ['text' => $msg['body']],
                    'action' => ['buttons' => array_map(fn ($b) => ['type' => 'reply', 'reply' => $b], $msg['buttons'])]],
            ],
            'list' => [
                'messaging_product' => 'whatsapp', 'to' => $phone, 'type' => 'interactive',
                'interactive' => ['type' => 'list', 'body' => ['text' => $msg['body']],
                    'action' => ['button' => $msg['button'], 'sections' => [['title' => 'Pilihan', 'rows' => $msg['rows']]]]],
            ],
            'image' => ['messaging_product' => 'whatsapp', 'to' => $phone, 'type' => 'image',
                'image' => ['link' => $msg['url'], 'caption' => $msg['body'] ?? '']],
            'document' => ['messaging_product' => 'whatsapp', 'to' => $phone, 'type' => 'document',
                'document' => ['link' => $msg['url'], 'caption' => $msg['body'] ?? '', 'filename' => $msg['filename']]],
            'template' => ['messaging_product' => 'whatsapp', 'to' => $phone, 'type' => 'template', 'template' => $msg['template']],
            default => ['messaging_product' => 'whatsapp', 'to' => $phone, 'type' => 'text', 'text' => ['body' => $msg['body'] ?? '']],
        ];
        try {
            $res = Http::timeout(12)->withToken($c['access_token'])
                ->post("https://graph.facebook.com/{$version}/{$c['phone_number_id']}/messages", $payload);

            return $res->successful();
        } catch (\Throwable $e) {
            return false;
        }
    }
}
