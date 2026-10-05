<?php

namespace App\Services\Shop;

use App\Services\WhatsApp\WhatsAppNotifier;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/** Observabilitas: funnel, log webhook, kirim WA dengan antrean pesan gagal (dead-letter). */
class Ops
{
    public static function funnel(string $event, ?int $orderId = null, ?int $userId = null, array $meta = [], ?string $session = null): void
    {
        try {
            DB::table('funnel_events')->insert([
                'event' => $event, 'order_id' => $orderId, 'user_id' => $userId, 'session_id' => $session,
                'meta' => $meta ? json_encode($meta) : null, 'created_at' => now(),
            ]);
        } catch (\Throwable $e) {
            // analitik tidak boleh menggagalkan alur utama
        }
    }

    public static function webhook(string $source, string $status, ?string $eventId = null, ?array $payload = null, ?string $error = null): void
    {
        try {
            DB::table('webhook_logs')->insert([
                'source' => $source, 'status' => $status, 'event_id' => $eventId, 'error' => $error,
                'payload' => $payload ? json_encode(self::scrub($payload)) : null, 'created_at' => now(),
            ]);
        } catch (\Throwable $e) {
            Log::warning('webhook_logs gagal ditulis', ['error' => $e->getMessage()]);
        }
    }

    /** Kirim WA, catat di wa_messages; kalau gagal masuk wa_failed_messages untuk dicoba ulang. */
    public static function sendWa(?string $phone, string $body, ?int $orderId = null, ?int $sentBy = null): bool
    {
        if (!$phone) return false;
        $res = WhatsAppNotifier::send($phone, $body);
        $ok = in_array($res['status'] ?? '', ['sent', 'queued', 'ok', 'delivered'], true);
        try {
            DB::table('wa_messages')->insert([
                'phone' => WhatsAppNotifier::normalizePhone($phone), 'order_id' => $orderId, 'direction' => 'out', 'type' => 'text',
                'body' => $body, 'sent_by' => $sentBy, 'status' => $res['status'] ?? null, 'created_at' => now(), 'updated_at' => now(),
            ]);
            if (!$ok && ($res['status'] ?? '') !== 'skipped') {
                DB::table('wa_failed_messages')->insert([
                    'phone' => $phone, 'body' => $body, 'order_id' => $orderId, 'error' => $res['error'] ?? 'unknown',
                    'created_at' => now(), 'updated_at' => now(),
                ]);
            }
        } catch (\Throwable $e) {
            Log::warning('Catatan WA gagal', ['error' => $e->getMessage()]);
        }

        return $ok;
    }

    protected static function scrub(array $p): array
    {
        unset($p['signature_key']);

        return $p;
    }
}
