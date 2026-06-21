<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class Item extends Model {
    protected $fillable = ['type_id','collection_id','title','slug','code','texture','finish','availability','image','description'];
    public function type(){ return $this->belongsTo(FurnitureType::class, 'type_id'); }
    public function collection(){ return $this->belongsTo(Collection::class); }
    public function themes(){ return $this->belongsToMany(Theme::class, 'item_theme'); }
    public function categories(){ return $this->belongsToMany(Category::class, 'category_item'); }
    public function variants(){ return $this->hasMany(FurnitureVariant::class)->orderBy('sort_order'); }
    public function gallery(){ return $this->hasMany(FurnitureGallery::class)->orderBy('sort_order'); }
    public function lifestyle(){ return $this->hasMany(FurnitureLifestyle::class)->orderBy('sort_order'); }
    public function story(){ return $this->hasOne(FurnitureStory::class); }
}
