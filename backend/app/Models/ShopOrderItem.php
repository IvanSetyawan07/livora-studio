<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ShopOrderItem extends Model
{
    protected $guarded = ['id'];

    public function order() { return $this->belongsTo(ShopOrder::class, 'order_id'); }
    public function item() { return $this->belongsTo(Item::class); }
}
