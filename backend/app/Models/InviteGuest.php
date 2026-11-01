<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class InviteGuest extends Model
{
    protected $guarded = ['id'];

    protected $casts = ['sent_at' => 'datetime', 'rsvp_at' => 'datetime'];

    protected $appends = ['image_url'];

    public function event()
    {
        return $this->belongsTo(InviteEvent::class, 'event_id');
    }

    /** Gambar pribadi tamu; kalau kosong pakai gambar umum acara. */
    public function getImageUrlAttribute(): ?string
    {
        if ($this->image_path) return Storage::disk('public')->url($this->image_path);

        return $this->event?->default_image_url;
    }
}
