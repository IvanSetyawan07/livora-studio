<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class Collection extends Model {
    protected $fillable = [
        'name','slug','description','short_description',
        'hero_banner','card_banner','featured_image',
        'display_order','status','seo_title','seo_description',
        'cta_text','cta_link',
    ];
    public function items(){ return $this->hasMany(Item::class); }
    public function story(){ return $this->hasOne(CollectionStory::class); }
    public function packages(){ return $this->hasMany(CollectionPackage::class)->orderBy('sort_order'); }
}
