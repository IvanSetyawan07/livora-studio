<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CartItem extends Model
{
    protected $guarded = ['id'];

    protected $casts = ['selected' => 'boolean', 'quantity' => 'integer'];

    public function item() { return $this->belongsTo(Item::class); }
    public function variant() { return $this->belongsTo(FurnitureVariant::class, 'variant_id'); }
}
