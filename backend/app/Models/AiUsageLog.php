<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AiUsageLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'agent_key', 'provider', 'model', 'input_tokens', 'output_tokens',
        'duration_ms', 'cost', 'status', 'error_message', 'user_id',
    ];

    protected $casts = [
        'cost' => 'decimal:4',
        'input_tokens' => 'integer',
        'output_tokens' => 'integer',
    ];

    public function agent()
    {
        return $this->belongsTo(AiAgent::class, 'agent_key', 'key');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}