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
        $msg = self::normalize($msg);
        $body = $msg['body'] ?? '';
        $ok = true;
        $error = null;

        if (self::configured()) {
            [$ok, $error] = self::toMeta($phone, $msg);
        }

        try {
            $row = [
                'phone' => $phone, 'order_id' => $orderId, 'conversation_id' => $conversationId,
                'direction' => 'out', 'type' => mb_substr($msg['type'] ?? 'text', 0, 20), 'body' => $body,
                'payload' => json_encode($msg), 'status' => $ok ? 'sent' : 'failed',
                'created_at' => now(), 'updated_at' => now(),
            ];
            if (\Illuminate\Support\Facades\Schema::hasColumn('wa_messages', 'error_note')) $row['error_note'] = $error;
            DB::table('wa_messages')->insert($row);
            DB::table('wa_conversations')->where('phone', $phone)->update(['last_outbound_at' => now(), 'updated_at' => now()]);
        } catch (\Throwable $e) {
            Log::warning('Catatan WA keluar gagal', ['error' => $e->getMessage()]);
        }
        if (!$ok && self::configured()) {
            NotifyService::notify('N15', $orderId, ['reason' => 'Pesan WA ke '.$phone.' gagal terkirim'.($error ? ': '.$error : '')], 'send-'.$phone);
        }

        return $ok;
    }

    /**
     * Normalisasi ke batas WhatsApp: body 1024 (teks 4096), tombol maks 3 {id,title<=20},
     * list rows {id<=200,title<=24,description<=72} maks 10, label tombol list <=20, footer <=60.
     */
    public static function normalize(array $msg): array
    {
        $type = $msg['type'] ?? 'text';
        $msg['type'] = $type;
        $body = (string) ($msg['body'] ?? $msg['text'] ?? '');
        unset($msg['text']);
        $msg['body'] = mb_substr($body, 0, in_array($type, ['buttons', 'list'], true) ? 1024 : 4096);
        if (isset($msg['footer'])) $msg['footer'] = mb_substr((string) $msg['footer'], 0, 60);

        if ($type === 'buttons') {
            $out = [];
            $used = [];
            foreach (array_values((array) ($msg['buttons'] ?? [])) as $i => $b) {
                $title = is_array($b) ? (string) ($b['title'] ?? $b['id'] ?? '') : (string) $b;
                $title = trim($title);
                if ($title === '') continue;
                $id = is_array($b) && !empty($b['id']) ? (string) $b['id'] : 'btn_'.(\Illuminate\Support\Str::slug($title) ?: $i);
                $id = mb_substr($id, 0, 256);
                if (isset($used[$id])) $id .= '_'.$i;
                $used[$id] = true;
                $out[] = ['id' => $id, 'title' => mb_substr($title, 0, 20)];
                if (count($out) === 3) break;
            }
            $msg['buttons'] = $out;
            if (!$out) $msg['type'] = 'text';
        }

        if ($type === 'list') {
            $rows = [];
            foreach (array_values((array) ($msg['rows'] ?? [])) as $i => $r) {
                $title = trim(is_array($r) ? (string) ($r['title'] ?? $r['id'] ?? '') : (string) $r);
                if ($title === '') continue;
                $row = [
                    'id' => mb_substr(is_array($r) && !empty($r['id']) ? (string) $r['id'] : 'row_'.(\Illuminate\Support\Str::slug($title) ?: $i), 0, 200),
                    'title' => mb_substr($title, 0, 24),
                ];
                if (is_array($r) && !empty($r['description'])) $row['description'] = mb_substr((string) $r['description'], 0, 72);
                $rows[] = $row;
                if (count($rows) === 10) break;
            }
            $msg['rows'] = $rows;
            $msg['button'] = mb_substr((string) ($msg['button'] ?? 'Pilih'), 0, 20) ?: 'Pilih';
            if (!$rows) $msg['type'] = 'text';
        }

        return $msg;
    }

    public static function text(string $phone, string $body, ?int $orderId = null): bool
    {
        return self::send($phone, ['type' => 'text', 'body' => $body], $orderId);
    }

    /** Maks 3 tombol, judul maks 20 karakter (batas WhatsApp). */
    public static function buttons(string $phone, string $body, array $buttons, ?int $orderId = null): bool
    {
        return self::send($phone, ['type' => 'buttons', 'body' => $body, 'buttons' => $buttons], $orderId);
    }

    /** Daftar pilihan (list) WhatsApp. $rows: [['id' => ..., 'title' => ..., 'description' => ...]] */
    public static function list(string $phone, string $body, string $buttonLabel, array $rows, ?int $orderId = null): bool
    {
        return self::send($phone, ['type' => 'list', 'body' => $body, 'button' => $buttonLabel, 'rows' => $rows], $orderId);
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

    /** @return array{0: bool, 1: ?string} [berhasil, ringkasan error] — token tidak pernah dicatat. */
    protected static function toMeta(string $phone, array $msg): array
    {
        $c = config('services.whatsapp.meta');
        $version = $c['api_version'] ?? 'v21.0';
        $interactive = fn (array $i) => array_filter($i + ['footer' => isset($msg['footer']) && $msg['footer'] !== '' ? ['text' => $msg['footer']] : null]);
        $payload = match ($msg['type'] ?? 'text') {
            'buttons' => [
                'messaging_product' => 'whatsapp', 'to' => $phone, 'type' => 'interactive',
                'interactive' => $interactive(['type' => 'button', 'body' => ['text' => $msg['body']],
                    'action' => ['buttons' => array_map(fn ($b) => ['type' => 'reply', 'reply' => ['id' => $b['id'], 'title' => $b['title']]], $msg['buttons'])]]),
            ],
            'list' => [
                'messaging_product' => 'whatsapp', 'to' => $phone, 'type' => 'interactive',
                'interactive' => $interactive(['type' => 'list', 'body' => ['text' => $msg['body']],
                    'action' => ['button' => $msg['button'], 'sections' => [['title' => 'Pilihan', 'rows' => $msg['rows']]]]]),
            ],
            'image' => ['messaging_product' => 'whatsapp', 'to' => $phone, 'type' => 'image',
                'image' => ['link' => $msg['url'], 'caption' => $msg['body'] ?? '']],
            'document' => ['messaging_product' => 'whatsapp', 'to' => $phone, 'type' => 'document',
                'document' => ['link' => $msg['url'], 'caption' => $msg['body'] ?? '', 'filename' => $msg['filename']]],
            'template' => ['messaging_product' => 'whatsapp', 'to' => $phone, 'type' => 'template', 'template' => $msg['template']],
            default => ['messaging_product' => 'whatsapp', 'to' => $phone, 'type' => 'text', 'text' => ['body' => $msg['body'] ?? '']],
        };
        try {
            $res = Http::timeout(12)->withToken($c['access_token'])
                ->post("https://graph.facebook.com/{$version}/{$c['phone_number_id']}/messages", $payload);
            if ($res->successful()) return [true, null];

            $err = (array) $res->json('error', []);
            $summary = mb_substr(trim('HTTP '.$res->status()
                .(isset($err['code']) ? ' code '.$err['code'] : '')
                .(isset($err['error_subcode']) ? '/'.$err['error_subcode'] : '')
                .': '.($err['error_data']['details'] ?? $err['message'] ?? 'tanpa pesan')), 0, 500);
            Log::warning('Kirim WA Meta gagal', [
                'http_status' => $res->status(), 'type' => $msg['type'] ?? 'text', 'to' => $phone,
                'body' => self::redact(mb_substr($res->body(), 0, 2000), $c['access_token'] ?? ''),
            ]);

            return [false, self::redact($summary, $c['access_token'] ?? '')];
        } catch (\Throwable $e) {
            $summary = mb_substr('Koneksi gagal: '.self::redact($e->getMessage(), $c['access_token'] ?? ''), 0, 500);
            Log::warning('Kirim WA Meta gagal', ['type' => $msg['type'] ?? 'text', 'to' => $phone, 'error' => $summary]);

            return [false, $summary];
        }
    }

    /** Hapus token dari teks apa pun sebelum dicatat. */
    protected static function redact(string $text, string $token): string
    {
        if ($token !== '') $text = str_replace($token, '[token]', $text);

        return preg_replace('/(access_token=|Bearer\s+)[A-Za-z0-9._\-]+/i', '$1[token]', $text) ?? $text;
    }
}
