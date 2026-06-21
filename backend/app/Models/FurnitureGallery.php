<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class FurnitureGallery extends Model {
    protected $table = 'furniture_gallery';
    protected $fillable = ['item_id','variant_id','image','title','alt_text','sort_order'];
    public function item(){ return $this->belongsTo(Item::class); }
    public function variant(){ return $this->belongsTo(FurnitureVariant::class, 'variant_id'); }
}
