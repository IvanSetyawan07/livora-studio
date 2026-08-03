<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CatalogScene extends Model
{
    protected $fillable = ['catalog_id', 'scene_key', 'image', 'alt', 'order'];

    public function catalog()
    {
        return $this->belongsTo(Catalog::class);
    }
    
} 
