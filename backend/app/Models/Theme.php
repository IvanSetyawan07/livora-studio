<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class Theme extends Model {
    protected $fillable = ['name','slug'];
    public function items(){ return $this->belongsToMany(Item::class, 'item_theme'); }
}
