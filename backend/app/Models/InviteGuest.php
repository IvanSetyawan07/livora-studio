<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class InviteGuest extends Model
{
    protected $guarded = ['id'];

    protected $casts = ['sent_at' => 'datetime', 'rsvp_at' => 'datetime', 'checked_in_at' => 'datetime'];

    protected $appends = ['image_url'];
     /** Token RSVP bersifat rahasia per tamu; tidak perlu ikut ke JSON admin. */
    protected $hidden = ['rsvp_token'];

    protected static function booted(): void
    {
        static::creating(function (self $g) {
            if (!$g->rsvp_token) $g->rsvp_token = \Illuminate\Support\Str::random(32);
        });
    }

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
