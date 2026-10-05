<?php

namespace App\Http\Controllers\Api\Shop;

use App\Http\Controllers\Controller;
use App\Models\ShopOrder;
use App\Services\Shop\ShopOrderService;
use Illuminate\Http\Request;

/** Form pengiriman publik lewat token bertanda (tanpa login, tanpa harga). */
class OrderFormController extends Controller
{
    public function __construct(protected ShopOrderService $service) {}

    protected function resolve(Request $request, string $code): ShopOrder
    {
        $order = ShopOrder::with('items')->where('code', $code)->first();
        $token = (string) $request->query('token', $request->input('token', ''));
        abort_unless(
            $order && $order->form_token && hash_equals($order->form_token, $token) && $order->form_token_expires_at?->isFuture(),
            404, 'Tautan tidak valid atau sudah kedaluwarsa.'
        );

        return $order;
    }

    public function show(Request $request, string $code)
    {
        $order = $this->resolve($request, $code);
        $user = $order->user;

        return [
            'code' => $order->code,
            'items' => $order->items->map(fn ($i) => $i->only(['id', 'title', 'code', 'variant_name', 'image', 'fulfillment_type', 'quantity', 'note']))->values(),
            'has_mto' => $order->hasMto(),
            'prefill' => [
                'recipient' => $order->customer_name ?? $user?->name,
                'phone' => $order->customer_phone ?? $user?->phone,
                'street' => $user?->address,
            ],
            'expires_at' => $order->form_token_expires_at,
        ];
    }

    public function submit(Request $request, string $code)
    {
        $order = $this->resolve($request, $code);
        $s = $request->validate([
            'method' => 'required|in:delivery,pickup',
            'recipient' => 'required|string|max:120',
            'phone' => 'required|string|max:20',
            'street' => 'required_if:method,delivery|nullable|string|max:255',
            'rt' => 'nullable|string|max:5', 'rw' => 'nullable|string|max:5',
            'village' => 'nullable|string|max:80', 'district' => 'required_if:method,delivery|nullable|string|max:80',
            'city' => 'required_if:method,delivery|nullable|string|max:80', 'province' => 'required_if:method,delivery|nullable|string|max:80',
            'postal_code' => 'nullable|string|max:10', 'landmark' => 'nullable|string|max:255',
            'map_url' => 'nullable|url|max:500',
            'building_type' => 'nullable|string|max:40', 'floor' => 'nullable|string|max:10', 'has_lift' => 'nullable|boolean',
            'door_width_cm' => 'nullable|integer|min:0|max:1000', 'large_vehicle_parking' => 'nullable|boolean',
            'preferred_date' => 'nullable|date|after_or_equal:today', 'needs_installation' => 'nullable|boolean',
            'notes' => 'nullable|string|max:1000',
            'company' => 'nullable|string|max:120', 'npwp' => 'nullable|string|max:30', 'wants_tax_invoice' => 'nullable|boolean',
            'consent' => 'accepted',
            'custom_spec' => 'nullable|array',
            'custom_spec.*.order_item_id' => 'required_with:custom_spec|integer',
            'custom_spec.*.dimensions' => 'nullable|string|max:120',
            'custom_spec.*.material' => 'nullable|string|max:120',
            'custom_spec.*.color' => 'nullable|string|max:120',
            'custom_spec.*.notes' => 'nullable|string|max:500',
            'mto_terms' => $order->hasMto() ? 'accepted' : 'nullable',
        ]);
        $custom = $s['custom_spec'] ?? null;
        unset($s['custom_spec'], $s['consent'], $s['mto_terms']);
        $this->service->submitForm($order, $s, $custom);

        return ['ok' => true, 'status' => $order->fresh()->status];
    }
}
