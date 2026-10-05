<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Item;
use App\Models\ShopDocument;
use App\Models\ShopOrder;
use App\Models\ShopPaymentProof;
use App\Models\User;
use App\Services\Shop\InvoiceCalculator;
use App\Services\Shop\ShopOrderService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class ShopOrderController extends Controller
{
    public function __construct(protected ShopOrderService $service) {}

    protected function role(Request $r): string
    {
        return $r->user()->admin_role ?: 'owner';
    }

    /** Ringkasan untuk halaman "Pekerjaan hari ini". */
    public function summary()
    {
        $count = fn ($s) => ShopOrder::whereIn('status', (array) $s)->count();

        return [
            'menunggu_wa' => $count(['menunggu_wa', 'wa_terhubung']),
            'menunggu_data' => $count('menunggu_data'),
            'review' => $count(['data_lengkap', 'menunggu_review_admin']),
            'penawaran' => $count('penawaran'),
            'menunggu_bayar' => $count('menunggu_bayar'),
            'verifikasi' => ShopPaymentProof::where('status', 'menunggu')->count(),
            'perlu_tindakan' => $count('perlu_tindakan'),
            'fulfillment' => $count(['dibayar', 'diproses', 'siap_kirim', 'dikirim']),
        ];
    }

    public function index(Request $request)
    {
        $q = ShopOrder::with('items')->latest();
        if ($s = $request->query('status')) $q->whereIn('status', explode(',', $s));
        if ($term = trim((string) $request->query('q'))) {
            $q->where(fn ($w) => $w->where('code', 'like', "%$term%")->orWhere('customer_name', 'like', "%$term%")->orWhere('customer_phone', 'like', "%$term%"));
        }

        return $q->paginate(30)->through(fn ($o) => $this->present($o, $request));
    }

    public function show(Request $request, string $code)
    {
        $order = ShopOrder::with(['items', 'payments.proofs.verifier', 'documents', 'holds', 'user:id,name,email,phone'])->where('code', $code)->firstOrFail();
        $data = $this->present($order, $request, true);
        $data['audit'] = AuditLog::with('user:id,name')->where('object_type', 'ShopOrder')->where('object_id', $order->id)->latest('created_at')->limit(50)->get();
        $data['wa_messages'] = DB::table('wa_messages')->where('order_id', $order->id)->latest()->limit(50)->get();

        return $data;
    }

    public function sendForm(string $code)
    {
        $order = ShopOrder::where('code', $code)->firstOrFail();

        return ['form_url' => $this->service->sendForm($order)];
    }

    public function markWaConnected(string $code)
    {
        $order = ShopOrder::where('code', $code)->firstOrFail();
        $this->service->markWaConnected($order);

        return ['ok' => true];
    }

    public function previewQuote(Request $request, string $code)
    {
        $order = ShopOrder::with('items')->where('code', $code)->firstOrFail();
        $clone = $order->replicate();
        $clone->setRelation('items', $order->items->map(function ($i) use ($request) {
            $c = clone $i;
            if (isset($request->input('unit_prices', [])[$i->id])) $c->unit_price = (int) $request->input('unit_prices')[$i->id];
            return $c;
        }));
        foreach (['shipping_fee', 'installation_fee', 'other_fee', 'extra_discount_type', 'extra_discount_value'] as $f) {
            if ($request->has($f)) $clone->{$f} = $request->input($f);
        }
        InvoiceCalculator::apply($clone);

        return $clone->only(['subtotal', 'product_discount', 'extra_discount', 'dpp', 'ppn', 'shipping_fee', 'installation_fee', 'other_fee', 'grand_total']);
    }

    public function sendQuote(Request $request, string $code)
    {
        $data = $request->validate([
            'shipping_fee' => 'nullable|integer|min:0', 'installation_fee' => 'nullable|integer|min:0', 'other_fee' => 'nullable|integer|min:0',
            'unit_prices' => 'nullable|array', 'unit_prices.*' => 'integer|min:0',
            'extra_discount_type' => 'nullable|in:percent,amount', 'extra_discount_value' => 'nullable|numeric|min:0',
            'extra_discount_reason' => 'nullable|string|max:255',
        ]);
        $role = $this->role($request);
        if (!empty($data['extra_discount_value']) && !in_array($role, ['owner', 'finance'], true)) {
            return response()->json(['message' => 'Hanya Owner atau Keuangan yang boleh memberi diskon tambahan.'], 403);
        }
        if (!empty($data['extra_discount_value']) && blank($data['extra_discount_reason'] ?? null)) {
            return response()->json(['message' => 'Alasan diskon wajib diisi.'], 422);
        }
        $order = ShopOrder::with('items')->where('code', $code)->firstOrFail();
        $this->service->sendQuote($order, $data);

        return $this->show($request, $code);
    }

    public function reviewProof(Request $request, ShopPaymentProof $proof)
    {
        $data = $request->validate(['accept' => 'required|boolean', 'reason' => 'required_if:accept,false|nullable|string|max:255']);
        $this->service->reviewProof($proof, (bool) $data['accept'], $data['reason'] ?? null, $request->user());

        return ['ok' => true];
    }

    public function proofFile(ShopPaymentProof $proof)
    {
        abort_unless(Storage::disk('local')->exists($proof->file_path), 404);

        return Storage::disk('local')->response($proof->file_path);
    }

    public function proofQueue()
    {
        return ShopPaymentProof::with('payment.order:id,code,customer_name,customer_phone,grand_total')->where('status', 'menunggu')->oldest()->get()
            ->map(fn ($p) => [
                'id' => $p->id, 'amount' => $p->amount, 'created_at' => $p->created_at,
                'payment' => ['id' => $p->payment->id, 'amount' => $p->payment->amount],
                'order' => $p->payment->order?->only(['code', 'customer_name', 'customer_phone', 'grand_total']),
                'document_number' => ShopDocument::where('payment_id', $p->payment_id)->value('number'),
            ]);
    }

    public function advance(Request $request, string $code)
    {
        $data = $request->validate([
            'to' => 'required|string', 'delivery_date' => 'nullable|date',
            'courier' => 'nullable|string|max:80', 'tracking_number' => 'nullable|string|max:80',
        ]);
        $order = ShopOrder::where('code', $code)->firstOrFail();
        $this->service->advance($order, $data['to'], $data);

        return $this->show($request, $code);
    }

    public function cancel(Request $request, string $code)
    {
        $order = ShopOrder::where('code', $code)->firstOrFail();
        $this->service->cancel($order, $request->input('reason'));

        return $this->show($request, $code);
    }

    public function storeManual(Request $request)
    {
        $data = $request->validate([
            'customer_name' => 'required|string|max:120', 'customer_phone' => 'required|string|max:20',
            'customer_email' => 'nullable|email', 'note' => 'nullable|string|max:1000', 'wa_consent' => 'nullable|boolean',
            'items' => 'required|array|min:1|max:10', 'items.*.item_id' => 'required|integer|exists:items,id',
            'items.*.variant_id' => 'nullable|integer', 'items.*.quantity' => 'required|integer|min:1|max:99',
            'items.*.note' => 'nullable|string|max:500',
        ]);
        $order = $this->service->createManual($data, $request->user());

        return response()->json(['code' => $order->code], 201);
    }

    public function document(ShopDocument $document)
    {
        abort_unless($document->pdf_path && Storage::disk('local')->exists($document->pdf_path), 404);

        return Storage::disk('local')->download($document->pdf_path, $document->title.'-'.str_replace('/', '-', $document->number).'.pdf');
    }

    /** Halaman Scan: QR pada PDF berisi nomor dokumen. */
    public function findDocument(Request $request)
    {
        $doc = ShopDocument::with('order:id,code')->where('number', trim((string) $request->query('number')))->latest('version')->firstOrFail();

        return ['order_code' => $doc->order->code, 'document' => $doc->only(['id', 'number', 'title', 'status'])];
    }

    public function itemSearch(Request $request)
    {
        $term = trim((string) $request->query('q'));

        return Item::query()->when($term, fn ($q) => $q->where('title', 'like', "%$term%")->orWhere('code', 'like', "%$term%"))
            ->limit(20)->get(['id', 'title', 'code', 'image', 'price', 'stock', 'fulfillment_type']);
    }

    public function setRole(Request $request, User $user)
    {
        $data = $request->validate(['admin_role' => 'required|in:owner,cs,finance,production']);
        abort_unless($user->role === 'admin', 422, 'Pengguna ini bukan admin.');
        $before = ['admin_role' => $user->admin_role];
        $user->update($data);
        AuditLog::record('admin.role_changed', $user, $before, $data);

        return $user->only(['id', 'name', 'email', 'admin_role']);
    }

    public function admins()
    {
        return User::where('role', 'admin')->get(['id', 'name', 'email', 'admin_role']);
    }

    public function audit(Request $request)
    {
        return AuditLog::with('user:id,name')
            ->when($request->query('action'), fn ($q, $a) => $q->where('action', 'like', "$a%"))
            ->latest('created_at')->paginate(50);
    }

    protected function present(ShopOrder $o, Request $r, bool $detail = false): array
    {
        $role = $this->role($r);
        $data = $o->toArray();
        $data['status_label'] = ShopOrderService::LABELS[$o->status] ?? $o->status;
        $data['form_url'] = $o->form_token && $o->form_token_expires_at?->isFuture() ? $this->service->formUrl($o) : null;
        $data['wa_url'] = 'https://wa.me/'.$o->customer_phone;
        if ($role === 'cs' && isset($data['shipping'])) unset($data['shipping']['npwp']);

        return $data;
    }
}
