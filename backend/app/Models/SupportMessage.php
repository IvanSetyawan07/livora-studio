<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SupportMessage extends Model
{
    use HasFactory;

    protected $fillable = [
        'support_session_id', 'sender', 'admin_id', 'text', 'meta',
    ];

    protected $casts = [
        'meta' => 'array',
    ];

    public function session()
    {
        return $this->belongsTo(SupportSession::class, 'support_session_id');
    }
}
