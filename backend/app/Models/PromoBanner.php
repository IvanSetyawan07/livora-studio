<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class PromoBanner extends Model
{
    protected $table = 'promo_banners';

    protected $fillable = [
        'title',
        'subtitle',
        'label',
        'description',
        'image_url',
        'cta_text',
        'cta_link',
        'order_index',
        'is_active',
        'start_date',
        'end_date',
    ];

    protected $casts = [
        'order_index' => 'integer',
        'is_active' => 'boolean',
        'start_date' => 'datetime',
        'end_date' => 'datetime',
    ];

    /**
     * Scope untuk mengambil banner yang sedang aktif & dalam jadwal tayang.
     */
    public function scopeActive(Builder $query): Builder
    {
        $now = now();
        return $query->where('is_active', true)
            ->where(function ($q) use ($now) {
                // Toleransi perbedaan timezone input lokal (WIB / UTC+7) vs server (UTC)
                $q->whereNull('start_date')->orWhere('start_date', '<=', $now->copy()->addHours(14));
            })
            ->where(function ($q) use ($now) {
                $q->whereNull('end_date')->orWhere('end_date', '>=', $now->copy()->subHours(14));
            })
            ->orderBy('order_index', 'asc')
            ->orderBy('id', 'asc');
    }
}
