<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ShopPayment extends Model
{
    protected $guarded = ['id'];

    protected $casts = ['expires_at' => 'datetime', 'paid_at' => 'datetime'];

    public function order() { return $this->belongsTo(ShopOrder::class, 'order_id'); }
    public function proofs() { return $this->hasMany(ShopPaymentProof::class, 'payment_id'); }
    public function verifier() { return $this->belongsTo(User::class, 'verified_by'); }
}
