<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Posisi node per tampilan diagram. */
class C4Layout extends Model
{
    protected $table = 'c4_layouts';

    protected $fillable = ['view_key', 'element_key', 'x', 'y'];

    protected $casts = ['x' => 'float', 'y' => 'float'];
}
