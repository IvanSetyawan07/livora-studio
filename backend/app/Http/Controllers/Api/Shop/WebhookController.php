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
            \App\Services\Shop\Ops::webhook('midtrans', 'rejected', $p['transaction_id'] ?? null, $p, 'invalid signature');
            return response()->json(['message' => 'invalid signature'], 403);
        }
        \App\Services\Shop\Ops::webhook('midtrans', 'ok', $p['transaction_id'] ?? null, $p);
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
                \App\Services\Shop\Ops::webhook('whatsapp', 'rejected', null, null, 'invalid signature');
                return response('invalid signature', 403);
            }
        }

        \App\Services\Shop\Ops::webhook('whatsapp', 'ok', null, ['entries' => count($request->input('entry', []))]);
        foreach ($request->input('entry', []) as $entry) {
            foreach ($entry['changes'] ?? [] as $change) {
                $names = collect($change['value']['contacts'] ?? [])->mapWithKeys(fn ($c) => [(string) ($c['wa_id'] ?? '') => $c['profile']['name'] ?? null])->all();
                foreach ($change['value']['messages'] ?? [] as $m) {
                    $m['_profile_name'] = $names[(string) ($m['from'] ?? '')] ?? null;
                    try {
                        $this->handleMessage($m);
                    } catch (\Throwable $e) {
                        \App\Services\Shop\Ops::webhook('whatsapp', 'error', $m['id'] ?? null, null, $e->getMessage());
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
        $type = $m['type'] ?? 'text';
        $text = trim($m['text']['body'] ?? $m['button']['text'] ?? '');
        // Balasan interaktif: ambil id + judul agar LiviBot mengenali pilihan secara pasti
        $choice = $m['interactive']['button_reply'] ?? $m['interactive']['list_reply'] ?? null;
        if ($type === 'interactive' && is_array($choice)) {
            $text = trim((string) ($choice['title'] ?? ''));
            $m['_reply'] = ['id' => (string) ($choice['id'] ?? ''), 'title' => $text,
                'kind' => isset($m['interactive']['list_reply']) ? 'list' : 'button'];
        } elseif ($type === 'button' && isset($m['button'])) {
            $m['_reply'] = ['id' => (string) ($m['button']['payload'] ?? ''), 'title' => $text, 'kind' => 'template_button'];
        }
        if ($type === 'location') $text = '[lokasi] '.($m['location']['latitude'] ?? '').','.($m['location']['longitude'] ?? '');
        if (in_array($type, ['image', 'document'], true)) $text = '['.$type.'] '.($m[$type]['caption'] ?? '');

        $conv = $this->ensureConversation($phone, $m['_profile_name'] ?? null);
        $orderId = $conv->order_id ?: ($conv->cart_id ? null : ShopOrder::where('customer_phone', $phone)->latest()->value('id'));
        DB::table('wa_messages')->insert([
            'message_id' => $m['id'] ?? null, 'wa_message_id' => $m['id'] ?? null, 'phone' => $phone, 'order_id' => $orderId,
            'conversation_id' => $conv->id, 'direction' => 'in',
            'type' => $type, 'body' => $text, 'raw' => json_encode($m), 'created_at' => now(), 'updated_at' => now(),
        ]);

        // Balasan WhatsApp Flow (form pengiriman di dalam WA)
        if ($type === 'interactive' && ($m['interactive']['type'] ?? '') === 'nfm_reply') {
            $this->handleFlowReply($phone, json_decode($m['interactive']['nfm_reply']['response_json'] ?? '{}', true) ?: []);
            return;
        }

        // Mesin bot baru: Livi (state machine + AI + guardrail)
        $result = app(\App\Services\Shop\LiviBot::class)->handle($phone, $text, $type, $m, false);
        $orderId = DB::table('wa_conversations')->where('id', $conv->id)->value('order_id') ?: $orderId;
        foreach ($result['replies'] as $reply) {
            $msg = is_array($reply) ? $reply : ['type' => 'text', 'body' => (string) $reply];
            \App\Services\Shop\WaSender::send($phone, $msg, $orderId, $conv->id);
        }
    }

    protected function ensureConversation(string $phone, ?string $name): object
    {
        $conv = DB::table('wa_conversations')->where('phone', $phone)->first();
        if ($conv) return $conv;
        DB::table('wa_conversations')->insert([
            'phone' => $phone, 'state' => 'sapaan', 'mode' => 'bot', 'wa_name' => $name ? mb_substr($name, 0, 120) : null,
            'user_id' => \App\Models\User::where('phone', $phone)->value('id'),
            'last_inbound_at' => now(), 'created_at' => now(), 'updated_at' => now(),
        ]);

        return DB::table('wa_conversations')->where('phone', $phone)->first();
    }

    protected function handleFlowReply(string $phone, array $data): void
    {
        [$code, $token] = array_pad(explode('|', (string) ($data['flow_token'] ?? '')), 2, '');
        $order = ShopOrder::where('code', $code)->first();
        if (!$order || !$order->form_token || !hash_equals($order->form_token, $token)) {
            \App\Services\Shop\Ops::sendWa($phone, 'Maaf, form sudah tidak berlaku. Ketik TIM untuk dibantu.');
            return;
        }
        $shipping = array_intersect_key($data, array_flip(['method', 'recipient', 'phone', 'street', 'district', 'city', 'province', 'postal_code', 'landmark', 'building_type', 'floor', 'notes']));
        $shipping['method'] = $shipping['method'] ?? 'delivery';
        $shipping['has_lift'] = filter_var($data['has_lift'] ?? false, FILTER_VALIDATE_BOOLEAN);
        $shipping['needs_installation'] = filter_var($data['needs_installation'] ?? false, FILTER_VALIDATE_BOOLEAN);
        $this->service->submitForm($order, $shipping, null);
        \App\Services\Shop\Ops::sendWa($phone, "Terima kasih, data pengiriman pesanan {$order->code} sudah kami terima.", $order->id);
    }
}
