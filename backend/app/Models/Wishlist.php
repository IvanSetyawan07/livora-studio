<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Wishlist extends Model
{
    // Table hanya punya created_at (lihat migration create_wishlists_table).
    public $timestamps = false;

    public const TYPE_ITEM       = 'item';
    public const TYPE_COLLECTION = 'collection';
    public const TYPE_PROJECT    = 'project';
    public const TYPE_CATALOG    = 'catalog';

    public const TYPES = [
        self::TYPE_ITEM,
        self::TYPE_COLLECTION,
        self::TYPE_PROJECT,
        self::TYPE_CATALOG,
    ];

    protected $fillable = [
        'user_id',
        'wishlistable_type',
        'wishlistable_id',
    ];

    protected $casts = [
        'created_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
