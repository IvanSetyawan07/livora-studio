<?php

namespace App\Services\Shop;

use App\Models\ShopOrder;
use App\Models\ShopPayment;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

/**
 * Pencocokan bukti transfer yang dikirim customer lewat WhatsApp.
 * Gambar dibaca model vision (nominal, tanggal, bank, pengirim, keyakinan),
 * lalu dicocokkan ke pesanan Menunggu bayar milik nomor itu.
 */
class ProofMatcher
{
    /**
     * @return array{outcome: string, replies: array, order_id: ?int}
     */
    public static function handle(string $phone, string $mediaPath, ?string $caption = null): array
    {
        $read = self::readWithVision($mediaPath);

        // Kandidat: pesanan menunggu_bayar milik nomor ini
        $candidates = ShopOrder::where('customer_phone', $phone)
            ->whereIn('status', ['menunggu_bayar', 'menunggu_verifikasi'])->latest()->get();

        $amount = (int) ($read['nominal'] ?? 0);
        $match = $candidates->first(function ($o) use ($amount) {
            return $amount > 0 && abs($amount - ((int) $o->grand_total + (int) ($o->unique_code ?? 0))) <= 1;
        });

        $order = $match ?? ($candidates->count() === 1 ? $candidates->first() : null);

        // Simpan bukti
        $proofId = null;
        if ($order) {
            $payment = ShopPayment::where('order_id', $order->id)->latest()->first()
                ?? ShopPayment::create(['order_id' => $order->id, 'kind' => 'full', 'method' => 'bca_transfer', 'amount' => $order->grand_total, 'status' => 'pending']);
            $proofId = DB::table('shop_payment_proofs')->insertGetId([
                'payment_id' => $payment->id, 'order_id' => $order->id, 'file_path' => $mediaPath,
                'amount' => $amount ?: null, 'ai_read' => json_encode($read), 'source' => 'whatsapp',
                'status' => 'menunggu', 'created_at' => now(), 'updated_at' => now(),
            ]);
        } else {
            DB::table('shop_payment_proofs')->insert([
                'payment_id' => 0, 'file_path' => $mediaPath, 'amount' => $amount ?: null,
                'ai_read' => json_encode($read), 'source' => 'whatsapp', 'status' => 'menunggu',
                'created_at' => now(), 'updated_at' => now(),
            ]);
        }

        // Hasil
        if ($match) {
            $order->update(['status' => 'menunggu_verifikasi']);
            NotifyService::notify('N7', $order->id);
            NotifyService::timeline($order->id, 'payment', 'Bukti transfer diterima via WhatsApp', ['proof_id' => $proofId, 'ai_read' => $read]);

            return ['outcome' => 'matched', 'order_id' => $order->id,
                'replies' => [['type' => 'text', 'body' => "Bukti untuk pesanan {$order->code} sudah kami terima, tim kami cek dulu ya Kak 🙏"]]];
        }

        if ($candidates->count() > 1) {
            $rows = $candidates->map(fn ($o) => ['id' => 'proof_'.$o->code, 'title' => $o->code, 'description' => 'Rp '.number_format((int) $o->grand_total, 0, ',', '.')])->all();

            return ['outcome' => 'ambiguous', 'order_id' => null,
                'replies' => [['type' => 'list', 'body' => 'Bukti ini untuk pesanan yang mana ya Kak?', 'button' => 'Pilih pesanan', 'rows' => $rows]]];
        }

        // Tidak cocok / buram / tidak ada kandidat → N8 mendesak
        $reason = !$order ? 'pesanan tidak jelas' : (($read['keyakinan'] ?? 'rendah') === 'rendah' ? 'gambar buram/terpotong' : 'nominal beda');
        NotifyService::notify('N8', $order?->id, ['reason' => $reason]);

        return ['outcome' => 'unmatched', 'order_id' => $order?->id,
            'replies' => [['type' => 'text', 'body' => 'Saya belum bisa membaca/mencocokkan bukti ini, tim kami bantu cek ya Kak. Mohon ditunggu sebentar.']]];
    }

    /** Baca gambar dengan model vision; gagal → keyakinan rendah. */
    protected static function readWithVision(string $path): array
    {
        try {
            $binary = Storage::disk('local')->get($path);
            $ai = app(\App\Services\LivoraAssistant::class);
            $prompt = 'Baca bukti transfer ini. Jawab JSON saja: {"nominal": int, "tanggal": "...", "bank": "...", "nama_pengirim": "...", "nomor_referensi": "...", "keyakinan": "tinggi|sedang|rendah", "buram": bool}. Jika bukan bukti transfer: {"bukan_bukti": true}.';
            $res = $ai->reply($prompt, [], ['channel' => 'proof_vision', 'image_base64' => base64_encode($binary)]);
            $json = json_decode($res['reply'] ?? '', true);

            return is_array($json) ? $json : ['keyakinan' => 'rendah'];
        } catch (\Throwable $e) {
            Log::warning('Vision bukti gagal', ['error' => $e->getMessage()]);

            return ['keyakinan' => 'rendah'];
        }
    }
}
