<?php

namespace App\Http\Controllers\Api\Shop;

use App\Http\Controllers\Controller;
use App\Models\ShopDocument;
use App\Models\ShopOrder;
use App\Services\Shop\MidtransGateway;
use App\Services\Shop\ShopOrderService;
use App\Services\WhatsApp\WhatsAppNotifier;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class OrderController extends Controller
{
    public function __construct(protected ShopOrderService $service) {}

    public function index(Request $request)
    {
        $orders = ShopOrder::with('items')->where('user_id', $request->user()->id)->latest()->get();

        return response()->json($orders->map(fn ($o) => $this->present($o, false))->values());
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'cart_item_ids' => 'required|array|min:1|max:10',
            'cart_item_ids.*' => 'integer',
            'note' => 'nullable|string|max:1000',
            'wa_consent' => 'accepted',
            'phone' => 'nullable|string|max:20',
        ]);
        $user = $request->user();
        if (!empty($data['phone'])) {
            $digits = WhatsAppNotifier::normalizePhone($data['phone']);
            if (!preg_match('/^\d{9,15}$/', $digits)) {
                return response()->json(['message' => 'Nomor WhatsApp tidak valid.', 'code' => 'phone_invalid'], 422);
            }
            $user->phone = $digits;
            $user->wa_opt_in = true;
            $user->save();
        }
        if (blank($user->phone)) {
            return response()->json(['message' => 'Nomor WhatsApp diperlukan untuk memesan.', 'code' => 'phone_required'], 422);
        }
        $key = $request->header('Idempotency-Key') ?: hash('sha256', $user->id.'|'.implode(',', $data['cart_item_ids']).'|'.now()->format('YmdHi'));
        $order = $this->service->createFromCart($user, $data['cart_item_ids'], $data['note'] ?? null, $key);
        \App\Services\Shop\Ops::funnel('order_dibuat', $order->id, $user->id);

        return response()->json(['order' => $this->present($order, true), 'wa_url' => $this->service->waLink($order)], 201);
    }

    public function show(Request $request, string $code)
    {
        $order = $this->owned($request, $code);

        return response()->json($this->present($order->load(['items', 'payments.proofs', 'documents']), true));
    }

    public function waLink(Request $request, string $code)
    {
        return ['wa_url' => $this->service->waLink($this->owned($request, $code))];
    }

    public function approveQuote(Request $request, string $code)
    {
        $order = $this->owned($request, $code)->load('items');
        if ($order->hasMto()) {
            $request->validate(['accept_terms' => 'accepted'], ['accept_terms.accepted' => 'Setujui spesifikasi final dan syarat pesanan custom terlebih dahulu.']);
            $order->spec_approved_at = now();
            $order->save();
        }
        $order = $this->service->approveQuote($order);

        return response()->json($this->present($order, true));
    }

    public function cancel(Request $request, string $code)
    {
        $order = $this->owned($request, $code);
        $this->service->cancel($order, $request->input('reason'));

        return response()->json($this->present($order->fresh('items'), true));
    }

    public function qris(Request $request, string $code, MidtransGateway $gateway)
    {
        $order = $this->owned($request, $code);
        $payment = $this->service->openPayment($order);
        abort_unless($payment, 422, 'Tidak ada tagihan yang menunggu pembayaran.');
        $payment = $this->service->startQris($payment, $gateway);

        return ['qr_url' => $payment->qr_url, 'qr_payload' => $payment->qr_payload, 'amount' => $payment->amount, 'expires_at' => $payment->expires_at];
    }

    public function uploadProof(Request $request, string $code)
    {
        $order = $this->owned($request, $code);
        $request->validate(['proof' => 'required|file|mimes:jpg,jpeg,png,webp,pdf|max:10240', 'amount' => 'nullable|integer|min:0']);
        $payment = $this->service->openPayment($order);
        abort_unless($payment, 422, 'Tidak ada tagihan yang menunggu pembayaran.');
        $path = $request->file('proof')->store('shop-proofs', 'local');
        $this->service->submitProof($payment, $path, $request->integer('amount') ?: null);

        return response()->json($this->present($order->fresh(['items', 'payments.proofs', 'documents']), true));
    }

    public function document(Request $request, string $code, ShopDocument $document)
    {
        $order = $this->owned($request, $code);
        abort_unless($document->order_id === $order->id && $document->pdf_path && Storage::disk('local')->exists($document->pdf_path), 404);

        return Storage::disk('local')->download($document->pdf_path, $document->title.'-'.str_replace('/', '-', $document->number).'.pdf');
    }

    public function requestRefund(Request $request, string $code, \App\Services\Shop\AftercareService $after)
    {
        $order = $this->owned($request, $code)->load('items');
        $d = $request->validate([
            'reason' => 'required|string|max:1000', 'bank_name' => 'required|string|max:60',
            'account_number' => 'required|string|max:30', 'account_holder' => 'required|string|max:120',
        ]);
        $after->requestRefund($order, $request->user(), $d['reason'], $d);

        return $this->show($request, $code);
    }

    public function openClaim(Request $request, string $code, \App\Services\Shop\AftercareService $after)
    {
        $order = $this->owned($request, $code);
        $request->validate([
            'type' => 'required|in:kerusakan,salah_ukuran,garansi,lainnya', 'description' => 'required|string|max:2000',
            'photos' => 'required|array|min:1|max:6', 'photos.*' => 'image|max:10240',
        ]);
        $paths = collect($request->file('photos'))->map(fn ($f) => $f->store('shop-claims', 'local'))->all();
        $after->openClaim($order, $request->user(), $request->input('type'), $request->input('description'), $paths);

        return $this->show($request, $code);
    }

    public function claimPhoto(Request $request, string $code, int $claim, int $index)
    {
        $order = $this->owned($request, $code);
        $row = \Illuminate\Support\Facades\DB::table('shop_claims')->where('order_id', $order->id)->find($claim) ?? abort(404);
        $path = json_decode($row->photos ?? '[]', true)[$index] ?? abort(404);

        return Storage::disk('local')->response($path);
    }

    public function respondChange(Request $request, string $code, int $change, \App\Services\Shop\AftercareService $after)
    {
        $request->validate(['approve' => 'required|boolean']);
        $after->respondChange($this->owned($request, $code), $change, $request->boolean('approve'));

        return $this->show($request, $code);
    }

    protected function owned(Request $request, string $code): ShopOrder
    {
        $order = ShopOrder::where('code', $code)->first();
        // 404 untuk milik orang lain (cegah IDOR & enumerasi)
        abort_unless($order && $order->user_id === $request->user()->id, 404);

        return $order;
    }

    public static function present(ShopOrder $o, bool $detail): array
    {
        $showPrice = $o->quoteVisible();
        $base = [
            'code' => $o->code,
            'status' => $o->status,
            'status_label' => ShopOrderService::LABELS[$o->status] ?? $o->status,
            'order_type' => $o->order_type,
            'source' => $o->source,
            'created_at' => $o->created_at,
            'expires_at' => $o->expires_at,
            'quote_expires_at' => $o->quote_expires_at,
            'items' => $o->items->map(fn ($i) => array_merge(
                $i->only(['id', 'title', 'code', 'variant_name', 'image', 'fulfillment_type', 'quantity', 'note']),
                $showPrice ? ['unit_price' => (int) $i->unit_price, 'unit_discount' => (int) $i->unit_discount, 'discount_label' => $i->discount_label] : []
            ))->values(),
            'grand_total' => $showPrice ? (int) $o->grand_total : null,
        ];
        if (!$detail) return $base;

        return $base + [
            'note' => $o->note,
            'shipping' => $o->shipping,
            'courier' => $o->courier,
            'tracking_number' => $o->tracking_number,
            'delivery_date' => $o->delivery_date,
            'shipped_at' => $o->shipped_at,
            'received_at' => $o->received_at,
            'paid_at' => $o->paid_at,
            'quote' => $showPrice ? $o->only(['subtotal', 'product_discount', 'extra_discount', 'dpp', 'ppn', 'shipping_fee', 'installation_fee', 'other_fee', 'grand_total', 'quote_version', 'quote_sent_at', 'quote_expires_at']) : null,
            'payments' => $o->relationLoaded('payments') ? $o->payments->map(fn ($p) => [
                'id' => $p->id, 'kind' => $p->kind, 'method' => $p->method, 'amount' => (int) $p->amount, 'status' => $p->status,
                'expires_at' => $p->expires_at, 'paid_at' => $p->paid_at, 'qr_url' => $p->qr_url,
                'proofs' => $p->proofs->map(fn ($pr) => $pr->only(['id', 'status', 'reason', 'created_at']))->values(),
            ])->values() : [],
            'documents' => $o->relationLoaded('documents') ? $o->documents->sortByDesc('version')->values()->map(fn ($d) => $d->only(['id', 'number', 'title', 'status', 'version', 'issued_at', 'paid_at']))->values() : [],
            'has_mto' => $o->relationLoaded('items') ? $o->hasMto() : false,
            'spec_approved_at' => $o->spec_approved_at,
            'production_started_at' => $o->production_started_at,
            'custom_spec' => $o->custom_spec,
            'delivery' => ($d = \Illuminate\Support\Facades\DB::table('shop_deliveries')->where('order_id', $o->id)->first()) ? [
                'receiver_name' => $d->receiver_name, 'received_at' => $d->received_at, 'notes' => $d->notes,
            ] : null,
            'claims' => \Illuminate\Support\Facades\DB::table('shop_claims')->where('order_id', $o->id)->latest()->get()
                ->map(fn ($c) => ['id' => $c->id, 'type' => $c->type, 'description' => $c->description, 'status' => $c->status,
                    'resolution' => $c->resolution, 'photo_count' => count(json_decode($c->photos ?? '[]', true)), 'created_at' => $c->created_at]),
            'refunds' => \Illuminate\Support\Facades\DB::table('shop_refunds')->where('order_id', $o->id)->latest()->get()
                ->map(fn ($r) => ['id' => $r->id, 'amount' => (int) $r->amount, 'status' => $r->status, 'reason' => $r->reason, 'admin_note' => $r->admin_note,
                    'bank_name' => $r->bank_name, 'account' => \App\Services\Shop\AftercareService::maskAccount($r->account_number), 'created_at' => $r->created_at]),
            'changes' => \Illuminate\Support\Facades\DB::table('shop_order_changes')->where('order_id', $o->id)->latest()->get()
                ->map(fn ($c) => ['id' => $c->id, 'description' => $c->description, 'price_delta' => (int) $c->price_delta, 'ppn' => (int) $c->ppn,
                    'total' => (int) $c->total, 'status' => $c->status, 'payment_id' => $c->payment_id, 'created_at' => $c->created_at]),
            'warranty_days' => (int) \App\Services\Shop\ShopSettings::get('warranty_days'),
            'return_days' => (int) \App\Services\Shop\ShopSettings::get('return_days'),
            'payment_options' => [
                'qris' => MidtransGateway::configured() && (int) $o->grand_total <= (int) config('services.shop.qris_max_amount'),
                'bank' => [
                    'name' => config('services.shop.bank_name'),
                    'account' => config('services.shop.bank_account'),
                    'holder' => config('services.shop.bank_holder'),
                ],
            ],
        ];
    }
}
