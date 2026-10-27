<?php

namespace App\Services\Shop;

use App\Models\ShopOrder;
use App\Models\ShopPayment;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class ProofMatcher
{
    /** @return array{outcome: string, replies: array, order_id: ?int} */
    public static function handle(string $phone, string $mediaPath, ?string $caption = null): array
    {
        $read = self::read($mediaPath);

        $candidates = ShopOrder::where('customer_phone', $phone)
            ->whereIn('status', ['menunggu_bayar', 'menunggu_verifikasi'])->latest()->get();

        $amount = (int) ($read['nominal'] ?? 0);
        $match = $candidates->first(fn ($o) => $amount > 0 && abs($amount - ((int) $o->grand_total + (int) ($o->unique_code ?? 0))) <= 1);
        $order = $match ?? ($candidates->count() === 1 ? $candidates->first() : null);

        $proofId = null;
        if ($order) {
            $payment = ShopPayment::where('order_id', $order->id)->whereIn('status', ['pending', 'menunggu_verifikasi'])->latest('id')->first()
                ?? ShopPayment::create(['order_id' => $order->id, 'kind' => 'full', 'method' => 'bca_transfer', 'amount' => $order->grand_total, 'status' => 'pending', 'expires_at' => $order->quote_expires_at]);
            $payment->update(['method' => 'bca_transfer', 'status' => 'menunggu_verifikasi']);
        }
        $proofId = DB::table('shop_payment_proofs')->insertGetId([
            'payment_id' => $payment->id ?? null, 'order_id' => $order?->id, 'phone' => $phone, 'file_path' => $mediaPath,
            'amount' => $amount ?: null, 'ai_read' => json_encode($read), 'source' => 'whatsapp',
            'status' => 'menunggu', 'created_at' => now(), 'updated_at' => now(),
        ]);

        if ($order) {
            app(ShopOrderService::class)->setStatus($order, 'menunggu_verifikasi');
            NotifyService::timeline($order->id, 'payment', 'Bukti transfer diterima via WhatsApp', ['proof_id' => $proofId, 'ai_read' => $read]);
        }

        if ($match) {
            NotifyService::notify('N7', $order->id, [], 'p'.$proofId);

            return ['outcome' => 'matched', 'order_id' => $order->id,
                'replies' => [['type' => 'text', 'body' => "Bukti untuk pesanan {$order->code} sudah kami terima, tim kami cek dulu ya Bapak/Ibu 🙏"]]];
        }

        if (!$order && $candidates->count() > 1) {
            $rows = $candidates->map(fn ($o) => ['id' => 'proof_'.$o->code, 'title' => $o->code, 'description' => ShopOrderService::rp($o->grand_total)])->all();
            NotifyService::notify('N8', null, ['reason' => 'bukti masuk dari '.$phone.' dan pesanan belum jelas'], 'p'.$proofId);

            return ['outcome' => 'ambiguous', 'order_id' => null,
                'replies' => [['type' => 'list', 'body' => 'Bukti ini untuk pesanan yang mana ya Bapak/Ibu?', 'button' => 'Pilih pesanan', 'rows' => $rows]]];
        }

        $reason = !$order ? 'pesanan tidak jelas' : (($read['keyakinan'] ?? 'rendah') === 'rendah' ? 'gambar buram/terpotong' : 'nominal beda');
        NotifyService::notify('N8', $order?->id, ['reason' => $reason], 'p'.$proofId);

        return ['outcome' => 'unmatched', 'order_id' => $order?->id,
            'replies' => [['type' => 'text', 'body' => 'Bukti sudah kami terima Bapak/Ibu, tapi saya belum bisa mencocokkannya otomatis. Tim kami bantu cek ya, mohon ditunggu sebentar 🙏']]];
    }

    protected static function read(string $path): array
    {
        try {
            return LiviLlm::readProof(Storage::disk('local')->get($path));
        } catch (\Throwable $e) {
            return ['keyakinan' => 'rendah'];
        }
    }
}