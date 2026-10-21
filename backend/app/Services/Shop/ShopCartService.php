<?php

namespace App\Services\Shop;

use Illuminate\Support\Facades\DB;

/**
 * Keranjang anonim berkode pendek CRT-XXXX — pintu masuk dari web ke WhatsApp.
 * Customer tidak perlu login; bot mengenali barang dari kode, bukan dari teks.
 */
class ShopCartService
{
    public static function create(array $items, ?string $sessionId = null): string
    {
        $code = self::generateCode();
        DB::table('shop_carts')->insert([
            'code' => $code,
            'items' => json_encode(array_values($items)),
            'session_id' => $sessionId,
            'created_at' => now(), 'updated_at' => now(),
        ]);

        return $code;
    }

    public static function find(string $code): ?object
    {
        $row = DB::table('shop_carts')->where('code', strtoupper(trim($code)))->first();
        if ($row) $row->items = json_decode((string) $row->items, true) ?: [];

        return $row;
    }

    /** Klaim keranjang oleh nomor WA pengirim (sekali saja). */
    public static function claim(string $code, string $phone): ?object
    {
        $cart = self::find($code);
        if (!$cart) return null;
        if ($cart->claimed_phone && $cart->claimed_phone !== $phone) return null; // sudah diklaim nomor lain
        if (!$cart->claimed_phone) {
            DB::table('shop_carts')->where('id', $cart->id)->update([
                'claimed_phone' => $phone, 'claimed_at' => now(), 'updated_at' => now(),
            ]);
            $cart->claimed_phone = $phone;
        }

        return $cart;
    }

    public static function attachOrder(int $cartId, int $orderId): void
    {
        DB::table('shop_carts')->where('id', $cartId)->update(['order_id' => $orderId, 'updated_at' => now()]);
    }

    public static function generateCode(): string
    {
        $alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        do {
            $code = 'CRT-';
            for ($i = 0; $i < 4; $i++) $code .= $alphabet[random_int(0, strlen($alphabet) - 1)];
        } while (DB::table('shop_carts')->where('code', $code)->exists());

        return $code;
    }
}
