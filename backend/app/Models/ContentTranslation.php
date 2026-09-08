<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class ContentTranslation extends Model
{
    protected $fillable = [
        'translatable_type', 'translatable_id', 'locale', 'field', 'value', 'source',
    ];

    public function translatable(): MorphTo
    {
        return $this->morphTo();
    }
}
