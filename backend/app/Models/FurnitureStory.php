<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class FurnitureStory extends Model {
    protected $table = 'furniture_stories';
    protected $fillable = ['item_id','title','description','feature_image'];
    public function item(){ return $this->belongsTo(Item::class); }
    public function cards(){ return $this->hasMany(FurnitureStoryCard::class, 'story_id')->orderBy('sort_order'); }
}
