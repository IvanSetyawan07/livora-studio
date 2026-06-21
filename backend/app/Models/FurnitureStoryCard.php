<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class FurnitureStoryCard extends Model {
    protected $table = 'furniture_story_cards';
    protected $fillable = ['story_id','title','description','icon','sort_order'];
    public function story(){ return $this->belongsTo(FurnitureStory::class, 'story_id'); }
}
