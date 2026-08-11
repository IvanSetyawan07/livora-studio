<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProjectLayout extends Model
{
    protected $fillable = ['project_id','title','subtitle','description','image','sort_order'];

    public function project(){ return $this->belongsTo(Project::class); }
    public function rooms(){ return $this->hasMany(ProjectRoom::class)->orderBy('sort_order')->orderBy('id'); }
}
