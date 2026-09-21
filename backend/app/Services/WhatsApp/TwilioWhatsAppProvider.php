<?php

namespace App\Services\WhatsApp;

use Illuminate\Support\Facades\Http;

/**
 * Twilio WhatsApp API (https://www.twilio.com/whatsapp).
 *
 * Only ever instantiated when WHATSAPP_PROVIDER=twilio and TWILIO_SID,
 * TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM are all present in config — see
 * WhatsAppNotifier::provider().
 */
class TwilioWhatsAppProvider implements WhatsAppProvider
{
    public function __construct(
        private readonly string $sid,
        private readonly string $authToken,
        private readonly string $from,
    ) {
    }

    public function send(string $phone, string $message): array
    {
        try {
            $to = str_starts_with($phone, 'whatsapp:') ? $phone : 'whatsapp:' . $phone;
            $from = str_starts_with($this->from, 'whatsapp:') ? $this->from : 'whatsapp:' . $this->from;

            $response = Http::timeout(10)->withBasicAuth($this->sid, $this->authToken)
                ->asForm()
                ->post("https://api.twilio.com/2010-04-01/Accounts/{$this->sid}/Messages.json", [
                    'From' => $from,
                    'To'   => $to,
                    'Body' => $message,
                ]);

            if (!$response->successful()) {
                return [
                    'status' => 'failed',
                    'error'  => 'Twilio returned HTTP ' . $response->status() . ': ' . $response->body(),
                ];
            }

            return ['status' => 'sent', 'error' => null];
        } catch (\Throwable $e) {
            return ['status' => 'failed', 'error' => $e->getMessage()];
        }
    }
}