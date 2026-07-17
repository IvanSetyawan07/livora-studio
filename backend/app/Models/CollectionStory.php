<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class CollectionStory extends Model {
    protected $fillable = ['collection_id','story_banner','story_description','cta_text','cta_link'];
    public function collection(){ return $this->belongsTo(Collection::class); }
}
