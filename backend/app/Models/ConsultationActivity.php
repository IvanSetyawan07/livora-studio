<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ConsultationActivity extends Model
{
    protected $fillable = [
        'consultation_id', 'audience', 'type', 'title', 'body', 'data',
        'actor_id', 'user_read_at', 'admin_read_at',
    ];

    protected $casts = [
        'data' => 'array',
        'user_read_at' => 'datetime',
        'admin_read_at' => 'datetime',
    ];

    public function consultation()
    {
        return $this->belongsTo(Consultation::class);
    }

    public function actor()
    {
        return $this->belongsTo(User::class, 'actor_id');
    }
}