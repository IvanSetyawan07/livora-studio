<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SupportSession extends Model
{
    use HasFactory;

    public const STATUS_BOT        = 'bot';
    public const STATUS_PENDING_CS = 'pending_cs';
    public const STATUS_ACTIVE     = 'active';
    public const STATUS_CLOSED     = 'closed';

    protected $fillable = [
        'visitor_id', 'user_id', 'name', 'email', 'ip_address', 'visitor_number', 'status', 'admin_id',
        'request_reason', 'requested_at', 'accepted_at', 'closed_at',
        'last_message_at', 'unread_admin', 'unread_user',
    ];

    protected $casts = [
        'requested_at'    => 'datetime',
        'accepted_at'     => 'datetime',
        'closed_at'       => 'datetime',
        'last_message_at' => 'datetime',
    ];

    public function messages()
    {
        return $this->hasMany(SupportMessage::class)->orderBy('id');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function admin()
    {
        return $this->belongsTo(User::class, 'admin_id');
    }
}
