<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class FurnitureVariant extends Model {
    protected $table = 'furniture_variants';
    protected $fillable = ['item_id', 'variant_name', 'category',
    'color_name', 'color_code', 
    'material_name', 'preview_image', 'furniture_image',
    'description', 'sort_order',
    'is_active', 'is_default',  ];
    protected $casts = ['is_active'  => 'boolean',
    'is_default' => 'boolean',];

    public function item(){ return $this->belongsTo(Item::class); }
    public function gallery(){ return $this->hasMany(FurnitureGallery::class, 'variant_id')->orderBy('sort_order'); }
}

