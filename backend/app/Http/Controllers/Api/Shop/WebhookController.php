<?php

namespace App\Http\Controllers\Api\Shop;

use App\Http\Controllers\Controller;
use App\Models\ShopOrder;
use App\Models\ShopPayment;
use App\Services\Shop\MidtransGateway;
use App\Services\Shop\ShopOrderService;
use App\Services\WhatsApp\WhatsAppNotifier;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class WebhookController extends Controller
{
    public function __construct(protected ShopOrderService $service) {}

    /** POST /api/webhooks/midtrans — idempoten, signature diverifikasi. */
    public function midtrans(Request $request)
    {
        $p = $request->all();
        if (!MidtransGateway::validSignature($p)) {
            return response()->json(['message' => 'invalid signature'], 403);
        }
        $payment = ShopPayment::where('gateway_ref', $p['order_id'] ?? '')->first();
        if (!$payment) return response()->json(['ok' => true]);

        $status = $p['transaction_status'] ?? '';
        if (in_array($status, ['settlement', 'capture'], true) && (int) round((float) $p['gross_amount']) === (int) $payment->amount) {
            $this->service->markPaid($payment, 'QRIS', $p['transaction_id'] ?? null);
        } elseif (in_array($status, ['expire', 'cancel', 'deny'], true) && $payment->status === 'pending') {
            $payment->update(['qr_payload' => null, 'qr_url' => null, 'method' => null]); // boleh buat QR baru / transfer
        }

        return response()->json(['ok' => true]);
    }

    /** GET verifikasi webhook Meta. */
    public function whatsappVerify(Request $request)
    {
        $token = config('services.meta_whatsapp_webhook.verify_token');
        if ($token && $request->query('hub_mode') === 'subscribe' && hash_equals($token, (string) $request->query('hub_verify_token'))) {
            return response((string) $request->query('hub_challenge'), 200);
        }

        return response('forbidden', 403);
    }

    /**
     * POST pesan masuk Meta Cloud API. Tahap 2 (tanpa LLM): simpan pesan,
     * cocokkan kode pesanan + nomor, tandai terhubung, kirim tautan form.
     */
    public function whatsappIncoming(Request $request)
    {
        $secret = config('services.meta_whatsapp_webhook.app_secret');
        if ($secret) {
            $sig = 'sha256='.hash_hmac('sha256', $request->getContent(), $secret);
            if (!hash_equals($sig, (string) $request->header('X-Hub-Signature-256'))) {
                return response('invalid signature', 403);
            }
        }

        foreach ($request->input('entry', []) as $entry) {
            foreach ($entry['changes'] ?? [] as $change) {
                foreach ($change['value']['messages'] ?? [] as $m) {
                    try {
                        $this->handleMessage($m);
                    } catch (\Throwable $e) {
                        Log::error('WA webhook gagal', ['error' => $e->getMessage()]);
                    }
                }
            }
        }

        return response()->json(['ok' => true]);
    }

    protected function handleMessage(array $m): void
    {
        if (DB::table('wa_messages')->where('message_id', $m['id'] ?? '')->exists()) return; // idempoten
        $phone = WhatsAppNotifier::normalizePhone($m['from'] ?? '');
        $text = trim($m['text']['body'] ?? $m['button']['text'] ?? '');
        preg_match('/LVR-[A-Z0-9]{6}/i', $text, $match);
        $order = $match
            ? ShopOrder::where('code', strtoupper($match[0]))->first()
            : ShopOrder::where('customer_phone', $phone)->whereNotIn('status', ['selesai', 'dibatalkan', 'kedaluwarsa'])->latest()->first();

        DB::table('wa_messages')->insert([
            'message_id' => $m['id'] ?? null, 'phone' => $phone, 'order_id' => $order?->id, 'direction' => 'in',
            'type' => $m['type'] ?? 'text', 'body' => $text, 'raw' => json_encode($m), 'created_at' => now(), 'updated_at' => now(),
        ]);

        if (strtoupper($text) === 'STOP') {
            \App\Models\User::where('phone', $phone)->update(['wa_opt_out_at' => now(), 'wa_opt_in' => false]);
            ShopOrder::where('customer_phone', $phone)->update(['wa_consent' => false]);
            WhatsAppNotifier::send($phone, 'Baik, Anda tidak akan menerima pesan promosi lagi dari Livora.');
            return;
        }
        if (!$order) {
            WhatsAppNotifier::send($phone, 'Halo, terima kasih sudah menghubungi Livora (asisten otomatis). Mohon sebutkan kode pesanan Anda (contoh: LVR-AB12CD), atau tunggu tim kami membalas di jam kerja.');
            return;
        }
        if ($order->customer_phone && $order->customer_phone !== $phone) {
            WhatsAppNotifier::send($phone, "Nomor ini berbeda dengan nomor di pesanan {$order->code}. Tim kami akan memeriksa dan membalas Anda.");
            return;
        }
        if (in_array($order->status, ['menunggu_wa', 'wa_terhubung'], true)) {
            $this->service->markWaConnected($order);
            \App\Models\User::where('id', $order->user_id)->whereNull('phone_verified_at')->update(['phone_verified_at' => now()]);
            $url = $this->service->sendForm($order);
            WhatsAppNotifier::send($phone, "Halo {$order->customer_name}, saya asisten otomatis Livora. Pesanan {$order->code} sudah kami terima. Silakan lengkapi data pengiriman di: {$url}\nKetik \"TIM\" kapan saja untuk berbicara dengan tim kami.");
        }
    }
}
