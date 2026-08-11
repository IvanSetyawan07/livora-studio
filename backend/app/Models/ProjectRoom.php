<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProjectRoom extends Model
{
    protected $fillable = ['project_layout_id','title','area','description','specs','image','sort_order'];
    protected $casts = ['specs' => 'array'];

    public function layout(){ return $this->belongsTo(ProjectLayout::class, 'project_layout_id'); }
    public function hotspots(){ return $this->hasMany(ProjectRoomHotspot::class)->orderBy('sort_order')->orderBy('id'); }
}
