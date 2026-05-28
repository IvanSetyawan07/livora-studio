<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class Project extends Model {
    protected $fillable = ['title','slug','subtitle','description','location','year','hero_image','scope_id','is_highlighted','sort_order'];
    protected $casts = ['is_highlighted' => 'boolean'];
    public function scope(){ return $this->belongsTo(Scope::class); }
    public function photos(){ return $this->hasMany(ProjectPhoto::class)->orderBy('sort_order'); }
}
