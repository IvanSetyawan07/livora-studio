<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StockHold extends Model
{
    protected $guarded = ['id'];

    protected $casts = ['expires_at' => 'datetime'];

    /** Stok tersedia = stok item - hold aktif (held belum kedaluwarsa + reserved). */
    public static function available(Item $item, ?int $exceptOrderId = null): ?int
    {
        if ($item->stock === null) {
            return null; // stok tidak dilacak
        }
        $held = static::where('item_id', $item->id)
            ->when($exceptOrderId, fn ($q) => $q->where('order_id', '!=', $exceptOrderId))
            ->where(function ($q) {
                $q->where('status', 'reserved')
                  ->orWhere(fn ($h) => $h->where('status', 'held')->where('expires_at', '>', now()));
            })
            ->sum('quantity');

        return max(0, (int) $item->stock - (int) $held);
    }
}
