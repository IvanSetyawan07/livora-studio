<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ShopPaymentProof extends Model
{
    protected $guarded = ['id'];

    protected $casts = ['verified_at' => 'datetime'];

    public function payment() { return $this->belongsTo(ShopPayment::class, 'payment_id'); }
    public function verifier() { return $this->belongsTo(User::class, 'verified_by'); }
}
