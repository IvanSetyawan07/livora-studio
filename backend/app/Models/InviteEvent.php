<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class InviteEvent extends Model
{
    protected $guarded = ['id'];

    protected $casts = ['event_date' => 'datetime', 'is_active' => 'boolean', 'template_has_buttons' => 'boolean'];

    protected $appends = ['default_image_url'];

    public function guests()
    {
        return $this->hasMany(InviteGuest::class, 'event_id');
    }

    public function getDefaultImageUrlAttribute(): ?string
    {
        return $this->default_image_path ? Storage::disk('public')->url($this->default_image_path) : null;
    }
}
