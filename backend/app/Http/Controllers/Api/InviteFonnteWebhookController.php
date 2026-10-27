<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Invite\InviteService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * Webhook pesan masuk Fonnte (nomor WhatsApp admin). Balasan tamu seperti "hadir kak" / "maaf tidak bisa"
 * dicocokkan ke tamu yang sudah dikirimi undangan lalu dicatat sebagai Hadir/Tidak. Tidak membalas apa pun.
 * URL: POST /api/webhooks/fonnte/{FONNTE_WEBHOOK_SECRET}
 */
class InviteFonnteWebhookController extends Controller
{
    public function handle(Request $request, string $secret)
    {
        $expected = (string) config('services.whatsapp.fonnte.webhook_secret');
        abort_unless($expected !== '' && hash_equals($expected, $secret), 404);

        $d = $request->all();
        if (!$d) $d = json_decode($request->getContent(), true) ?: [];

        $sender = (string) ($d['sender'] ?? '');
        $text = trim((string) ($d['message'] ?? ''));
        // Abaikan pesan grup, pesan kosong, dan pesan dari nomor sendiri.
        if ($sender === '' || $text === '' || str_contains($sender, '@') || !empty($d['member']) || $sender === (string) ($d['device'] ?? '')) {
            return ['ok' => true];
        }

        try {
            InviteService::handleChatReply($sender, $text);
        } catch (\Throwable $e) {
            Log::warning('Webhook Fonnte undangan gagal', ['error' => $e->getMessage()]);
        }

        return ['ok' => true];
    }
}