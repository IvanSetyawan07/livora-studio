<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ShopOrderItem extends Model
{
    protected $guarded = ['id'];

    protected static function booted(): void
    {
        static::saved(fn (self $i) => \App\Services\Shop\SheetsSync::queueOrder($i->order_id));
        static::deleted(fn (self $i) => \App\Services\Shop\SheetsSync::queueOrder($i->order_id));
    }

    public function order() { return $this->belongsTo(ShopOrder::class, 'order_id'); }
    public function item() { return $this->belongsTo(Item::class); }
}
