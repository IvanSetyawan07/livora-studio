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

    public function scenes()
    {
        return $this->hasMany(CatalogScene::class)->orderBy('order');
    }

    public function hotspots()
    {
        return $this->hasMany(Hotspot::class);
    }

    /**
     * Relationship: A catalog has many item layouts (grid position/size)
     */
    public function itemLayouts()
    {
        return $this->hasMany(CatalogItemLayout::class);
    }

    public function hotspotsByScene($scene)
    {
        return $this->hotspots()
            ->where('scene_number', $scene)
            ->orderBy('created_at');
    }

    public function scopeFeatured($query)
    {
        return $query->where('featured', true);
    }

    public function scopeByCategory($query, $category)
    {
        return $query->where('category', $category);
    }

    public function scopeByTaxonomy($query, $taxonomy)
    {
        return $query->where('taxonomy', $taxonomy);
    }

    public function scopeSearch($query, $search)
    {
        return $query->where(function ($q) use ($search) {
            $q->where('title', 'like', "%{$search}%")
              ->orWhere('slug', 'like', "%{$search}%");
        });
    }
}