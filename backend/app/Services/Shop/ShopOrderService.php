<?php

namespace App\Services\Shop;

use App\Mail\ShopOrderMail;
use App\Models\AuditLog;
use App\Models\CartItem;
use App\Models\Item;
use App\Models\ShopDocument;
use App\Models\ShopOrder;
use App\Models\ShopPayment;
use App\Models\ShopPaymentProof;
use App\Models\StockHold;
use App\Models\User;
use App\Services\WhatsApp\WhatsAppNotifier;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;

/** Semua perpindahan status pesanan furnitur lewat sini (satu sumber aturan). */
class ShopOrderService
{
    public const LABELS = [
        'menunggu_wa' => 'Menunggu chat WhatsApp', 'wa_terhubung' => 'Terhubung di WhatsApp',
        'menunggu_data' => 'Menunggu data pengiriman', 'data_lengkap' => 'Data lengkap',
        'menunggu_review_admin' => 'Ditinjau tim Livora', 'penawaran' => 'Penawaran dikirim',
        'menunggu_bayar' => 'Menunggu pembayaran', 'dibayar' => 'Pembayaran diterima', 'diproses' => 'Diproses',
        'siap_kirim' => 'Siap dikirim', 'dikirim' => 'Dikirim', 'diterima' => 'Diterima', 'selesai' => 'Selesai',
        'dibatalkan' => 'Dibatalkan', 'kedaluwarsa' => 'Kedaluwarsa', 'perlu_tindakan' => 'Perlu tindakan',
    ];

    public function __construct(protected InvoicePdf $pdf) {}

    // ───────────────────────────── Pembuatan ─────────────────────────────

    /** @param array<int> $cartItemIds */
    public function createFromCart(User $user, array $cartItemIds, ?string $note, string $idemKey): ShopOrder
    {
        if ($existing = ShopOrder::where('idempotency_key', $idemKey)->where('user_id', $user->id)->first()) {
            return $existing;
        }
        if (blank($user->phone)) {
            throw ValidationException::withMessages(['phone' => 'phone_required']);
        }

        $lines = CartItem::with(['item', 'variant'])->where('user_id', $user->id)->whereIn('id', $cartItemIds)->get();
        if ($lines->isEmpty()) {
            throw ValidationException::withMessages(['cart' => 'Pilih minimal satu barang.']);
        }
        if ($lines->count() > config('services.shop.max_items_per_order', 10)) {
            throw ValidationException::withMessages(['cart' => 'Maksimal 10 barang per pesanan.']);
        }
        foreach ($lines as $l) {
            if (($l->item->fulfillment_type ?? 'ready_stock') === 'ready_stock') {
                $avail = StockHold::available($l->item);
                if ($avail !== null && $avail < $l->quantity) {
                    throw ValidationException::withMessages(['cart' => "Stok {$l->item->title} tidak mencukupi."]);
                }
            }
        }

        $order = DB::transaction(function () use ($user, $lines, $note, $idemKey) {
            $types = $lines->map(fn ($l) => $l->item->fulfillment_type ?? 'ready_stock')->unique();
            $order = ShopOrder::create([
                'code' => ShopOrder::generateCode(),
                'user_id' => $user->id,
                'status' => 'menunggu_wa',
                'order_type' => $types->count() > 1 ? 'mixed' : $types->first(),
                'source' => 'web',
                'customer_name' => $user->name,
                'customer_phone' => WhatsAppNotifier::normalizePhone($user->phone),
                'customer_email' => $user->email,
                'note' => $note,
                'wa_consent' => true,
                'idempotency_key' => $idemKey,
                'expires_at' => now()->addDays(config('services.shop.order_expire_days', 14)),
            ]);
            foreach ($lines as $l) {
                $this->addLine($order, $l->item, $l->variant_id, $l->variant?->variant_name, $l->quantity, $l->note);
            }
            CartItem::whereIn('id', $lines->pluck('id'))->delete();

            return $order;
        });

        AuditLog::record('order.created', $order, null, ['code' => $order->code, 'source' => 'web']);

        return $order->load('items');
    }

    /** Pesanan manual (walk-in, telepon, Instagram). */
    public function createManual(array $data, User $admin): ShopOrder
    {
        $order = DB::transaction(function () use ($data, $admin) {
            $phone = WhatsAppNotifier::normalizePhone($data['customer_phone']);
            $user = User::where('phone', $phone)->orWhere('phone', $data['customer_phone'])->first();
            $order = ShopOrder::create([
                'code' => ShopOrder::generateCode(),
                'user_id' => $user?->id,
                'status' => 'data_lengkap',
                'source' => 'manual',
                'customer_name' => $data['customer_name'],
                'customer_phone' => $phone,
                'customer_email' => $data['customer_email'] ?? $user?->email,
                'note' => $data['note'] ?? null,
                'shipping' => $data['shipping'] ?? null,
                'wa_consent' => (bool) ($data['wa_consent'] ?? false),
                'created_by' => $admin->id,
            ]);
            foreach ($data['items'] as $row) {
                $item = Item::findOrFail($row['item_id']);
                $this->addLine($order, $item, $row['variant_id'] ?? null, null, (int) $row['quantity'], $row['note'] ?? null);
            }
            $order->order_type = $order->items()->pluck('fulfillment_type')->unique()->count() > 1 ? 'mixed' : $order->items()->value('fulfillment_type');
            $order->save();

            return $order;
        });
        AuditLog::record('order.created_manual', $order, null, ['code' => $order->code]);

        return $order->load('items');
    }

    protected function addLine(ShopOrder $order, Item $item, ?int $variantId, ?string $variantName, int $qty, ?string $note): void
    {
        $price = (int) round((float) $item->price);
        $disc = InvoiceCalculator::unitDiscount($price, $item->discount_type, $item->discount_value);
        if ($variantId && !$variantName) {
            $variantName = \App\Models\FurnitureVariant::find($variantId)?->variant_name;
        }
        $order->items()->create([
            'item_id' => $item->id,
            'variant_id' => $variantId,
            'title' => $item->title,
            'code' => $item->code,
            'variant_name' => $variantName,
            'image' => $item->image,
            'fulfillment_type' => $item->fulfillment_type ?? 'ready_stock',
            'quantity' => max(1, $qty),
            'note' => $note,
            'unit_price' => $price,
            'unit_discount' => $disc,
            'discount_label' => $disc > 0 ? ($item->discount_type === 'percent' ? 'Diskon '.rtrim(rtrim((string) $item->discount_value, '0'), '.').'%' : 'Diskon produk') : null,
        ]);
    }

    // ───────────────────────────── WhatsApp & form ─────────────────────────────

    public function waLink(ShopOrder $order): string
    {
        $order->loadMissing('items');
        $lines = $order->items->map(fn ($i, $n) => ($n + 1).'. '.$i->title.($i->variant_name ? " ({$i->variant_name})" : '')." x{$i->quantity}")->implode("\n");
        $text = "Halo Livora, saya ingin konsultasi & memesan.\nKode pesanan: {$order->code}\n{$lines}";

        return 'https://wa.me/'.config('services.shop.whatsapp_number').'?text='.rawurlencode($text);
    }

    public function markWaConnected(ShopOrder $order): void
    {
        if ($order->status === 'menunggu_wa') {
            $this->setStatus($order, 'wa_terhubung');
        }
    }

    public function formUrl(ShopOrder $order): string
    {
        if (!$order->form_token || $order->form_token_expires_at?->isPast()) {
            $order->issueFormToken();
        }

        return rtrim(config('app.frontend_url', env('FRONTEND_URL', 'https://www.livoralcr.com')), '/')."/order-form/{$order->code}?token={$order->form_token}";
    }

    public function sendForm(ShopOrder $order, bool $notify = true): string
    {
        $url = $this->formUrl($order);
        if (in_array($order->status, ['menunggu_wa', 'wa_terhubung'], true)) {
            $this->setStatus($order, 'menunggu_data');
        }
        if ($notify) $this->notify($order, 'Lengkapi data pengiriman', [
            "Silakan lengkapi data pengiriman pesanan {$order->code} melalui tautan berikut (berlaku 7 hari):",
        ], $url, 'Isi Data Pengiriman', "Lengkapi data pengiriman pesanan {$order->code}: {$url}");

        return $url;
    }

    public function submitForm(ShopOrder $order, array $shipping, ?array $customSpec): void
    {
        DB::transaction(function () use ($order, $shipping, $customSpec) {
            $order->shipping = $shipping;
            $order->custom_spec = $customSpec;
            $order->form_token = null;
            $order->save();
        });
        $this->setStatus($order, 'data_lengkap');
        $order->load('items');

        $delivery = ($shipping['method'] ?? 'delivery') === 'delivery';
        $zoneFee = $delivery ? self::zoneFee($shipping) : 0;

        $needsReview = $order->hasMto()
            || ($delivery && $zoneFee === null)                    // wilayah belum ada di tabel ongkir → admin hitung
            || !empty($shipping['needs_installation'])
            || $this->estimate($order) > (int) ShopSettings::get('review_threshold');

        if ($needsReview) {
            $this->setStatus($order, 'menunggu_review_admin');
        } else {
            $this->sendQuote($order, ['shipping_fee' => (int) $zoneFee, 'installation_fee' => 0, 'other_fee' => 0], true);
        }
    }

    /** Ongkir otomatis dari SHOP_SHIPPING_ZONES (kota dulu, lalu provinsi). null = tidak ada tarif. */
    public static function zoneFee(array $s): ?int
    {
        $zones = array_change_key_case((array) ShopSettings::get('shipping_zones', []), CASE_LOWER);
        foreach ([$s['city'] ?? null, $s['province'] ?? null] as $k) {
            $k = strtolower(trim((string) $k));
            if ($k !== '' && array_key_exists($k, $zones)) return (int) $zones[$k];
        }

        return null;
    }

    protected function estimate(ShopOrder $order): int
    {
        return (int) $order->items->sum(fn ($i) => ($i->unit_price - $i->unit_discount) * $i->quantity);
    }

    // ───────────────────────────── Penawaran ─────────────────────────────

    public function sendQuote(ShopOrder $order, array $fees, bool $automatic = false): ShopOrder
    {
        if (!in_array($order->status, ['data_lengkap', 'menunggu_review_admin', 'penawaran', 'perlu_tindakan', 'kedaluwarsa'], true)) {
            throw ValidationException::withMessages(['status' => 'Penawaran tidak bisa dikirim pada status ini.']);
        }
        $before = $order->only(ShopOrder::PRICE_FIELDS);
        foreach (['shipping_fee', 'installation_fee', 'other_fee'] as $f) {
            if (array_key_exists($f, $fees)) $order->{$f} = max(0, (int) $fees[$f]);
        }
        foreach (['extra_discount_type', 'extra_discount_value', 'extra_discount_reason'] as $f) {
            if (array_key_exists($f, $fees)) $order->{$f} = $fees[$f];
        }
        if (!empty($fees['unit_prices'])) {
            foreach ($order->items as $line) {
                if (isset($fees['unit_prices'][$line->id])) {
                    $line->unit_price = max(0, (int) $fees['unit_prices'][$line->id]);
                    $line->save();
                }
            }
        }
        InvoiceCalculator::apply($order->load('items'));
        $order->quote_version++;
        $order->quote_sent_at = now();
        $order->quote_expires_at = now()->addDays((int) ShopSettings::get('quote_valid_days', 3));
        $order->save();
        // penawaran lama yang belum dibayar dibatalkan
        $this->voidOpenPayments($order);
        $this->setStatus($order, 'penawaran');
        AuditLog::record($automatic ? 'quote.auto_sent' : 'quote.sent', $order, $before, $order->only(ShopOrder::PRICE_FIELDS));

        $this->notify($order, 'Penawaran pesanan Anda', [
            "Penawaran pesanan {$order->code} sudah siap.",
            'Total: '.self::rp($order->grand_total).' (sudah termasuk PPN).',
            'Penawaran berlaku sampai '.$order->quote_expires_at->translatedFormat('d F Y H:i').'.',
        ], $this->orderUrl($order), 'Lihat & Setujui Penawaran',
            "Penawaran {$order->code}: ".self::rp($order->grand_total).". Setujui di: ".$this->orderUrl($order));

        return $order;
    }

    /** Customer menyetujui → tahan stok + terbitkan Tagihan. */
    public function approveQuote(ShopOrder $order): ShopOrder
    {
        if ($order->status !== 'penawaran') {
            throw ValidationException::withMessages(['status' => 'Penawaran ini tidak bisa disetujui.']);
        }
        if ($order->quote_expires_at?->isPast()) {
            $this->setStatus($order, 'kedaluwarsa');
            throw ValidationException::withMessages(['status' => 'Penawaran sudah kedaluwarsa. Hubungi tim Livora untuk penawaran baru.']);
        }

        DB::transaction(function () use ($order) {
            $order->load('items.item');
            foreach ($order->items as $line) {
                if ($line->fulfillment_type !== 'ready_stock' || !$line->item) continue;
                $item = Item::whereKey($line->item_id)->lockForUpdate()->first();
                $avail = StockHold::available($item, $order->id);
                if ($avail !== null && $avail < $line->quantity) {
                    throw ValidationException::withMessages(['stock' => "Maaf, stok {$line->title} baru saja habis. Tim kami akan menawarkan alternatif."]);
                }
            }
            $expires = $order->quote_expires_at ?? now()->addDays(3);
            $order->holds()->where('status', 'held')->update(['status' => 'released']);
            foreach ($order->items as $line) {
                if ($line->fulfillment_type === 'ready_stock' && $line->item_id) {
                    $order->holds()->create(['item_id' => $line->item_id, 'quantity' => $line->quantity, 'status' => 'held', 'expires_at' => $expires]);
                }
            }
            $order->quote_approved_at = now();
            $order->save();

            $payment = $order->payments()->create([
                'amount' => $order->grand_total,
                'status' => 'pending',
                'expires_at' => $expires,
            ]);
            $this->issueDocument($order, $payment, 'Tagihan');
        });

        $this->setStatus($order, 'menunggu_bayar');
        Ops::funnel('penawaran_disetujui', $order->id, $order->user_id);
        AuditLog::record('quote.approved', $order, null, ['grand_total' => $order->grand_total]);
        $this->notify($order, 'Tagihan pesanan Anda', [
            "Terima kasih, penawaran {$order->code} sudah disetujui. Tagihan sebesar ".self::rp($order->grand_total).' telah terbit.',
            'Bayar dengan QRIS atau transfer ke rekening '.config('services.shop.bank_name').' '.(config('services.shop.bank_account') ?: '').' a.n. '.(config('services.shop.bank_holder') ?: '').', cantumkan nomor tagihan pada berita transfer.',
            'Stok kami tahan sampai '.$order->quote_expires_at?->translatedFormat('d F Y H:i').'.',
        ], $this->orderUrl($order), 'Bayar Sekarang',
            "Tagihan {$order->code}: ".self::rp($order->grand_total).". Bayar di: ".$this->orderUrl($order));

        return $order->fresh(['items', 'payments', 'documents']);
    }

    // ───────────────────────────── Pembayaran ─────────────────────────────

    public function openPayment(ShopOrder $order): ?ShopPayment
    {
        return $order->payments()->whereIn('status', ['pending', 'menunggu_verifikasi'])->latest('id')->first();
    }

    public function startQris(ShopPayment $payment, MidtransGateway $gateway): ShopPayment
    {
        if (!MidtransGateway::configured()) {
            throw ValidationException::withMessages(['method' => 'Pembayaran QRIS belum aktif. Silakan transfer BCA.']);
        }
        if ($payment->amount > config('services.shop.qris_max_amount')) {
            throw ValidationException::withMessages(['method' => 'Nominal melebihi batas QRIS. Silakan transfer BCA.']);
        }
        if ($payment->qr_payload && $payment->method === 'qris') return $payment;
        $payment->fill(['method' => 'qris'] + $gateway->createQris($payment))->save();

        return $payment;
    }

    public function submitProof(ShopPayment $payment, string $path, ?int $amount): ShopPaymentProof
    {
        $proof = $payment->proofs()->create(['file_path' => $path, 'amount' => $amount, 'status' => 'menunggu']);
        $payment->update(['method' => 'bca_transfer', 'status' => 'menunggu_verifikasi']);
        AuditLog::record('payment.proof_uploaded', $payment, null, ['proof_id' => $proof->id]);
        $this->notifyAdmins("Bukti transfer baru: {$payment->order->code}", 'Ada bukti transfer yang menunggu verifikasi.');

        return $proof;
    }

    public function reviewProof(ShopPaymentProof $proof, bool $accept, ?string $reason, User $admin): void
    {
        if ($proof->status !== 'menunggu') {
            throw ValidationException::withMessages(['proof' => 'Bukti ini sudah diproses.']);
        }
        $proof->update(['status' => $accept ? 'acc' : 'tolak', 'reason' => $reason, 'verified_by' => $admin->id, 'verified_at' => now()]);
        $payment = $proof->payment;
        AuditLog::record($accept ? 'payment.proof_accepted' : 'payment.proof_rejected', $proof, null, ['reason' => $reason]);

        if ($accept) {
            $payment->verified_by = $admin->id;
            $this->markPaid($payment, 'Transfer BCA');
        } else {
            $payment->update(['status' => 'pending']);
            $order = $payment->order;
            $this->notify($order, 'Bukti transfer perlu diunggah ulang', [
                "Bukti transfer pesanan {$order->code} belum bisa kami verifikasi.", 'Alasan: '.($reason ?: '-'),
            ], $this->orderUrl($order), 'Unggah Ulang Bukti', "Bukti transfer {$order->code} ditolak: {$reason}. Unggah ulang di ".$this->orderUrl($order));
        }
    }

    public function markPaid(ShopPayment $payment, string $methodLabel, ?string $eventId = null): void
    {
        if ($payment->status === 'paid') return; // idempoten
        $order = $payment->order;
        if ($payment->kind === 'change') {
            DB::transaction(function () use ($payment, $methodLabel, $eventId) {
                $payment->status = 'paid';
                $payment->paid_at = now();
                if ($eventId) $payment->webhook_event_id = $eventId;
                $payment->save();
                app(AftercareService::class)->changePaid($payment, $methodLabel);
            });
            AuditLog::record('payment.paid', $payment, null, ['method' => $methodLabel, 'amount' => $payment->amount, 'kind' => 'change']);
            $this->notify($order, 'Pembayaran tambahan diterima', ["Pembayaran tambahan pesanan {$order->code} sebesar ".self::rp($payment->amount).' sudah kami terima.'],
                $this->orderUrl($order), 'Lihat Pesanan', "Pembayaran tambahan {$order->code} ".self::rp($payment->amount).' diterima.');
            return;
        }
        Ops::funnel('dibayar', $order->id, $order->user_id, ['amount' => (int) $payment->amount]);

        DB::transaction(function () use ($payment, $order, $methodLabel, $eventId) {
            $payment->status = 'paid';
            $payment->paid_at = now();
            if ($eventId) $payment->webhook_event_id = $eventId;
            $payment->save();

            $stockOk = true;
            foreach ($order->items()->with('item')->get() as $line) {
                if ($line->fulfillment_type !== 'ready_stock' || !$line->item) continue;
                $hold = $order->holds()->where('item_id', $line->item_id)->where('status', 'held')->first();
                if ($hold && $hold->expires_at && $hold->expires_at->isPast()) {
                    $avail = StockHold::available($line->item, $order->id);
                    if ($avail !== null && $avail < $line->quantity) $stockOk = false;
                }
            }
            if ($stockOk) {
                foreach ($order->holds()->where('status', 'held')->get() as $h) {
                    $h->update(['status' => 'reserved']);
                    Item::whereKey($h->item_id)->whereNotNull('stock')->decrement('stock', $h->quantity);
                    $h->update(['status' => 'released']); // stok sudah dikurangi permanen
                }
            }
            $order->paid_at = now();
            $order->save();

            $tagihan = $order->documents()->where('payment_id', $payment->id)->where('title', 'Tagihan')->latest('version')->first();
            $this->issueDocument($order, $payment, 'Invoice', $tagihan, $methodLabel);
            $order->status = $stockOk ? 'dibayar' : 'perlu_tindakan';
            $order->save();
        });

        AuditLog::record('payment.paid', $payment, null, ['method' => $methodLabel, 'amount' => $payment->amount]);
        $order->refresh();
        $this->notify($order, 'Pembayaran diterima', [
            "Pembayaran pesanan {$order->code} sebesar ".self::rp($payment->amount).' sudah kami terima. Invoice terlampir di halaman pesanan.',
            $order->status === 'perlu_tindakan' ? 'Stok salah satu barang habis saat pembayaran masuk. Tim kami akan menghubungi Anda untuk alternatif atau pengembalian dana.' : 'Kami kabari lagi saat pesanan dikirim.',
        ], $this->orderUrl($order), 'Lihat Invoice', "Pembayaran {$order->code} diterima. Invoice: ".$this->orderUrl($order));
    }

    protected function voidOpenPayments(ShopOrder $order): void
    {
        foreach ($order->payments()->whereIn('status', ['pending', 'menunggu_verifikasi'])->get() as $p) {
            $p->update(['status' => 'void']);
            $order->documents()->where('payment_id', $p->id)->where('status', 'belum_dibayar')->update(['status' => 'batal']);
        }
        $order->holds()->where('status', 'held')->update(['status' => 'released']);
    }

    // ───────────────────────────── Dokumen ─────────────────────────────

    protected function issueDocument(ShopOrder $order, ShopPayment $payment, string $title, ?ShopDocument $from = null, ?string $method = null): ShopDocument
    {
        $order->loadMissing('items');
        $ship = $order->shipping ?? [];
        $snapshot = [
            'order_code' => $order->code,
            'buyer' => [
                'name' => $ship['recipient'] ?? $order->customer_name,
                'company' => $ship['company'] ?? null,
                'npwp' => $ship['npwp'] ?? null,
                'address' => self::formatAddress($ship),
                'phone' => $ship['phone'] ?? $order->customer_phone,
            ],
            'items' => $order->items->map(fn ($i) => $i->only(['title', 'code', 'variant_name', 'quantity', 'unit_price', 'unit_discount', 'discount_label']))->values()->all(),
            'totals' => $order->only(['subtotal', 'product_discount', 'extra_discount', 'dpp', 'ppn', 'shipping_fee', 'installation_fee', 'other_fee', 'grand_total']),
            'due_at' => $payment->expires_at?->translatedFormat('d F Y H:i'),
            'paid_at' => $title === 'Invoice' ? now()->translatedFormat('d F Y') : null,
            'paid_method' => $method,
        ];

        $doc = ShopDocument::create([
            'number' => $from ? $from->number : DocumentNumber::next('INV'),
            'type' => 'INV',
            'title' => $title,
            'status' => $title === 'Invoice' ? 'lunas' : 'belum_dibayar',
            'order_id' => $order->id,
            'payment_id' => $payment->id,
            'snapshot' => $from ? array_merge($from->snapshot, ['paid_at' => $snapshot['paid_at'], 'paid_method' => $method]) : $snapshot,
            'version' => $from ? $from->version + 1 : 1,
            'issued_at' => $from?->issued_at ?? now(),
            'paid_at' => $title === 'Invoice' ? now() : null,
        ]);
        // Satu nomor, dua judul: PDF Tagihan lama diarsipkan, statusnya ikut lunas.
        $from?->update(['status' => 'lunas']);
        try {
            $doc->pdf_path = $this->pdf->render($doc);
            $doc->save();
            $this->pushToSheets($doc);
        } catch (\Throwable $e) {
            Log::error('PDF dokumen gagal dibuat', ['doc' => $doc->id, 'error' => $e->getMessage()]);
        }

        return $doc;
    }

    /** Kirim baris register dokumen ke Google Sheets (Apps Script Web App). Opsional. */
    protected function pushToSheets(ShopDocument $doc): void
    {
        $url = config('services.shop.sheets_webhook_url');
        if (!$url) return;
        try {
            $s = $doc->snapshot;
            \Illuminate\Support\Facades\Http::timeout(8)->post($url, [
                'secret' => config('services.shop.sheets_webhook_secret'),
                'nomor' => $doc->number, 'judul' => $doc->title, 'status' => $doc->status, 'versi' => $doc->version,
                'tanggal' => $doc->issued_at?->toDateString(), 'kode_order' => $s['order_code'] ?? null,
                'customer' => $s['buyer']['name'] ?? null, 'perusahaan' => $s['buyer']['company'] ?? null,
                'item' => collect($s['items'] ?? [])->map(fn ($i) => $i['title'].' x'.$i['quantity'])->implode('; '),
                'dpp' => $s['totals']['dpp'] ?? 0, 'ppn' => $s['totals']['ppn'] ?? 0, 'grand_total' => $s['totals']['grand_total'] ?? 0,
                'dibayar' => $s['paid_at'] ?? null, 'metode' => $s['paid_method'] ?? null,
            ]);
        } catch (\Throwable $e) {
            Log::warning('Sinkron Google Sheets gagal', ['doc' => $doc->id, 'error' => $e->getMessage()]);
        }
    }

    public static function formatAddress(array $s): ?string
    {
        if (($s['method'] ?? null) === 'pickup') return 'Diambil di showroom Livora';
        $parts = array_filter([$s['street'] ?? null, isset($s['rt']) ? 'RT '.$s['rt'].(isset($s['rw']) ? '/RW '.$s['rw'] : '') : null,
            $s['village'] ?? null, $s['district'] ?? null, $s['city'] ?? null, $s['province'] ?? null, $s['postal_code'] ?? null]);

        return $parts ? implode(', ', $parts) : null;
    }

    // ───────────────────────────── Fulfillment ─────────────────────────────

    public function advance(ShopOrder $order, string $to, array $data = []): ShopOrder
    {
        $allowed = [
            'dibayar' => ['diproses'], 'perlu_tindakan' => ['diproses', 'dibatalkan'], 'diproses' => ['siap_kirim'],
            'siap_kirim' => ['dikirim'], 'dikirim' => ['diterima'], 'diterima' => ['selesai'],
        ];
        if (!in_array($to, $allowed[$order->status] ?? [], true)) {
            throw ValidationException::withMessages(['status' => 'Langkah ini tidak bisa dilakukan sekarang.']);
        }
        if ($to === 'siap_kirim') $order->delivery_date = $data['delivery_date'] ?? null;
        if ($to === 'dikirim') {
            $order->courier = $data['courier'] ?? null;
            $order->tracking_number = $data['tracking_number'] ?? null;
            $order->shipped_at = now();
        }
        if ($to === 'diterima') $order->received_at = now();
        $order->save();
        $this->setStatus($order, $to);

        $messages = [
            'diproses' => ['Pesanan sedang diproses', "Pesanan {$order->code} sedang kami siapkan."],
            'siap_kirim' => ['Pesanan siap dikirim', "Pesanan {$order->code} siap dikirim".($order->delivery_date ? ' pada '.$order->delivery_date->translatedFormat('d F Y') : '').'.'],
            'dikirim' => ['Pesanan dikirim', "Pesanan {$order->code} dikirim via ".($order->courier ?: 'kurir').($order->tracking_number ? ", resi {$order->tracking_number}" : '').'.'],
            'diterima' => ['Pesanan diterima', "Pesanan {$order->code} sudah diterima. Terima kasih!"],
            'selesai' => ['Pesanan selesai', "Pesanan {$order->code} selesai. Kami senang bila Anda berkenan memberi ulasan."],
        ];
        if (isset($messages[$to])) {
            [$subject, $line] = $messages[$to];
            $this->notify($order, $subject, [$line], $this->orderUrl($order), 'Lihat Pesanan', $line.' '.$this->orderUrl($order));
        }

        return $order;
    }

    public function cancel(ShopOrder $order, ?string $reason): void
    {
        if (in_array($order->status, ['dibayar', 'diproses', 'siap_kirim', 'dikirim', 'diterima', 'selesai'], true)) {
            throw ValidationException::withMessages(['status' => 'Pesanan yang sudah dibayar dibatalkan lewat pengajuan pengembalian dana ke admin.']);
        }
        $this->voidOpenPayments($order);
        $this->setStatus($order, 'dibatalkan');
        AuditLog::record('order.cancelled', $order, null, ['reason' => $reason]);
    }

    /** Dijalankan terjadwal: penawaran/tagihan/pesanan kedaluwarsa. */
    public function expireStale(): int
    {
        $n = 0;
        foreach (ShopOrder::whereIn('status', ['penawaran', 'menunggu_bayar'])->where('quote_expires_at', '<', now())->get() as $o) {
            if ($o->status === 'menunggu_bayar' && $o->payments()->where('status', 'menunggu_verifikasi')->exists()) continue;
            foreach ($o->payments()->where('status', 'pending')->get() as $p) {
                $p->update(['status' => 'expired']);
                $o->documents()->where('payment_id', $p->id)->where('status', 'belum_dibayar')->update(['status' => 'kedaluwarsa']);
            }
            $o->holds()->where('status', 'held')->update(['status' => 'released']);
            $this->setStatus($o, 'kedaluwarsa');
            $n++;
        }
        $n += ShopOrder::whereIn('status', ['menunggu_wa', 'wa_terhubung', 'menunggu_data'])->where('expires_at', '<', now())->update(['status' => 'kedaluwarsa']);

        return $n;
    }

    // ───────────────────────────── Helper ─────────────────────────────

    public function setStatus(ShopOrder $order, string $status): void
    {
        $from = $order->status;
        $order->status = $status;
        if ($status === 'menunggu_review_admin') $order->sla_due_at = now()->addHours((int) ShopSettings::get('sla_hours', 4));
        $order->save();
        AuditLog::record('order.status', $order, ['status' => $from], ['status' => $status]);
    }

    public function orderUrl(ShopOrder $order): string
    {
        return rtrim(env('FRONTEND_URL', 'https://www.livoralcr.com'), '/')."/profile/orders/{$order->code}";
    }

    public static function rp(int|float|null $v): string
    {
        return 'Rp '.number_format((int) $v, 0, ',', '.');
    }

    /** Email + WhatsApp; kegagalan tidak pernah membatalkan aksi. */
    public function notify(ShopOrder $order, string $subject, array $paragraphs, ?string $ctaUrl, string $ctaLabel, string $waText): void
    {
        if ($order->customer_email) {
            try {
                Mail::to($order->customer_email)->send(new ShopOrderMail($order, $subject, $paragraphs, $ctaUrl, $ctaLabel));
            } catch (\Throwable $e) {
                Log::warning('Email pesanan gagal', ['order' => $order->code, 'error' => $e->getMessage()]);
            }
        }
        if ($order->wa_consent && $order->customer_phone) {
            Ops::sendWa($order->customer_phone, "Livora: ".$waText, $order->id);
        }
    }

    public function notifyAdmins(string $subject, string $line): void
    {
        foreach (User::where('role', 'admin')->where(fn ($q) => $q->whereNull('admin_role')->orWhereIn('admin_role', ['owner', 'cs', 'finance']))->pluck('email') as $email) {
            try {
                Mail::raw($line, fn ($m) => $m->to($email)->subject('[Livora Admin] '.$subject));
            } catch (\Throwable $e) {
                Log::warning('Email admin gagal: '.$e->getMessage());
            }
        }
    }
}
