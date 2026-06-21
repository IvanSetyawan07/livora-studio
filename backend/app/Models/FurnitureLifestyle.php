<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class FurnitureLifestyle extends Model {
    protected $table = 'furniture_lifestyle';
    protected $fillable = ['item_id','image','caption','layout_type','width_percentage','sort_order'];
    public function item(){ return $this->belongsTo(Item::class); }
}
