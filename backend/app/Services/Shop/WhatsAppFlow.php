<?php

namespace App\Services\Shop;

use App\Models\ShopOrder;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/** WhatsApp Flows: form pengiriman di dalam WhatsApp (opsional, butuh Flow ID dari Meta). */
class WhatsAppFlow
{
    public static function configured(): bool
    {
        return filled(config('services.shop.wa_flow_id')) && filled(env('META_WHATSAPP_ACCESS_TOKEN')) && filled(env('META_WHATSAPP_PHONE_NUMBER_ID'));
    }

    public static function sendShippingForm(ShopOrder $order): bool
    {
        try {
            $res = Http::withToken(env('META_WHATSAPP_ACCESS_TOKEN'))->timeout(15)
                ->post('https://graph.facebook.com/v21.0/'.env('META_WHATSAPP_PHONE_NUMBER_ID').'/messages', [
                    'messaging_product' => 'whatsapp', 'to' => $order->customer_phone, 'type' => 'interactive',
                    'interactive' => [
                        'type' => 'flow',
                        'body' => ['text' => "Halo {$order->customer_name}, pesanan {$order->code} sudah kami terima. Isi data pengiriman langsung di WhatsApp:"],
                        'action' => ['name' => 'flow', 'parameters' => [
                            'flow_message_version' => '3', 'flow_token' => $order->code.'|'.$order->form_token,
                            'flow_id' => config('services.shop.wa_flow_id'), 'flow_cta' => 'Isi data pengiriman', 'flow_action' => 'navigate',
                            'flow_action_payload' => ['screen' => 'SHIPPING'],
                        ]],
                    ],
                ]);

            return $res->successful();
        } catch (\Throwable $e) {
            Log::warning('WA Flow gagal', ['error' => $e->getMessage()]);
            return false;
        }
    }
}
