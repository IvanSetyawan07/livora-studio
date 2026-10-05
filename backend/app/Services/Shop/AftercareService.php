<?php

namespace App\Services\Shop;

use App\Models\AuditLog;
use App\Models\ShopDocument;
use App\Models\ShopOrder;
use App\Models\ShopPayment;
use App\Models\User;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

/**
 * Tahap 3: produksi MTO, pengiriman + BAST, klaim/garansi, refund, change order.
 */
class AftercareService
{
    public function __construct(protected ShopOrderService $orders, protected InvoicePdf $pdf) {}

    protected function fail(string $msg): never
    {
        throw ValidationException::withMessages(['status' => $msg]);
    }

    // ───────────── Produksi MTO ─────────────

    public function startProduction(ShopOrder $order, User $admin): void
    {
        if (!in_array($order->status, ['dibayar', 'perlu_tindakan', 'diproses'], true)) $this->fail('Produksi hanya bisa dimulai setelah pesanan lunas.');
        if ($order->production_started_at) return;
        $order->production_started_at = now();
        $order->save();
        if ($order->status !== 'diproses') $this->orders->advance($order, 'diproses');
        AuditLog::record('production.started', $order, null, ['by' => $admin->id]);
    }

    // ───────────── Pengiriman & BAST ─────────────

    public function delivery(ShopOrder $order)
    {
        return DB::table('shop_deliveries')->where('order_id', $order->id)->latest('id')->first();
    }

    public function saveBast(ShopOrder $order, array $photos, ?string $signaturePath, string $receiver, ?string $notes): void
    {
        if (!in_array($order->status, ['dikirim', 'siap_kirim'], true)) $this->fail('BAST diunggah saat pesanan dikirim.');
        if (!$photos) $this->fail('Minimal satu foto serah terima.');
        if ($order->status === 'siap_kirim') $this->orders->advance($order, 'dikirim', ['courier' => $order->courier, 'tracking_number' => $order->tracking_number]);

        DB::table('shop_deliveries')->updateOrInsert(['order_id' => $order->id], [
            'scheduled_date' => $order->delivery_date, 'courier' => $order->courier, 'tracking_number' => $order->tracking_number,
            'bast_photos' => json_encode($photos), 'bast_signature_path' => $signaturePath, 'receiver_name' => $receiver,
            'received_at' => now(), 'notes' => $notes, 'updated_at' => now(), 'created_at' => now(),
        ]);
        AuditLog::record('delivery.bast', $order, null, ['receiver' => $receiver, 'photos' => count($photos)]);
        $this->orders->advance($order->fresh(), 'diterima');
    }

    // ───────────── Klaim / garansi ─────────────

    public function openClaim(ShopOrder $order, User $user, string $type, string $description, array $photos): int
    {
        if (!in_array($order->status, ['diterima', 'selesai'], true) || !$order->received_at) $this->fail('Klaim bisa diajukan setelah pesanan diterima.');
        $days = (int) $order->received_at->diffInDays(now());
        $limit = $type === 'garansi' ? (int) ShopSettings::get('warranty_days') : (int) ShopSettings::get('return_days');
        if ($days > $limit) $this->fail($type === 'garansi' ? "Masa garansi {$limit} hari sudah lewat." : "Klaim kerusakan/salah ukuran maksimal {$limit} hari setelah barang diterima. Pilih jenis Garansi bila masih dalam masa garansi.");
        if (DB::table('shop_claims')->where('order_id', $order->id)->whereIn('status', ['diajukan', 'ditinjau'])->exists()) $this->fail('Masih ada klaim yang sedang diproses untuk pesanan ini.');

        $id = DB::table('shop_claims')->insertGetId([
            'order_id' => $order->id, 'user_id' => $user->id, 'type' => $type, 'description' => $description,
            'photos' => json_encode($photos), 'status' => 'diajukan', 'created_at' => now(), 'updated_at' => now(),
        ]);
        AuditLog::record('claim.opened', $order, null, ['claim_id' => $id, 'type' => $type]);
        $this->orders->notifyAdmins("Klaim baru {$order->code}", "Pelanggan mengajukan klaim ({$type}) untuk pesanan {$order->code}.");

        return $id;
    }

    public function updateClaim(int $claimId, string $status, ?string $resolution, User $admin): void
    {
        $claim = DB::table('shop_claims')->find($claimId) ?? abort(404);
        if (in_array($claim->status, ['ditolak', 'selesai'], true)) $this->fail('Klaim ini sudah ditutup.');
        if (in_array($status, ['ditolak', 'disetujui', 'selesai'], true) && blank($resolution)) $this->fail('Tuliskan keputusan/penyelesaian untuk pelanggan.');
        DB::table('shop_claims')->where('id', $claimId)->update(['status' => $status, 'resolution' => $resolution, 'handled_by' => $admin->id, 'updated_at' => now()]);
        $order = ShopOrder::find($claim->order_id);
        AuditLog::record('claim.'.$status, $order, ['status' => $claim->status], ['status' => $status, 'resolution' => $resolution]);
        $label = ['ditinjau' => 'sedang ditinjau', 'disetujui' => 'disetujui', 'ditolak' => 'tidak dapat disetujui', 'selesai' => 'selesai'][$status] ?? $status;
        $this->orders->notify($order, "Klaim pesanan {$order->code} {$label}", array_filter(["Klaim Anda untuk pesanan {$order->code} {$label}.", $resolution]),
            $this->orders->orderUrl($order), 'Lihat Klaim', "Klaim {$order->code} {$label}. ".($resolution ?? ''));
    }

    // ───────────── Refund / pembatalan setelah bayar ─────────────

    public function requestRefund(ShopOrder $order, ?User $user, string $reason, array $bank, ?int $amount = null): int
    {
        if (!$order->paid_at) $this->fail('Pesanan belum dibayar. Batalkan langsung tanpa pengembalian dana.');
        if ($order->hasMto() && $order->production_started_at) $this->fail('Sesuai syarat yang disetujui, pesanan custom tidak bisa dibatalkan atau dikembalikan dananya setelah produksi dimulai.');
        if (in_array($order->status, ['dikirim', 'diterima', 'selesai'], true) && !$user?->role === 'admin') $this->fail('Pesanan yang sudah dikirim diproses lewat klaim.');
        if (DB::table('shop_refunds')->where('order_id', $order->id)->whereIn('status', ['diajukan', 'disetujui', 'dikirim'])->exists()) $this->fail('Pengajuan pengembalian dana sudah ada.');

        $paid = (int) $order->payments()->where('status', 'paid')->sum('amount');
        $id = DB::table('shop_refunds')->insertGetId([
            'order_id' => $order->id,
            'payment_id' => $order->payments()->where('status', 'paid')->latest('id')->value('id'),
            'amount' => min($amount ?? $paid, $paid), 'reason' => $reason, 'status' => 'diajukan',
            'bank_name' => $bank['bank_name'] ?? null,
            'account_number' => !empty($bank['account_number']) ? Crypt::encryptString($bank['account_number']) : null,
            'account_holder' => $bank['account_holder'] ?? null,
            'requested_by' => $user?->id, 'created_at' => now(), 'updated_at' => now(),
        ]);
        AuditLog::record('refund.requested', $order, null, ['refund_id' => $id, 'reason' => $reason]);
        $this->orders->notifyAdmins("Pengajuan refund {$order->code}", "Pengajuan pengembalian dana untuk {$order->code}: {$reason}");

        return $id;
    }

    public function updateRefund(int $refundId, string $action, User $admin, array $data = []): void
    {
        $r = DB::table('shop_refunds')->find($refundId) ?? abort(404);
        $next = ['setujui' => ['diajukan', 'disetujui'], 'tolak' => ['diajukan', 'ditolak'], 'kirim' => ['disetujui', 'dikirim'], 'selesai' => ['dikirim', 'selesai']][$action] ?? null;
        if (!$next || $r->status !== $next[0]) $this->fail('Langkah refund tidak valid.');
        $order = ShopOrder::find($r->order_id);

        $upd = ['status' => $next[1], 'updated_at' => now(), 'admin_note' => $data['note'] ?? $r->admin_note];
        if ($action === 'setujui') {
            $upd += ['approved_by' => $admin->id, 'approved_at' => now()];
            if (isset($data['amount'])) $upd['amount'] = (int) $data['amount'];
        }
        if ($action === 'kirim') {
            $upd += ['sent_at' => now(), 'transfer_proof_path' => $data['proof_path'] ?? null];
        }
        DB::table('shop_refunds')->where('id', $refundId)->update($upd);
        AuditLog::record('refund.'.$next[1], $order, ['status' => $r->status], ['status' => $next[1], 'amount' => $upd['amount'] ?? $r->amount]);

        if ($action === 'setujui' && !in_array($order->status, ['dibatalkan'], true)) {
            $order->holds()->where('status', 'held')->update(['status' => 'released']);
            $order->status = 'dibatalkan';
            $order->save();
            AuditLog::record('order.status', $order, null, ['status' => 'dibatalkan', 'via' => 'refund']);
        }
        $amount = ShopOrderService::rp($upd['amount'] ?? $r->amount);
        $msg = [
            'disetujui' => "Pengajuan pengembalian dana {$order->code} sebesar {$amount} disetujui. Dana akan ditransfer ke rekening Anda.",
            'ditolak' => "Pengajuan pengembalian dana {$order->code} belum dapat disetujui. ".($data['note'] ?? ''),
            'dikirim' => "Pengembalian dana {$order->code} sebesar {$amount} sudah ditransfer.",
            'selesai' => "Pengembalian dana {$order->code} selesai.",
        ][$next[1]];
        $this->orders->notify($order, 'Pengembalian dana '.$order->code, [$msg], $this->orders->orderUrl($order), 'Lihat Pesanan', $msg);
    }

    public static function maskAccount(?string $enc): ?string
    {
        if (!$enc) return null;
        try {
            $n = Crypt::decryptString($enc);
        } catch (\Throwable) {
            return '••••';
        }

        return str_repeat('•', max(0, strlen($n) - 4)).substr($n, -4);
    }

    public static function revealAccount(?string $enc): ?string
    {
        try {
            return $enc ? Crypt::decryptString($enc) : null;
        } catch (\Throwable) {
            return null;
        }
    }

    // ───────────── Change order ─────────────

    public function createChange(ShopOrder $order, string $description, int $priceDelta, User $admin): int
    {
        if (!in_array($order->status, ['dibayar', 'diproses', 'perlu_tindakan'], true)) $this->fail('Change order dibuat setelah lunas dan sebelum dikirim.');
        if ($priceDelta < 0) $this->fail('Selisih negatif diproses sebagai refund sebagian.');
        if (DB::table('shop_order_changes')->where('order_id', $order->id)->whereIn('status', ['dikirim', 'disetujui'])->exists()) $this->fail('Masih ada change order yang belum selesai.');
        $ppn = (int) round($priceDelta * (float) config('services.shop.ppn_rate', 0.11));
        $id = DB::table('shop_order_changes')->insertGetId([
            'order_id' => $order->id, 'description' => $description, 'price_delta' => $priceDelta, 'ppn' => $ppn,
            'total' => $priceDelta + $ppn, 'status' => 'dikirim', 'created_by' => $admin->id, 'created_at' => now(), 'updated_at' => now(),
        ]);
        $order->spec_revised = true;
        $order->save();
        AuditLog::record('change.created', $order, null, ['change_id' => $id, 'delta' => $priceDelta]);
        $this->orders->notify($order, "Perubahan pesanan {$order->code}", [
            "Ada usulan perubahan untuk pesanan {$order->code}: {$description}",
            'Biaya tambahan: '.ShopOrderService::rp($priceDelta + $ppn).' (termasuk PPN). Mohon setujui atau tolak di halaman pesanan.',
        ], $this->orders->orderUrl($order), 'Tinjau Perubahan', "Perubahan {$order->code}: {$description}. Tambahan ".ShopOrderService::rp($priceDelta + $ppn).'. Tinjau di '.$this->orders->orderUrl($order));

        return $id;
    }

    public function respondChange(ShopOrder $order, int $changeId, bool $approve): void
    {
        $c = DB::table('shop_order_changes')->where('order_id', $order->id)->find($changeId) ?? abort(404);
        if ($c->status !== 'dikirim') $this->fail('Perubahan ini sudah ditanggapi.');
        if (!$approve) {
            DB::table('shop_order_changes')->where('id', $c->id)->update(['status' => 'ditolak', 'responded_at' => now(), 'updated_at' => now()]);
            AuditLog::record('change.rejected', $order, null, ['change_id' => $c->id]);
            $this->orders->notifyAdmins("Change order ditolak {$order->code}", "Pelanggan menolak perubahan: {$c->description}");
            return;
        }
        DB::transaction(function () use ($order, $c) {
            $status = 'disetujui';
            $paymentId = null;
            if ($c->total > 0) {
                $payment = $order->payments()->create(['kind' => 'change', 'amount' => $c->total, 'status' => 'pending', 'expires_at' => now()->addDays(3)]);
                $paymentId = $payment->id;
                $this->issueChangeDocument($order, $payment, $c, 'Tagihan Tambahan');
            } else {
                $status = 'dibayar';
            }
            DB::table('shop_order_changes')->where('id', $c->id)->update(['status' => $status, 'payment_id' => $paymentId, 'responded_at' => now(), 'updated_at' => now()]);
        });
        AuditLog::record('change.approved', $order, null, ['change_id' => $c->id]);
        $this->orders->notifyAdmins("Change order disetujui {$order->code}", "Pelanggan menyetujui perubahan: {$c->description}");
    }

    /** Dipanggil dari markPaid untuk pembayaran kind=change. */
    public function changePaid(ShopPayment $payment, string $method): void
    {
        $order = $payment->order;
        $tagihan = $order->documents()->where('payment_id', $payment->id)->latest('version')->first();
        $c = DB::table('shop_order_changes')->where('payment_id', $payment->id)->first();
        if ($c) {
            DB::table('shop_order_changes')->where('id', $c->id)->update(['status' => 'dibayar', 'updated_at' => now()]);
            $this->issueChangeDocument($order, $payment, $c, 'Invoice Tambahan', $tagihan, $method);
        }
        $tagihan?->update(['status' => 'lunas']);
    }

    protected function issueChangeDocument(ShopOrder $order, ShopPayment $payment, object $c, string $title, ?ShopDocument $from = null, ?string $method = null): ShopDocument
    {
        $original = $order->documents()->where('title', 'Invoice')->latest('version')->value('number')
            ?? $order->documents()->latest('id')->value('number');
        $ship = $order->shipping ?? [];
        $snapshot = $from ? array_merge($from->snapshot, ['paid_at' => now()->translatedFormat('d F Y'), 'paid_method' => $method]) : [
            'order_code' => $order->code,
            'reference' => $original,
            'buyer' => [
                'name' => $ship['recipient'] ?? $order->customer_name, 'company' => $ship['company'] ?? null, 'npwp' => $ship['npwp'] ?? null,
                'address' => ShopOrderService::formatAddress($ship), 'phone' => $ship['phone'] ?? $order->customer_phone,
            ],
            'items' => [['title' => 'Perubahan pesanan (ref. '.$original.'): '.$c->description, 'code' => null, 'variant_name' => null,
                'quantity' => 1, 'unit_price' => (int) $c->price_delta, 'unit_discount' => 0, 'discount_label' => null]],
            'totals' => ['subtotal' => (int) $c->price_delta, 'product_discount' => 0, 'extra_discount' => 0, 'dpp' => (int) $c->price_delta,
                'ppn' => (int) $c->ppn, 'shipping_fee' => 0, 'installation_fee' => 0, 'other_fee' => 0, 'grand_total' => (int) $c->total],
            'due_at' => $payment->expires_at?->translatedFormat('d F Y H:i'),
            'paid_at' => null, 'paid_method' => null,
        ];
        $doc = ShopDocument::create([
            'number' => $from ? $from->number : DocumentNumber::next('INV'),
            'type' => 'INV', 'title' => $title, 'status' => $from ? 'lunas' : 'belum_dibayar',
            'order_id' => $order->id, 'payment_id' => $payment->id, 'snapshot' => $snapshot,
            'version' => $from ? $from->version + 1 : 1, 'issued_at' => $from?->issued_at ?? now(), 'paid_at' => $from ? now() : null,
        ]);
        try {
            $doc->pdf_path = $this->pdf->render($doc);
            $doc->save();
        } catch (\Throwable $e) {
            Log::error('PDF tambahan gagal', ['doc' => $doc->id, 'error' => $e->getMessage()]);
        }

        return $doc;
    }

    // ───────────── Retensi data (UU PDP) ─────────────

    public function purgeOldData(): array
    {
        $days = (int) ShopSettings::get('retention_days', 730);
        $cut = now()->subDays($days);
        $msgs = DB::table('wa_messages')->where('created_at', '<', $cut)->delete();
        $accounts = DB::table('shop_refunds')->where('status', 'selesai')->where('updated_at', '<', now()->subDays(90))
            ->whereNotNull('account_number')->update(['account_number' => null]);
        $logs = DB::table('webhook_logs')->where('created_at', '<', now()->subDays(90))->delete();

        return compact('msgs', 'accounts', 'logs');
    }
}
