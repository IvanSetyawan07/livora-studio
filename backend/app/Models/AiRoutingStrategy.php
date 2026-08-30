<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AiRoutingStrategy extends Model
{
    use HasFactory;

    protected $fillable = [
        'name', 'automatic', 'quality', 'speed', 'cost_efficiency',
        'task_routing', 'is_active',
    ];

    protected $casts = [
        'automatic' => 'boolean',
        'is_active' => 'boolean',
        'task_routing' => 'array',
    ];

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}