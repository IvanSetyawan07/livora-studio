<?php

namespace App\Services\Shop;

use App\Models\Item;
use App\Models\ShopOrder;
use Illuminate\Support\Facades\DB;

/**
 * Tool (function calling) untuk bot Livi. Model TIDAK boleh menghasilkan
 * angka harga sendiri — harga hanya disisipkan dari hasil get_price.
 * Setiap pemanggilan dicatat untuk log AI.
 */
class BotTools
{
    public const DEFINITIONS = [
        ['name' => 'get_cart', 'description' => 'Isi keranjang customer dari kode CRT-XXXX', 'parameters' => ['code' => 'string']],
        ['name' => 'get_product_info', 'description' => 'Spesifikasi produk dari database (nama, dimensi, material, foto)', 'parameters' => ['query' => 'string']],
        ['name' => 'get_price', 'description' => 'Harga produk yang SUDAH terkonfirmasi; null bila belum', 'parameters' => ['item_id' => 'integer']],
        ['name' => 'save_customer_fields', 'description' => 'Simpan data pengiriman yang diekstrak dari chat', 'parameters' => ['fields' => 'object']],
        ['name' => 'create_order', 'description' => 'Buat pesanan setelah data lengkap dan dikonfirmasi customer', 'parameters' => ['shipping_method' => 'string']],
        ['name' => 'request_handoff', 'description' => 'Serahkan percakapan ke admin (nego, komplain, custom, gagal paham)', 'parameters' => ['reason' => 'string', 'summary' => 'string']],
        ['name' => 'get_order_status', 'description' => 'Status pesanan milik nomor ini saja', 'parameters' => ['code' => 'string']],
        ['name' => 'list_open_orders', 'description' => 'Daftar pesanan aktif milik nomor ini', 'parameters' => []],
        ['name' => 'set_state', 'description' => 'Pindahkan state percakapan', 'parameters' => ['state' => 'string']],
    ];

    public function __construct(protected string $phone, protected object $conversation) {}

    public function call(string $name, array $args = []): array
    {
        return match ($name) {
            'get_cart' => $this->getCart($args['code'] ?? ''),
            'get_product_info' => $this->getProductInfo((string) ($args['query'] ?? ''), (int) ($args['item_id'] ?? 0)),
            'get_price' => $this->getPrice((int) ($args['item_id'] ?? 0)),
            'save_customer_fields' => $this->saveFields((array) ($args['fields'] ?? [])),
            'create_order' => $this->createOrder($args['shipping_method'] ?? null),
            'request_handoff' => $this->handoff($args['reason'] ?? 'diminta_customer', $args['summary'] ?? ''),
            'get_order_status' => $this->orderStatus($args['code'] ?? ''),
            'list_open_orders' => $this->openOrders(),
            'set_state' => $this->setState($args['state'] ?? 'menu'),
            default => ['error' => 'tool tidak dikenal'],
        };
    }

    protected function getCart(string $code): array
    {
        $cart = ShopCartService::claim($code, $this->phone);
        if (!$cart) return ['found' => false];
        DB::table('wa_conversations')->where('id', $this->conversation->id)->update(['cart_id' => $cart->id, 'updated_at' => now()]);
        $this->conversation->cart_id = $cart->id;

        return ['found' => true, 'code' => $cart->code, 'items' => $cart->items];
    }

    protected function getProductInfo(string $query, int $itemId = 0): array
    {
        if ($itemId <= 0 && trim($query) === '') return ['found' => false];
        $item = $itemId > 0
            ? Item::find($itemId)
            : Item::query()->where('title', 'like', '%'.$query.'%')->orWhere('code', $query)->first();
        if (!$item) return ['found' => false];

        return [
            'found' => true, 'item_id' => $item->id, 'title' => $item->title, 'code' => $item->code,
            'description' => $item->description, 'dimensions' => $item->dimensions ?? null,
            'material' => $item->material ?? null, 'image' => $item->image ?? null,
            'fulfillment_type' => $item->fulfillment_type ?? 'ready_stock',
            'weight_kg' => $item->weight_kg ?? null, 'volume_m3' => $item->volume_m3 ?? null,
        ];
    }

    /** Harga hanya keluar bila berstatus terkonfirmasi (price_confirmed_at terisi). */
    protected function getPrice(int $itemId): array
    {
        $item = Item::find($itemId);
        if (!$item) return ['confirmed' => false, 'price' => null];
        $confirmed = !empty($item->price_confirmed_at) && (int) ($item->base_price ?? 0) > 0;

        return ['confirmed' => $confirmed, 'price' => $confirmed ? (int) $item->base_price : null];
    }

    protected function saveFields(array $fields): array
    {
        $allowed = array_flip(['name', 'address', 'city', 'pin_location', 'building_access', 'install_on_site', 'need_tax_invoice', 'company_name', 'npwp', 'invoice_address', 'phone']);
        $fields = array_intersect_key($fields, $allowed);
        $collected = array_merge((array) json_decode((string) ($this->conversation->collected ?? '[]'), true), $fields);
        DB::table('wa_conversations')->where('id', $this->conversation->id)->update(['collected' => json_encode($collected), 'updated_at' => now()]);
        $this->conversation->collected = json_encode($collected);

        return ['saved' => array_keys($fields), 'collected' => $collected];
    }

        protected function createOrder(?string $method): array
    {
        $collected = (array) json_decode((string) ($this->conversation->collected ?? '[]'), true);
        $cart = $this->conversation->cart_id ? ShopCartService::find(DB::table('shop_carts')->where('id', $this->conversation->cart_id)->value('code') ?? '') : null;
        $items = $cart?->items ?? [];
        if (!$items) return ['error' => 'keranjang kosong'];

        // Satu keranjang = satu pesanan (cegah ganda bila tombol ditekan dua kali)
        if ($cart->order_id && ($existing = ShopOrder::find($cart->order_id))) {
            return ['created' => true, 'code' => $existing->code, 'order_id' => $existing->id];
        }

        $order = app(ShopOrderService::class)->createFromBot($this->phone, $items, $collected, $method);
        if ($cart) ShopCartService::attachOrder($cart->id, $order->id);
        DB::table('wa_conversations')->where('id', $this->conversation->id)->update([
            'order_id' => $order->id, 'state' => 'menunggu_penawaran', 'last_intent' => null, 'updated_at' => now(),
        ]);
        $this->conversation->order_id = $order->id;
        // Chat sebelum pesanan dibuat ikut tertaut ke pesanan (tampil di linimasa & detail pesanan)
        DB::table('wa_messages')->where('phone', $this->phone)->whereNull('order_id')->update(['order_id' => $order->id]);
        DB::table('wa_messages')->where('phone', $this->phone)->whereNull('conversation_id')->update(['conversation_id' => $this->conversation->id]);

        return ['created' => true, 'code' => $order->code, 'order_id' => $order->id];
    }

    protected function handoff(string $reason, string $summary): array
    {
        $convId = (int) ($this->conversation->id ?? 0);
        DB::table('wa_conversations')->where('id', $convId)->update([
            'mode' => 'menunggu_admin', 'handoff_reason' => mb_substr($reason, 0, 60), 'handoff_at' => now(), 'updated_at' => now(),
        ]);
        $this->conversation->mode = 'menunggu_admin';
        NotifyService::notify('N1', $this->conversation->order_id ?: null, [
            'phone' => $this->phone, 'trigger' => $reason,
            'body' => 'Chat '.($this->conversation->wa_name ?: '+'.$this->phone)." butuh admin ({$reason}). ".$summary,
        ], 'c'.$convId.'-'.time(), $convId ?: null);

        return ['handed_off' => true];
    }

    /** Hanya pesanan milik nomor ini — privasi: jangan buka data orang lain. */
    protected function orderStatus(string $code): array
    {
        $order = ShopOrder::where('code', strtoupper(trim($code)))->where('customer_phone', $this->phone)->first();
        if (!$order) return ['found' => false];

        return ['found' => true, 'code' => $order->code, 'status' => $order->status,
            'tracking_number' => $order->tracking_number, 'courier' => $order->courier];
    }

    protected function openOrders(): array
    {
        return ShopOrder::where('customer_phone', $this->phone)
            ->whereNotIn('status', ['selesai', 'dibatalkan', 'kedaluwarsa'])
            ->latest()->limit(5)->get(['code', 'status', 'created_at'])->toArray();
    }

    protected function setState(string $state): array
    {
        DB::table('wa_conversations')->where('id', $this->conversation->id)->update(['state' => $state, 'updated_at' => now()]);
        $this->conversation->state = $state;

        return ['state' => $state];
    }
}
