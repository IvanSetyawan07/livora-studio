<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class FurnitureType extends Model {
    use \App\Models\Concerns\HasTranslations;
    public array $translatable = ['name'];
    protected $fillable = ['name','slug'];
    public function items(){ return $this->hasMany(Item::class, 'type_id'); }
}
