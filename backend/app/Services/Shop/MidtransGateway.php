<?php

namespace App\Services\Shop;

use App\Models\ShopPayment;
use Illuminate\Support\Facades\Http;

/** QRIS lewat Midtrans Core API. Aktif hanya bila MIDTRANS_SERVER_KEY diisi. */
class MidtransGateway
{
    public static function configured(): bool
    {
        return filled(config('services.midtrans.server_key'));
    }

    protected static function baseUrl(): string
    {
        return config('services.midtrans.is_production') ? 'https://api.midtrans.com' : 'https://api.sandbox.midtrans.com';
    }

    public function createQris(ShopPayment $payment): array
    {
        $orderId = 'LVR-PAY-'.$payment->id.'-'.now()->timestamp;
        $res = Http::withBasicAuth(config('services.midtrans.server_key'), '')
            ->acceptJson()->timeout(20)
            ->post(self::baseUrl().'/v2/charge', [
                'payment_type' => 'qris',
                'transaction_details' => ['order_id' => $orderId, 'gross_amount' => (int) $payment->amount],
                'custom_expiry' => ['expiry_duration' => max(15, (int) now()->diffInMinutes($payment->expires_at ?? now()->addDay())), 'unit' => 'minute'],
            ]);

        if (!$res->successful() || !in_array($res->json('status_code'), ['200', '201'], true)) {
            throw new \RuntimeException('QRIS gagal dibuat: '.($res->json('status_message') ?? $res->status()));
        }

        $qrUrl = collect($res->json('actions', []))->firstWhere('name', 'generate-qr-code')['url'] ?? null;

        return ['gateway_ref' => $orderId, 'qr_payload' => $res->json('qr_string'), 'qr_url' => $qrUrl];
    }

    /** Verifikasi signature_key notifikasi Midtrans. */
    public static function validSignature(array $p): bool
    {
        $expected = hash('sha512', ($p['order_id'] ?? '').($p['status_code'] ?? '').($p['gross_amount'] ?? '').config('services.midtrans.server_key'));

        return isset($p['signature_key']) && hash_equals($expected, $p['signature_key']);
    }
}
