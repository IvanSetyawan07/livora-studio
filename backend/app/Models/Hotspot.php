<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Hotspot extends Model
{
    protected $fillable = [
        'catalog_id',
        'scene_number',
        'label',
        'x',
        'y',
        'item_slug',
        'description',
        'image',
        'display_order',
        'is_featured',
    ];

    protected $casts = [
        'x' => 'float',
        'y' => 'float',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'is_featured' => 'boolean',
        'display_order' => 'integer',
    ];

    /**
     * Relationship: A hotspot belongs to a catalog
     */
    public function catalog()
    {
        return $this->belongsTo(Catalog::class);
    }

    /**
     * Relationship: A hotspot belongs to an item (optional)
     * Note: Assumes items table has 'slug' as primary identifier
     */
    public function item()
    {
        return $this->belongsTo(Item::class, 'item_slug', 'slug');
    }

    /**
     * Scope: Get hotspots by scene
     */
    public function scopeByScene($query, $scene)
    {
        return $query->where('scene_number', $scene);
    }

    /**
     * Scope: Get hotspots for a catalog
     */
    public function scopeForCatalog($query, $catalogId)
    {
        return $query->where('catalog_id', $catalogId);
    }

    /**
     * Get position as array
     */
    public function getPositionAttribute()
    {
        return [
            'x' => $this->x,
            'y' => $this->y,
        ];
    }
}