<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Domain fitur C4 (warna per fitur). Hanya menyentuh tabel c4_domains. */
class C4Domain extends Model
{
    protected $table = 'c4_domains';

    protected $fillable = ['key', 'name', 'color', 'description', 'sort_order', 'source'];

    protected $casts = ['sort_order' => 'integer'];
}
