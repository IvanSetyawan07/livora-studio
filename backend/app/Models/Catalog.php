<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Catalog extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'title',
        'tagline',       
        'about_title',
        'slug',
        'category',
        'taxonomy',
        'description',
        'cover_image',
        'scene_1_image',
        'scene_2_image',
        'featured',
    ];

    protected $casts = [
        'featured' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    /**
     * Relationship: A catalog has many hotspots
     */
    public function scenes()
{
    return $this->hasMany(CatalogScene::class)->orderBy('order');
}
    public function hotspots()
    {
        return $this->hasMany(Hotspot::class);
    }

    /**
     * Get hotspots for a specific scene
     */
    public function hotspotsByScene($scene)
    {
        return $this->hotspots()
            ->where('scene_number', $scene)
            ->orderBy('created_at');
    }

    /**
     * Scope: Get featured catalogs
     */
    public function scopeFeatured($query)
    {
        return $query->where('featured', true);
    }

    /**
     * Scope: Get catalogs by category
     */
    public function scopeByCategory($query, $category)
    {
        return $query->where('category', $category);
    }

    /**
     * Scope: Get catalogs by taxonomy
     */
    public function scopeByTaxonomy($query, $taxonomy)
    {
        return $query->where('taxonomy', $taxonomy);
    }

    /**
     * Scope: Search by title or slug
     */
    public function scopeSearch($query, $search)
    {
        return $query->where(function ($q) use ($search) {
            $q->where('title', 'like', "%{$search}%")
              ->orWhere('slug', 'like', "%{$search}%");
        });
    }
}