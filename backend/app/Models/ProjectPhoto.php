<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class ProjectPhoto extends Model {
    protected $fillable = ['project_id','title','image','caption','sort_order'];
    public function project(){ return $this->belongsTo(Project::class); }
    public function items(){ return $this->belongsToMany(Item::class, 'photo_items', 'project_photo_id', 'item_id'); }
}
