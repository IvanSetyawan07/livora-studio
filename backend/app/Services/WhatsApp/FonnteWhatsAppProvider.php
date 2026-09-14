<?php

namespace App\Services\WhatsApp;

use Illuminate\Support\Facades\Http;

/**
 * Fonnte WhatsApp gateway (https://fonnte.com).
 *
 * Only ever instantiated when WHATSAPP_PROVIDER=fonnte and FONNTE_TOKEN is
 * present in config — see WhatsAppNotifier::provider().
 */
class FonnteWhatsAppProvider implements WhatsAppProvider
{
    public function __construct(private readonly string $token)
    {
    }

    public function send(string $phone, string $message): array
    {
        try {
            $response = Http::withHeaders(['Authorization' => $this->token])
                ->asForm()
                ->post('https://api.fonnte.com/send', [
                    'target'  => $phone,
                    'message' => $message,
                ]);

            if (!$response->successful()) {
                return [
                    'status' => 'failed',
                    'error'  => 'Fonnte returned HTTP ' . $response->status() . ': ' . $response->body(),
                ];
            }

            $body = $response->json() ?? [];
            if (($body['status'] ?? null) === false) {
                return [
                    'status' => 'failed',
                    'error'  => 'Fonnte rejected the message: ' . ($body['reason'] ?? 'unknown reason'),
                ];
            }

            return ['status' => 'sent', 'error' => null];
        } catch (\Throwable $e) {
            return ['status' => 'failed', 'error' => $e->getMessage()];
        }
    }
}