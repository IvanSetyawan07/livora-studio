<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class Item extends Model {
    protected $fillable = ['type_id','title','slug','code','texture','finish','availability','image','description'];
    public function type(){ return $this->belongsTo(FurnitureType::class, 'type_id'); }
    public function themes(){ return $this->belongsToMany(Theme::class, 'item_theme'); }
    public function categories(){ return $this->belongsToMany(Category::class, 'category_item'); }
}
