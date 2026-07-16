<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class CollectionPackage extends Model {
    protected $fillable = ['collection_id','name','slug','description','banner','sort_order'];
    public function collection(){ return $this->belongsTo(Collection::class); }
    public function items(){
        return $this->belongsToMany(Item::class, 'collection_package_item', 'package_id', 'item_id')
            ->withPivot('sort_order')->orderBy('collection_package_item.sort_order');
    }
}
