<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class Project extends Model {
    protected $fillable = ['title','slug','subtitle','description','location','year','hero_image','scope_id','is_highlighted','sort_order','hero_focus_x','hero_focus_y','hero_zoom'];
    protected $casts = ['is_highlighted' => 'boolean', 'hero_focus_x' => 'float', 'hero_focus_y' => 'float', 'hero_zoom' => 'float'];
    public function scope(){ return $this->belongsTo(Scope::class); }
    public function photos(){ return $this->hasMany(ProjectPhoto::class)->orderBy('sort_order'); }
    public function layouts(){ return $this->hasMany(ProjectLayout::class)->orderBy('sort_order')->orderBy('id'); }
}
