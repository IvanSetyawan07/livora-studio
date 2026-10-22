<?php

namespace App\Http\Controllers\Api\Shop;

use App\Http\Controllers\Controller;
use App\Models\ShopOrder;
use App\Services\Shop\ShopOrderService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

/**
 * Dua halaman bertoken tanpa login:
 * - Konfirmasi pesanan (detail + setujui penawaran / minta revisi)
 * - Ringkasan pembayaran (rekening + kode unik + instruksi kirim bukti ke WA)
 * Token acak 48 karakter; rate-limited di route.
 */
class TokenPageController extends Controller
{
    public function __construct(protected ShopOrderService $service) {}

    protected function find(string $code, string $token, string $column): ShopOrder
    {
        $order = ShopOrder::where('code', strtoupper($code))->first();
        abort_unless($order && $order->{$column} && hash_equals($order->{$column}, $token), 403, 'Tautan tidak valid.');

        return $order;
    }

    /** GET /api/shop/order/{code}/confirm?token=... */
    public function confirmShow(string $code, Request $request)
    {
        $order = $this->find($code, (string) $request->query('token'), 'confirm_token');
        $order->load('items');
        $expired = $order->quote_expires_at?->isPast();

        return [
            'code' => $order->code,
            'status' => $order->status,
            'status_label' => ShopOrderService::LABELS[$order->status] ?? $order->status,
            'customer_name' => $order->customer_name,
            'shipping' => $order->shipping,
            'shipping_method' => $order->shipping_method,
            'items' => $order->items->map(fn ($i) => $i->only(['title', 'variant_name', 'quantity', 'unit_price', 'unit_discount', 'discount_label'])),
            'quote' => $order->quoteVisible() ? $order->only(ShopOrder::PRICE_FIELDS) : null,
            'quote_version' => $order->quote_version,
            'quote_expires_at' => $order->quote_expires_at,
            'expired' => (bool) $expired,
            'confirmable' => $order->status === 'penawaran' && !$expired,
            'payment_url' => $order->status === 'menunggu_bayar' || $order->paid_at ? $this->service->paymentUrl($order) : null,
        ];
    }

    /** POST /api/shop/order/{code}/confirm — Konfirmasi Pesanan (setujui penawaran, terbitkan Tagihan). */
    public function confirm(string $code, Request $request)
    {
        $order = $this->find($code, (string) $request->input('token'), 'confirm_token');
        $order = $this->service->confirmOrder($order, $request->ip());

        return ['ok' => true, 'payment_url' => $this->service->paymentUrl($order)];
    }

    /** POST /api/shop/order/{code}/revise — Minta Revisi / Nego. */
    public function revise(string $code, Request $request)
    {
        $order = $this->find($code, (string) $request->input('token'), 'confirm_token');
        $data = $request->validate(['note' => 'required|string|max:1000']);
        $this->service->requestRevision($order, $data['note']);

        return ['ok' => true];
    }

    /** GET /api/shop/order/{code}/pay?token=... — ringkasan pembayaran. */
    public function payShow(string $code, Request $request)
    {
        $order = $this->find($code, (string) $request->query('token'), 'payment_token');
        $order->load('items', 'documents');
        $c = config('services.shop');
        $paid = $order->paid_at !== null;
        $invoice = $order->documents->where('title', 'Invoice')->sortByDesc('version')->first();

        return [
            'code' => $order->code,
            'status' => $order->status,
            'paid' => $paid,
            'grand_total' => (int) $order->grand_total,
            'unique_code' => $order->unique_code,
            'transfer_total' => (int) $order->grand_total + (int) ($order->unique_code ?? 0),
            'payment_due_at' => $order->payment_due_at ?? $order->quote_expires_at,
            'bank' => ['name' => $c['bank_name'] ?? 'BCA', 'account' => $c['bank_account'] ?? null, 'holder' => $c['bank_holder'] ?? null],
            'qris' => false, // slot disiapkan, nonaktif: "Segera hadir"
            'wa_number' => \App\Services\Shop\ShopSettings::get('bot_wa_number') ?: ($c['whatsapp_number'] ?? null),
            'invoice_number' => $invoice?->number,
            'invoice_id' => $invoice?->id,
            'items' => $order->items->map(fn ($i) => $i->only(['title', 'variant_name', 'quantity'])),
        ];
    }
    
    public function proformaPdf(string $code, Request $request)
    {
        $order = $this->find($code, (string) $request->query('token'), 'confirm_token');
        $doc = $order->documents()->where('title', 'Tagihan')->whereIn('status', ['belum_dibayar', 'lunas'])->latest('version')->firstOrFail();
        abort_unless($doc->pdf_path && Storage::disk('local')->exists($doc->pdf_path), 404);

        return response()->download(Storage::disk('local')->path($doc->pdf_path), 'Proforma-Invoice-'.$order->code.'.pdf');
    }

    /** GET /api/shop/order/{code}/invoice.pdf?token=... — unduh Invoice setelah lunas. */
    public function invoicePdf(string $code, Request $request)
    {
        $order = $this->find($code, (string) $request->query('token'), 'payment_token');
        abort_unless($order->paid_at, 403, 'Invoice tersedia setelah pembayaran lunas.');
        $doc = $order->documents()->where('title', 'Invoice')->latest('version')->firstOrFail();
        abort_unless($doc->pdf_path && Storage::disk('local')->exists($doc->pdf_path), 404);

        return response()->download(Storage::disk('local')->path($doc->pdf_path), 'Invoice-'.$order->code.'.pdf');
    }
}
