<?php

namespace App\Services\WhatsApp;

use Illuminate\Support\Facades\Http;

/**
 * Meta WhatsApp Cloud API
 * (https://developers.facebook.com/docs/whatsapp/cloud-api).
 *
 * Only ever instantiated when WHATSAPP_PROVIDER=meta and
 * META_WHATSAPP_ACCESS_TOKEN, META_WHATSAPP_PHONE_NUMBER_ID are present in
 * config — see WhatsAppNotifier::provider().
 */
class MetaCloudWhatsAppProvider implements WhatsAppProvider
{
    public function __construct(
        private readonly string $accessToken,
        private readonly string $phoneNumberId,
        private readonly string $apiVersion = 'v21.0',
    ) {
    }

    public function send(string $phone, string $message): array
    {
        try {
            $response = Http::withToken($this->accessToken)
                ->post("https://graph.facebook.com/{$this->apiVersion}/{$this->phoneNumberId}/messages", [
                    'messaging_product' => 'whatsapp',
                    'to'                => $phone,
                    'type'              => 'text',
                    'text'              => ['body' => $message],
                ]);

            if (!$response->successful()) {
                return [
                    'status' => 'failed',
                    'error'  => 'Meta Cloud API returned HTTP ' . $response->status() . ': ' . $response->body(),
                ];
            }

            return ['status' => 'sent', 'error' => null];
        } catch (\Throwable $e) {
            return ['status' => 'failed', 'error' => $e->getMessage()];
        }
    }
}