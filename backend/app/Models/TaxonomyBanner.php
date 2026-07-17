<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TaxonomyBanner extends Model
{
    use HasFactory;

    protected $fillable = [
        'taxonomy_key',
        'image',
        'path',
        'title',
        'position',
    ];
}
