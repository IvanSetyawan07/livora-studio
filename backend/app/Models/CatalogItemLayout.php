<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CatalogItemLayout extends Model
{
    protected $fillable = ['catalog_id', 'item_slug', 'pos_x', 'pos_y', 'width', 'height'];

    protected $casts = [
        'pos_x' => 'integer',
        'pos_y' => 'integer',
        'width' => 'integer',
        'height' => 'integer',
    ];

    public function catalog()
    {
        return $this->belongsTo(Catalog::class);
    }
}