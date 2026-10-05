<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ShopDocument extends Model
{
    protected $guarded = ['id'];

    protected $casts = ['snapshot' => 'array', 'issued_at' => 'datetime', 'paid_at' => 'datetime'];

    public function order() { return $this->belongsTo(ShopOrder::class, 'order_id'); }
    public function payment() { return $this->belongsTo(ShopPayment::class, 'payment_id'); }
}
