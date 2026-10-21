<?php

namespace App\Http\Controllers\Api\Shop;

use App\Http\Controllers\Controller;
use App\Services\Shop\ShopCartService;
use Illuminate\Http\Request;

/**
 * Keranjang anonim berkode CRT-XXXX (publik, tanpa login).
 * "Pesan" menyimpan keranjang, membuat kode, lalu frontend membuka wa.me
 * dengan pesan terisi kode — bot mengenali barang dari kode itu.
 */
class ShopCartController extends Controller
{
    /** POST /api/shop/carts — simpan keranjang, kembalikan kode + URL WhatsApp. */
    public function store(Request $request)
    {
        $data = $request->validate([
            'items' => 'required|array|min:1|max:10',
            'items.*.item_id' => 'required|integer|exists:items,id',
            'items.*.variant_id' => 'nullable|integer',
            'items.*.quantity' => 'nullable|integer|min:1|max:99',
            'items.*.note' => 'nullable|string|max:500',
            'session_id' => 'nullable|string|max:64',
        ]);

        // Lengkapi judul/kode agar bot bisa menyebut nama barang tanpa menebak
        $items = collect($data['items'])->map(function ($row) {
            $item = \App\Models\Item::find($row['item_id']);

            return [
                'item_id' => $item->id, 'variant_id' => $row['variant_id'] ?? null,
                'quantity' => max(1, (int) ($row['quantity'] ?? 1)), 'note' => $row['note'] ?? null,
                'title' => $item->title, 'code' => $item->code,
            ];
        })->all();

        $code = ShopCartService::create($items, $data['session_id'] ?? null);
        $botNumber = \App\Services\Shop\ShopSettings::get('bot_wa_number') ?: config('services.shop.whatsapp_number');
        $text = "Halo Livora, saya mau pesan. Kode keranjang: {$code}";

        return response()->json([
            'code' => $code,
            'wa_url' => 'https://wa.me/'.$botNumber.'?text='.rawurlencode($text),
        ], 201);
    }

    /** GET /api/shop/carts/{code} — cek isi keranjang (untuk pratinjau sebelum buka WA). */
    public function show(string $code)
    {
        $cart = ShopCartService::find($code);
        abort_unless($cart, 404, 'Kode keranjang tidak ditemukan.');

        return ['code' => $cart->code, 'items' => $cart->items, 'claimed' => (bool) $cart->claimed_phone];
    }
}
