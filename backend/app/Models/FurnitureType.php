<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class FurnitureType extends Model {
    protected $fillable = ['name','slug'];
    public function items(){ return $this->hasMany(Item::class, 'type_id'); }
}
