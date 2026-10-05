<?php

namespace App\Services\Shop;

use App\Models\ShopOrder;

/**
 * Rumus tetap (integer rupiah):
 * SubTotal = Σ harga×qty; DiskonProduk = Σ diskon/unit×qty;
 * DiskonTambahan = % atau nominal dari (SubTotal - DiskonProduk);
 * DPP = SubTotal - DiskonProduk - DiskonTambahan; PPN = round(rate × DPP);
 * GrandTotal = DPP + PPN + Ongkir + Pasang + Lainnya.
 */
class InvoiceCalculator
{
    public static function unitDiscount(int $unitPrice, ?string $type, $value): int
    {
        if (!$type || !$value) return 0;
        $d = $type === 'percent' ? (int) round($unitPrice * min(100, (float) $value) / 100) : (int) round((float) $value);

        return max(0, min($unitPrice, $d));
    }

    public static function apply(ShopOrder $order): ShopOrder
    {
        $order->loadMissing('items');
        $subtotal = 0;
        $productDiscount = 0;
        foreach ($order->items as $line) {
            $subtotal += (int) $line->unit_price * (int) $line->quantity;
            $productDiscount += (int) $line->unit_discount * (int) $line->quantity;
        }
        $base = max(0, $subtotal - $productDiscount);
        $extra = 0;
        if ($order->extra_discount_type && $order->extra_discount_value) {
            $extra = $order->extra_discount_type === 'percent'
                ? (int) round($base * min(100, (float) $order->extra_discount_value) / 100)
                : (int) round((float) $order->extra_discount_value);
            $extra = max(0, min($base, $extra));
        }
        $dpp = $base - $extra;
        $ppn = (int) round($dpp * (float) config('services.shop.ppn_rate', 0.11));

        $order->subtotal = $subtotal;
        $order->product_discount = $productDiscount;
        $order->extra_discount = $extra;
        $order->dpp = $dpp;
        $order->ppn = $ppn;
        $order->grand_total = $dpp + $ppn + (int) $order->shipping_fee + (int) $order->installation_fee + (int) $order->other_fee;

        return $order;
    }
}
