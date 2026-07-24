<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MarketingCampaign extends Model
{
    protected $fillable = [
        'campaign_name', 'subject', 'section_label', 'headline', 'body',
        'hero_image', 'hero_image_alt', 'cta_label', 'cta_url', 'signature',
        'target', 'user_ids', 'segment', 'status', 'scheduled_at', 'sent_at', 'sent_count',
    ];

    protected $casts = [
        'user_ids' => 'array',
        'scheduled_at' => 'datetime',
        'sent_at' => 'datetime',
    ];
}