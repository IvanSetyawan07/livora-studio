<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProjectRoomHotspot extends Model
{
    protected $fillable = ['project_room_id','label','x','y','item_slug','description','image','sort_order'];
    protected $casts = ['x' => 'float', 'y' => 'float'];

    public function room(){ return $this->belongsTo(ProjectRoom::class, 'project_room_id'); }
}
