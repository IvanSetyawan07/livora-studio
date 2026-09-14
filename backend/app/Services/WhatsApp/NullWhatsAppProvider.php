<?php

namespace App\Services\WhatsApp;

use Illuminate\Support\Facades\Log;

/**
 * Used whenever no real WhatsApp provider is configured.
 *
 * This deliberately never reports "sent" — a WhatsApp delivery cannot be
 * faked. It logs the missing configuration and returns "failed" with an
 * explanation so callers/admins are never misled into thinking a real
 * message went out.
 */
class NullWhatsAppProvider implements WhatsAppProvider
{
    public function send(string $phone, string $message): array
    {
        $error = 'WhatsApp provider is not configured. Set WHATSAPP_PROVIDER '
            . '(fonnte, twilio or meta) plus its credentials in .env to enable real sending.';

        Log::warning('WhatsAppNotifier: ' . $error, ['phone' => $phone]);

        return ['status' => 'failed', 'error' => $error];
    }
}