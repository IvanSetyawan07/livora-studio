<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class FurnitureVariant extends Model {
    protected $table = 'furniture_variants';
    protected $fillable = ['item_id','variant_name','category','color_name','material_name','preview_image','description','sort_order','is_active'];
    protected $casts = ['is_active' => 'boolean'];

    public function item(){ return $this->belongsTo(Item::class); }
    public function gallery(){ return $this->hasMany(FurnitureGallery::class, 'variant_id')->orderBy('sort_order'); }
}
